/**
 * 会社名のチェック（要件 7.2-1、docs/design/02_screen_design.md S02）
 */
import { NG_COMPANY_NAMES } from '../content/ng_company_names';

export const COMPANY_NAME_MAX = 15;
export const DEFAULT_COMPANY_NAME = '限界SES株式会社';

/** 照合のための正規化：NFKC、小文字、空白・中黒・記号の除去 */
export function normalizeForMatch(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s・･\-‐_.()（）]/g, '');
}

/** 法人格の表記を取り除く（「株式会社〇〇」「〇〇(株)」も同じ名前として照合するため） */
function stripCorporateForm(s: string): string {
  return s.replace(/株式会社|有限会社|合同会社|\(株\)|㈱|inc|corp|co\.?ltd|ltd/g, '');
}

export type CompanyNameError = 'ng_name' | 'symbol' | 'too_long';

export function checkCompanyName(input: string): { name: string; error?: CompanyNameError } {
  const name = input.trim() === '' ? DEFAULT_COMPANY_NAME : input.trim();
  if ([...name].length > COMPANY_NAME_MAX) return { name, error: 'too_long' };
  if (/[@#＠＃]|https?:|www\.|\.(com|jp|net|org)\b/i.test(name)) return { name, error: 'symbol' };
  const n = stripCorporateForm(normalizeForMatch(name));
  for (const ng of NG_COMPANY_NAMES) {
    const m = normalizeForMatch(ng);
    if (/^[a-z0-9]+$/.test(m) ? new RegExp(`(^|[^a-z])${m}($|[^a-z])`).test(n) : n.includes(m)) return { name, error: 'ng_name' };
  }
  return { name };
}
