import type { StyleDef, StyleId } from './types';

/**
 * 経営スタイル（要件 3.3、docs/design/04_game_logic.md 7.2）。数値は暫定値で、最終値はシミュレータで決める。
 * 表記は 3.6-8 に従い、露骨な違法用語を避ける。
 */
export const AUDIT_CHAIN_CARD_ID = 'c_audit_visit';

export const styles: Record<StyleId, StyleDef> = {
  taiikukai: {
    id: 'taiikukai',
    name: { web: '体育会系SES' },
    description: { web: '気合いで現場を回す。メンタルは減りにくいが、コンプラの傷は深い。' },
    passives: [
      { param: 'dev', direction: 'loss', factor: 0.8 },
      { param: 'legal', direction: 'loss', factor: 1.3 },
    ],
    trump: {
      name: { web: '精神論チャージ' },
      effects: { cash: 0, client: 0, dev: 40, legal: -20 },
    },
  },
  gray_broker: {
    id: 'gray_broker',
    name: { web: 'グレー派遣ブローカー' },
    description: { web: '商流の深さで稼ぐ。お金は入りやすいが、コンプラの傷は深い。' },
    passives: [
      { param: 'cash', direction: 'gain', factor: 1.3 },
      { param: 'legal', direction: 'loss', factor: 1.2 },
    ],
    trump: {
      name: { web: '多重商流ブースト' },
      effects: { cash: 50, client: 0, dev: 0, legal: -25 },
      inject: {
        cardId: AUDIT_CHAIN_CARD_ID,
        delay: [3, 8],
        regretText: { web: '多重商流ブーストに手を出した' },
      },
    },
  },
  tech_first: {
    id: 'tech_first',
    name: { web: '技術至上主義SES' },
    description: { web: '技術で客を黙らせる。メンタルは減りにくいが、お金は入りにくい。' },
    passives: [
      { param: 'dev', direction: 'loss', factor: 0.7 },
      { param: 'cash', direction: 'gain', factor: 0.8 },
    ],
    trump: {
      name: { web: '超絶リファクタリング' },
      effects: { cash: -25, client: 20, dev: 30, legal: 0 },
    },
  },
};
