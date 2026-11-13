/** 売上（万円）の表示：4,800万／1億2,300万 */
export function formatSales(man: number): string {
  const n = Math.max(0, Math.round(man));
  const oku = Math.floor(n / 10000);
  const rest = n % 10000;
  if (oku === 0) return `${rest.toLocaleString('ja-JP')}万`;
  return rest === 0 ? `${oku}億` : `${oku}億${rest.toLocaleString('ja-JP')}万`;
}
