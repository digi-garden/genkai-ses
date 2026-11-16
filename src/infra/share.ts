/**
 * シェア（docs/design/06_external_interface.md 3.1）
 */
import { xIntentUrl } from '../core/share';
import type { ShareService } from '../core/ports';

export function createShareService(win: Window): ShareService {
  return {
    openXIntent(text, url) {
      const href = xIntentUrl(text, url);
      // noopener を指定すると戻り値が常に null になり、ブロックされたか判定できない。開いた後で opener を切る
      const w = win.open(href, '_blank');
      if (w) w.opener = null;
      else win.location.href = href; // ポップアップがブロックされたら同じタブで開く
    },
  };
}
