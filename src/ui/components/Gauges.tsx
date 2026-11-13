import { Banknote, Handshake, Scale, Users, type LucideIcon } from 'lucide-react';
import type { ChoiceEffect, Param } from '../../content/types';
import type { Hint } from '../../core';

const META: Record<Param, { label: string; Icon: LucideIcon }> = {
  cash: { label: '資金', Icon: Banknote },
  client: { label: '顧客', Icon: Handshake },
  dev: { label: '現場', Icon: Users },
  legal: { label: 'コンプラ', Icon: Scale },
};
const ORDER: readonly Param[] = ['cash', 'client', 'dev', 'legal'];

function valueText(v: number): string {
  if (v <= 15) return '危険なほど低い';
  if (v < 40) return 'やや低い';
  if (v <= 60) return '普通';
  if (v < 85) return 'やや高い';
  return '危険なほど高い';
}

/** 4つのゲージ（docs/design/03_ui_design_spec.md 5.3）。数値は出さない */
export function Gauges({ params, hints }: { params: ChoiceEffect; hints?: Record<Param, Hint> | undefined }) {
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="会社の状態">
      {ORDER.map((p) => {
        const v = params[p];
        const danger = v <= 15 || v >= 85;
        const { label, Icon } = META[p];
        const hint = hints?.[p] ?? 'none';
        return (
          <div key={p} className="flex flex-col items-center gap-1">
            <div className="relative h-3 w-full">
              {hint !== 'none' && (
                <span
                  aria-hidden
                  data-testid={`hint-${p}`}
                  data-size={hint}
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text transition-opacity duration-100 ${hint === 'large' ? 'h-2.5 w-2.5' : 'h-1.5 w-1.5'}`}
                />
              )}
            </div>
            <div
              role="meter"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={v}
              aria-valuetext={valueText(v)}
              className={`relative h-11 w-11 overflow-hidden rounded-[10px] border-2 bg-surface ${danger ? 'gauge-danger border-danger' : 'border-border'}`}
            >
              <div
                className={`absolute inset-x-0 bottom-0 transition-[height] duration-300 ease-out ${danger ? 'bg-danger/70' : 'bg-primary/45'}`}
                style={{ height: `${v}%` }}
              />
              <Icon className="relative m-auto h-full w-5 text-text" aria-hidden strokeWidth={2} />
            </div>
            <span className={`text-[13px] leading-tight ${danger ? 'text-danger-text' : 'text-text-muted'}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
