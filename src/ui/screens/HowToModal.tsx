import { Banknote, Handshake, Scale, Users } from 'lucide-react';
import { Modal } from '../components/Modal';

/** M02 遊び方 */
export function HowToModal({ onClose }: { onClose: () => void }) {
  const row = 'flex items-start gap-3';
  return (
    <Modal title="遊び方" onClose={onClose}>
      <div className="jp-pretty flex flex-col gap-5 text-[14px] leading-relaxed">
        <section>
          <h3 className="mb-2 font-bold">4つのゲージ</h3>
          <ul className="flex flex-col gap-2">
            <li className={row}><Banknote className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />資金：会社のお金</li>
            <li className={row}><Handshake className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />顧客：元請け・客先の満足度</li>
            <li className={row}><Users className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />現場：エンジニアのメンタル</li>
            <li className={row}><Scale className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />コンプラ：法令や契約を守れているか</li>
          </ul>
          <p className="mt-2">
            どれか1つでも<strong>空（0）になっても、満タン（100）になっても倒産</strong>します。お金を貯めすぎても、客に尽くしすぎても終わりです。
          </p>
        </section>
        <section>
          <h3 className="mb-2 font-bold">1週に1枚、2択で決める</h3>
          <p>
            カードを左右にスワイプするか、下のボタンを押して選びます。PC では ← / → キーでも選べます。52週（1期）を生き延びればクリアです。
          </p>
        </section>
        <section>
          <h3 className="mb-2 font-bold">予兆ドット</h3>
          <p>
            選択肢を選ぼうとすると、動くゲージの上に白い点が出ます。小さい点は少し、大きい点は大きく動くしるしです。<strong>増えるか減るかは、選ぶまで分かりません。</strong>選んだ直後に、増減が矢印で表示されます。
          </p>
        </section>
        <section>
          <h3 className="mb-2 font-bold">社長の切り札</h3>
          <p>経営スタイルごとに1つ、1期に1度だけ使える奥の手です。2回押すと発動します。発動しても週は進みません。切り札だけで倒産することはありません（ゲージは限界の1歩手前で止まります）。ただし、その後の選択しだいでは危ないので注意。</p>
        </section>
        <section>
          <h3 className="mb-2 font-bold">因果応報</h3>
          <p>
            グレーな選択をすると、数週後にそのツケが【因果応報】のカードとして回ってきます。そのカードのせいで倒産すると、リザルトに「敗因」として表示されます。
          </p>
        </section>
      </div>
    </Modal>
  );
}
