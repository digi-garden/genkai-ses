/**
 * Phase 0 の仮のタイトル画面。
 * ひな形・公開パス・素材の配信を確かめるためのもので、Phase 1-B で S01（02 の画面設計）に置き換える。
 */
const icons = import.meta.glob<string>('../../assets/img/icon_*.webp', {
  eager: true,
  import: 'default',
});

export function TitleScreen() {
  const urls = Object.entries(icons)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, url]) => ({ name: path.split('/').pop() ?? path, url }));

  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <p className="text-sm text-text-subtle">PromptLab Games</p>
      <h1 className="text-2xl leading-snug font-bold">
        限界SES社長
        <span className="mt-1 block text-base font-normal text-text-muted">〜人月ピラミッドの頂点へ〜</span>
      </h1>
      <ul className="grid grid-cols-3 gap-3" aria-label="登場人物">
        {urls.map(({ name, url }) => (
          <li key={name} className="rounded border border-border bg-card p-1">
            <img src={url} alt="" width={64} height={64} className="pixelated" data-testid="speaker-icon" />
          </li>
        ))}
      </ul>
      <p className="rounded border border-accent px-3 py-2 text-sm text-accent">準備中（Phase 0 のひな形）</p>
    </main>
  );
}
