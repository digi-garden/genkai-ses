/**
 * 称号（docs/design/05_data_design.md 4.3、要件 3.5）。閾値は balance.ts の値を説明文に入れる。
 */
import { balance } from './balance';
import type { Text } from './types';

export type AchievementId = 'white_company' | 'bicycle' | 'emperor' | 'phoenix' | 'audit_regular' | 'speed_quit';

export interface AchievementDef {
  id: AchievementId;
  name: Text;
  description: Text;
  priority: number;
}

export const achievements: readonly AchievementDef[] = [
  {
    id: 'white_company', priority: 1,
    name: { web: 'ホワイト企業の鑑' },
    description: { web: `第14週以降、コンプラを一度も${balance.whiteCompanyMinLegal}未満にせずに1期完走する` },
  },
  {
    id: 'bicycle', priority: 2,
    name: { web: '自転車操業マスター' },
    description: { web: `第14週以降、資金を一度も${balance.bicycleMaxCash}より上げずに1期完走する` },
  },
  {
    id: 'emperor', priority: 3,
    name: { web: '人月搾取の帝王' },
    description: { web: '最終売上1億円以上で1期完走する' },
  },
  {
    id: 'phoenix', priority: 4,
    name: { web: '不死鳥社長' },
    description: { web: '社長の切り札を使って、1期完走する' },
  },
  {
    id: 'audit_regular', priority: 5,
    name: { web: '監査局の常連' },
    description: { web: `第${balance.earlyDeathMaxWeek}週までに、コンプラ0で倒産する` },
  },
  {
    id: 'speed_quit', priority: 6,
    name: { web: 'スピード退職' },
    description: { web: `第${balance.earlyDeathMaxWeek}週までに、現場メンタル0で倒産する` },
  },
];

export const achievementById = new Map(achievements.map((a) => [a.id, a]));
