import type { Balance } from './types';

/** 調整用の定数（docs/design/04_game_logic.md 8.3、要件 3.1-5・3.5）。最終値はシミュレータで決める */
export const balance: Balance = {
  initialParam: 50,
  salesPerWeek: 100,
  salesPerCash: 25,
  defaultInjectDelay: [2, 6],
  regretWindow: 2,
  extremesFromWeek: 14,
  whiteCompanyMinLegal: 58,
  bicycleMaxCash: 40,
  emperorMinSales: 10000,
  earlyDeathMaxWeek: 9,
};
