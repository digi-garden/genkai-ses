import { useState, type FormEvent } from 'react';
import { checkCompanyName, COMPANY_NAME_MAX, DEFAULT_COMPANY_NAME, type CompanyNameError } from '../../core/companyName';
import { Button } from '../components/Button';

const MESSAGE: Record<CompanyNameError, string> = {
  ng_name: '実在の企業名は使えません',
  symbol: '記号（@ # ）や URL は使えません',
  too_long: `${COMPANY_NAME_MAX}文字以内で入力してください`,
};

/** S02 会社名入力 */
export function NameScreen({ initial, onNext }: { initial: string; onNext: (name: string) => void }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<CompanyNameError | undefined>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = checkCompanyName(value);
    setError(r.error);
    if (!r.error) onNext(r.name);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-6 px-4 py-10">
      <h1 className="text-[20px] font-bold">あなたの会社名を決めてください</h1>
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <label htmlFor="company" className="text-[13px] font-bold">
          会社名（{COMPANY_NAME_MAX}文字まで）
        </label>
        <input
          id="company"
          value={value}
          maxLength={COMPANY_NAME_MAX}
          placeholder={DEFAULT_COMPANY_NAME}
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error !== undefined}
          aria-describedby="company-note company-error"
          className="min-h-12 rounded-md border border-border-strong bg-card px-3 text-[17px] text-text placeholder:text-text-subtle"
        />
        {error && (
          <p id="company-error" className="text-[13px] text-danger-text" role="alert">
            {MESSAGE[error]}
          </p>
        )}
        <p id="company-note" className="text-[12px] text-text-subtle">
          実在の企業名は使えません。会社名は架空のものとして結果画像に印字されます。空のままなら「{DEFAULT_COMPANY_NAME}」になります。
        </p>
        <Button type="submit" className="mt-3">
          次へ
        </Button>
      </form>
    </main>
  );
}
