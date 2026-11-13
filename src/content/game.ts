import { buildContent, type Content } from './index';
import { balance } from './balance';
import { cards } from './cards';
import { styles } from './styles';

/** アプリで使うコンテンツ一式 */
export const gameContent: Content = buildContent(cards, styles, balance);
