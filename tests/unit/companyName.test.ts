import { describe, expect, it } from 'vitest';
import { checkCompanyName, DEFAULT_COMPANY_NAME } from '../../src/core/companyName';

describe('checkCompanyName', () => {
  it('空なら既定の名前', () => expect(checkCompanyName('  ')).toEqual({ name: DEFAULT_COMPANY_NAME }));
  it.each(['NTTデータ', '株式会社ＮＴＴデータ', 'ﾔﾌｰ', 'google', 'グーグル合同会社'])('%s は NG', (n) =>
    expect(checkCompanyName(n).error).toBe('ng_name'),
  );
  it('英字の名前は単語の一部では NG にしない', () => expect(checkCompanyName('Metaverse工業').error).toBeUndefined());
  it.each(['@genkai', '#限界', 'https://x.com', 'genkai.jp'])('%s は記号・URL', (n) => expect(checkCompanyName(n).error).toBe('symbol'));
  it('16文字以上は長すぎる', () => expect(checkCompanyName('あ'.repeat(16)).error).toBe('too_long'));
  it('普通の名前は通る', () => expect(checkCompanyName('ブラック工業').error).toBeUndefined());
});
