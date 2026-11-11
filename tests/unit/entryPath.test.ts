import { describe, expect, it } from 'vitest';
import { normalizeEntryPath } from '../../src/app/entryPath';

describe('normalizeEntryPath', () => {
  const base = '/genkai-ses/';

  it('トップならそのまま', () => {
    expect(normalizeEntryPath('/genkai-ses/', base)).toBeNull();
  });

  it('SPA に届いた結末ページや存在しないパスはトップへ', () => {
    expect(normalizeEntryPath('/genkai-ses/results/unknown', base)).toBe(base);
    expect(normalizeEntryPath('/genkai-ses/foo/bar', base)).toBe(base);
    expect(normalizeEntryPath('/genkai-ses/index.html', base)).toBe(base);
  });

  it('プレビュー（base が /）でも同じ', () => {
    expect(normalizeEntryPath('/', '/')).toBeNull();
    expect(normalizeEntryPath('/unknown', '/')).toBe('/');
  });
});
