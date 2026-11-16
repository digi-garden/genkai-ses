import { Modal } from '../components/Modal';

const BRAND = 'https://promptlab-games.com';

/** M03 規約・プライバシー・免責（11 の 3章：本作固有の免責と、ブランド共通のページへのリンク） */
export function TermsModal({ onClose }: { onClose: () => void }) {
  const link = 'text-primary underline underline-offset-4';
  return (
    <Modal title="規約・プライバシー・免責" onClose={onClose}>
      <div className="jp-pretty flex flex-col gap-5 text-[14px] leading-relaxed">
        <section>
          <h3 className="mb-2 font-bold">免責事項</h3>
          <p>
            このゲームはフィクションです。登場する人物・団体・会社名は架空のもので、実在のものとは関係ありません。特定の企業や個人、職業を貶める意図はありません。
          </p>
          <p className="mt-2">プレイヤーが入力した会社名は架空のものとして扱い、結果の画像やシェア文に表示されます。実在の企業名は入力できません。</p>
        </section>
        <section>
          <h3 className="mb-2 font-bold">利用規約・プライバシーポリシー</h3>
          <p>PromptLab Games 共通の規約とポリシーに従います。アクセス解析（Google アナリティクス、Cloudflare Web Analytics）の内容もこちらに記載しています。</p>
          <ul className="mt-2 flex flex-col gap-1">
            <li><a className={link} href={`${BRAND}/terms`} target="_blank" rel="noopener">利用規約</a></li>
            <li><a className={link} href={`${BRAND}/privacy`} target="_blank" rel="noopener">プライバシーポリシー</a></li>
          </ul>
        </section>
        <section>
          <h3 className="mb-2 font-bold">記録の保存</h3>
          <p>プレイの記録（図鑑、最高記録、プレイ回数）は、お使いのブラウザの中にだけ保存されます。サーバーには送信しません。ブラウザのデータを消すと記録も消えます。</p>
        </section>
      </div>
    </Modal>
  );
}
