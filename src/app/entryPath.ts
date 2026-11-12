/**
 * 起動時の URL の扱い（docs/design/01_architecture.md 6章）
 * 画面はすべて状態で持ち、URL は常に公開パスのトップにする。
 * SPA に届いた `/results/...` や存在しないパスは、トップに置き換える。
 *
 * @param pathname 現在の location.pathname
 * @param base Vite の BASE_URL（末尾スラッシュ付き。例：`/genkai-ses/`）
 * @returns 置き換えるべきパス。置き換え不要なら null
 */
export function normalizeEntryPath(pathname: string, base: string): string | null {
  if (pathname === base) return null;
  if (pathname === `${base}index.html`) return base;
  return base;
}
