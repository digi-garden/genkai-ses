/**
 * GA4 と Cloudflare Web Analytics（docs/design/06_external_interface.md 2章）
 * - 測定 ID が未設定（プレビュー・開発時）なら読み込まず、イベントをコンソールに出す
 * - 同意が必要な地域では、同意されるまで読み込まない（送るはずのイベントは捨てる）
 * - インラインのスクリプトは使わない（CSP。08 の 5.1）
 */
import type { AnalyticsPort, ConsentRepository } from '../core/ports';
import { openStorage } from './storage';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const CONSENT_KEY = 'genkai_ses_consent_v1';

export function createConsentRepository(get: () => Storage, required: boolean): ConsentRepository {
  const { kv } = openStorage(get);
  return {
    required,
    get() {
      try {
        const v = kv.getItem(CONSENT_KEY);
        return v === 'granted' || v === 'denied' ? v : null;
      } catch {
        return null;
      }
    },
    set(choice) {
      try {
        kv.setItem(CONSENT_KEY, choice);
      } catch {
        /* 保存できなくても、このページ表示の間は選択に従う */
      }
    },
  };
}

export interface AnalyticsController extends AnalyticsPort {
  /** 同意が得られたとき（または同意が不要なとき）に呼ぶ */
  enable(): void;
}

/** GA4 に送るのは本番のホストだけ（2026-11-19）。ステージングとプレビューは同じビルドを配信するので、ホスト名で分ける */
export const GA_PRODUCTION_HOST = 'promptlab-games.com';

/** 本番のホストなら測定 ID を返し、それ以外は undefined（コンソールに出すだけになる） */
export function measurementIdForHost(id: string | undefined, hostname: string): string | undefined {
  return id && hostname === GA_PRODUCTION_HOST ? id : undefined;
}

export function createAnalytics(opts: { measurementId: string | undefined; doc: Document; win: Window }): AnalyticsController {
  const { measurementId, doc, win } = opts;
  let loaded = false;

  const load = () => {
    if (loaded || !measurementId) return;
    loaded = true;
    win.dataLayer = win.dataLayer ?? [];
    // gtag.js が読み込む前のキュー（公式のスニペットと同じ動き。インラインにしないため、ここで定義する）
    win.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params -- gtag.js は arguments オブジェクトを期待する
      win.dataLayer?.push(arguments);
    };
    win.gtag('js', new Date());
    win.gtag('config', measurementId);
    const s = doc.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    s.onerror = () => {
      /* 広告ブロッカーなど。何もしない */
    };
    doc.head.appendChild(s);
  };

  return {
    enable: load,
    send(name, params, o) {
      if (!measurementId) {
        console.info('[analytics]', name, params);
        return;
      }
      if (!loaded || !win.gtag) return;
      win.gtag('event', name, o?.beacon ? { ...params, transport_type: 'beacon' } : params);
    },
  };
}

/**
 * Cloudflare Web Analytics のビーコン（06 の 2.3）。ブランド共通の自動挿入が効いていれば何もしない（二重計測の防止）。
 */
export function ensureCfBeacon(token: string | undefined, doc: Document): void {
  if (!token) return;
  if (doc.querySelector('script[src*="static.cloudflareinsights.com"]')) return;
  const s = doc.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({ token }));
  doc.head.appendChild(s);
}
