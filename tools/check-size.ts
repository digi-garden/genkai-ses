/**
 * ビルド結果の容量チェック（docs/design/08_nonfunctional_ops.md 1.2、07 の 5章）
 * 予算を超えたら GitHub Actions の警告として出す（ビルドは止めない）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist/assets';
const KB = 1024;
const budgets: { label: string; test: (f: string) => boolean; each?: number; total?: number; gzip?: boolean }[] = [
  { label: '最初に読む JS（gzip）', test: (f) => /^index-.*\.js$/.test(f), total: 150 * KB, gzip: true },
  { label: 'CSS（gzip）', test: (f) => f.endsWith('.css'), total: 20 * KB, gzip: true },
  { label: '話者アイコン（1枚）', test: (f) => f.startsWith('icon_') && f.endsWith('.webp'), each: 8 * KB },
  { label: '結末の一枚絵（1枚）', test: (f) => f.startsWith('end_') && f.endsWith('.webp'), each: 120 * KB },
];

const files = readdirSync(DIST);
let warned = 0;
for (const b of budgets) {
  const matched = files.filter(b.test);
  const sizes = matched.map((f) => {
    const p = join(DIST, f);
    return { f, size: b.gzip ? gzipSync(readFileSync(p)).length : statSync(p).size };
  });
  if (b.total !== undefined) {
    const sum = sizes.reduce((a, s) => a + s.size, 0);
    const ok = sum <= b.total;
    console.log(`${ok ? 'OK  ' : 'OVER'} ${b.label}: ${(sum / KB).toFixed(1)}KB / ${b.total / KB}KB`);
    if (!ok) {
      warned++;
      console.log(`::warning::${b.label} が予算を超えています（${(sum / KB).toFixed(1)}KB）`);
    }
  }
  const each = b.each;
  if (each !== undefined) {
    const max = sizes.reduce((a, s) => Math.max(a, s.size), 0);
    console.log(`${max <= each ? 'OK  ' : 'OVER'} ${b.label}: 最大 ${(max / KB).toFixed(1)}KB / ${each / KB}KB（${sizes.length}枚）`);
    for (const s of sizes.filter((s) => s.size > each)) {
      warned++;
      console.log(`::warning::${s.f} が予算を超えています（${(s.size / KB).toFixed(1)}KB）`);
    }
  }
}
if (warned) console.log(`予算超過 ${warned} 件（警告のみ）`);
