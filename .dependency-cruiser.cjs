/**
 * 層の依存ルール（docs/design/01_architecture.md の 4章）
 *   app → ui, infra, core / ui → core, content / infra → core / core → content / content → なし
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-is-pure',
      comment: 'core は content 以外に依存しない',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: '^src/(app|ui|infra)/' },
    },
    {
      name: 'core-no-react',
      comment: 'core は React や外部の UI ライブラリに依存しない',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: 'node_modules/(react|react-dom|motion|lucide-react|html-to-image)/' },
    },
    {
      name: 'content-is-data',
      comment: 'content はどの層にも依存しない',
      severity: 'error',
      from: { path: '^src/content/' },
      to: { path: '^src/(app|ui|infra|core)/' },
    },
    {
      name: 'infra-not-ui',
      comment: 'infra は ui に依存しない',
      severity: 'error',
      from: { path: '^src/infra/' },
      to: { path: '^src/(ui|app)/' },
    },
    {
      name: 'ui-via-ports',
      comment: 'ui は infra を直接 import しない（ポート経由で受け取る）',
      severity: 'error',
      from: { path: '^src/ui/' },
      to: { path: '^src/(infra|app)/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    exclude: { path: '\\.(css|webp|png|svg)$' },
  },
};
