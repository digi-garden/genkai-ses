import { useState } from 'react';
import { achievements } from '../../content/achievements';
import { endings } from '../../content/endings';
import { ENDING_IDS } from '../../content/types';
import type { SaveData } from '../../core/progress';
import { endingUrl } from '../assets';
import { Modal } from '../components/Modal';
import { formatSales } from '../format';

/** M01 図鑑：結末（n/9）と称号（n/6）、最高記録とプレイ回数 */
export function ZukanModal({ save, onClose }: { save: SaveData; onClose: () => void }) {
  const [tab, setTab] = useState<'endings' | 'achievements'>('endings');
  const nEnd = save.unlocked_endings.length;
  const nAch = save.unlocked_achievements.length;
  const tabClass = (on: boolean) => `min-h-11 flex-1 rounded-md text-[14px] font-bold ${on ? 'bg-card text-text' : 'text-text-muted'}`;

  return (
    <Modal title="図鑑" onClose={onClose}>
      <dl className="mb-4 grid grid-cols-3 gap-2 text-center text-[12px] text-text-muted">
        <div className="rounded-md border border-border p-2">
          <dt>最長の生存</dt>
          <dd className="mt-1 text-[15px] font-bold text-text">{save.high_score.max_weeks}週</dd>
        </div>
        <div className="rounded-md border border-border p-2">
          <dt>最高売上</dt>
          <dd className="mt-1 text-[15px] font-bold text-text">{formatSales(save.high_score.max_sales)}</dd>
        </div>
        <div className="rounded-md border border-border p-2">
          <dt>プレイ回数</dt>
          <dd className="mt-1 text-[15px] font-bold text-text">{save.play_count}回</dd>
        </div>
      </dl>
      <div role="tablist" aria-label="図鑑の種類" className="mb-4 flex gap-1 rounded-[10px] bg-bg p-1">
        <button type="button" role="tab" aria-selected={tab === 'endings'} className={tabClass(tab === 'endings')} onClick={() => setTab('endings')}>
          結末（{nEnd}/9）
        </button>
        <button type="button" role="tab" aria-selected={tab === 'achievements'} className={tabClass(tab === 'achievements')} onClick={() => setTab('achievements')}>
          称号（{nAch}/6）
        </button>
      </div>
      {tab === 'endings' ? (
        <ul className="grid grid-cols-3 gap-2" data-testid="zukan-endings">
          {ENDING_IDS.map((id) => {
            const open = save.unlocked_endings.includes(id);
            return (
              <li key={id} className="flex flex-col gap-1 text-center">
                {open ? (
                  <img src={endingUrl(id)} alt="" loading="lazy" className="pixelated aspect-video w-full rounded-sm" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-sm border border-border bg-black text-text-subtle">？？？</div>
                )}
                <span className={`jp-balance text-[11px] leading-tight ${open ? 'text-text' : 'text-text-subtle'}`}>{open ? endings[id].title.web : '？？？'}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="zukan-achievements">
          {achievements.map((a) => {
            const got = save.unlocked_achievements.includes(a.id);
            return (
              <li key={a.id} className={`rounded-md border p-3 ${got ? 'border-accent' : 'border-border'}`}>
                <p className={`text-[15px] font-bold ${got ? 'text-accent' : 'text-text-muted'}`}>
                  {got ? '★ ' : ''}［{a.name.web}］
                </p>
                <p className={`jp-pretty mt-1 text-[13px] ${got ? 'text-text' : 'text-text-subtle'}`}>{a.description.web}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
