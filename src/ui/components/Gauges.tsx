import { ArrowDown, ArrowUp, Banknote, ChevronsDown, ChevronsUp, Handshake, Scale, Users, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChoiceEffect, Param } from '../../content/types';
import type { Hint } from '../../core';

export const GAUGE_META: Record<Param, { label: string; Icon: LucideIcon }> = {
  cash: { label: '資金', Icon: Banknote },
  client: { label: '顧客', Icon: Handshake },
  dev: { label: '現場', Icon: Users },
  legal: { label: 'コンプラ', Icon: Scale },
};
export const GAUGE_ORDER: readonly Param[] = ['cash', 'client', 'dev', 'legal'];
const DELTA_MS = 700;

function valueText(v: number): string {
  if (v <= 15) return '危険なほど低い';
  if (v < 40) return 'やや低い';
  if (v <= 60) return '普通';
  if (v < 85) return 'やや高い';
  return '危険なほど高い';
}

function DeltaArrow({ d }: { d: number }) {
  const big = Math.abs(d) >= 10;
  const Icon = d > 0 ? (big ? ChevronsUp : ArrowUp) : big ? ChevronsDown : ArrowDown;
  return <Icon className="h-4 w-4 text-text" aria-hidden strokeWidth={3} />;
}

/**
 * 4つのゲージ（docs/design/03_ui_design_spec.md 5.3）。数値は出さない。
 * 選ぶ前は予兆ドット（大小）、選んだ直後は増減の矢印（R17）をアイコンの上に出す。
 */
export function Gauges({ params, hints }: { params: ChoiceEffect; hints?: Record<Param, Hint> | undefined }) {
  const prev = useRef(params);
  const [deltas, setDeltas] = useState<Partial<ChoiceEffect>>({});

  useEffect(() => {
    const before = prev.current;
    prev.current = params;
    const d: Partial<ChoiceEffect> = {};
    for (const p of GAUGE_ORDER) if (params[p] !== before[p]) d[p] = params[p] - before[p];
    if (Object.keys(d).length === 0) return;
    const t0 = window.setTimeout(() => setDeltas(d), 0);
    const t1 = window.setTimeout(() => setDeltas({}), DELTA_MS);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [params]);

  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="会社の状態">
      {GAUGE_ORDER.map((p) => {
        const v = params[p];
        const danger = v <= 15 || v >= 85;
        const { label, Icon } = GAUGE_META[p];
        const hint = hints?.[p] ?? 'none';
        const delta = deltas[p];
        return (
          <div key={p} className="flex flex-col items-center gap-1">
            <div className="relative flex h-4 w-full items-center justify-center">
              {delta !== undefined ? (
                <span data-testid={`delta-${p}`} data-dir={delta > 0 ? 'up' : 'down'}>
                  <DeltaArrow d={delta} />
                </span>
              ) : (
                hint !== 'none' && (
                  <span
                    aria-hidden
                    data-testid={`hint-${p}`}
                    data-size={hint}
                    className={`rounded-full bg-text ${hint === 'large' ? 'h-2.5 w-2.5' : 'h-1.5 w-1.5'}`}
                  />
                )
              )}
            </div>
            <div
              role="meter"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={v}
              aria-valuetext={valueText(v)}
              className={`relative h-11 w-11 overflow-hidden rounded-[10px] border-2 bg-surface ${danger ? 'gauge-danger border-danger' : 'border-border'}`}
            >
              <div
                className={`absolute inset-x-0 bottom-0 transition-[height] duration-300 ease-out ${danger ? 'bg-danger/70' : 'bg-primary/45'}`}
                style={{ height: `${v}%` }}
              />
              <Icon className="relative m-auto h-full w-5 text-text" aria-hidden strokeWidth={2} />
            </div>
            <span className={`text-[13px] leading-tight ${danger ? 'text-danger-text' : 'text-text-muted'}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
