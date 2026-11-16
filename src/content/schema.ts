/**
 * カード JSON の zod スキーマ（docs/design/05_data_design.md 3.3）
 * JSON の検証と、カードの型の生成を兼ねる。
 */
import { z } from 'zod';
import { FIXED_WEEKS, SPEAKER_ICONS, STYLE_IDS } from './types';

export const CardId = z.string().regex(/^[a-z0-9_]{1,40}$/, 'ID は英小文字・数字・アンダースコアの1〜40文字');

const effectValue = z.number().int().min(-100).max(100).default(0);

/** 書かなかった項目は 0 で補い、4つ以外のキー（書き間違い）はエラーにする */
export const EffectsSchema = z.strictObject({
  cash: effectValue,
  client: effectValue,
  dev: effectValue,
  legal: effectValue,
});

const delayValue = z.number().int().min(1).max(20);

export const ChoiceSchema = z
  .strictObject({
    text: z.string().min(1).max(20),
    text_store_safe: z.string().min(1).max(20).optional(),
    effects: EffectsSchema,
    unethical: z.boolean().optional(),
    inject_card_id: CardId.optional(),
    inject_delay: z
      .tuple([delayValue, delayValue])
      .refine(([min, max]) => min <= max, 'inject_delay は [min, max] で min ≦ max')
      .optional(),
    regret_text: z.string().min(1).max(30).optional(),
    regret_text_store_safe: z.string().min(1).max(30).optional(),
  })
  // V4b：連鎖を予約する選択肢には、敗因の文言が必要
  .refine((c) => c.inject_card_id === undefined || c.regret_text !== undefined, {
    message: 'inject_card_id がある選択肢には regret_text が必要（V4b）',
    path: ['regret_text'],
  })
  // V4：違法・不正な選択肢には、代償の連鎖と敗因が必要（要件 3.6-3）
  .refine((c) => c.unethical !== true || (c.inject_card_id !== undefined && c.regret_text !== undefined), {
    message: 'unethical な選択肢には inject_card_id と regret_text が必要（V4）',
    path: ['inject_card_id'],
  });

export const CardSchema = z
  .strictObject({
    id: CardId,
    kind: z.enum(['normal', 'chain', 'fixed', 'tutorial']),
    style_only: z.enum(STYLE_IDS).optional(),
    opening: z.boolean().optional(),
    fixed_week: z
      .number()
      .int()
      .refine((w) => (FIXED_WEEKS as readonly number[]).includes(w), 'fixed_week は 13 / 26 / 39 / 52')
      .optional(),
    tutorial_week: z.union([z.literal(1), z.literal(2)]).optional(),
    speaker_name: z.string().min(1).max(16),
    speaker_icon: z.enum(SPEAKER_ICONS),
    message: z.string().min(1).max(100),
    message_store_safe: z.string().min(1).max(100).optional(),
    choice_left: ChoiceSchema,
    choice_right: ChoiceSchema,
  })
  .superRefine((c, ctx) => {
    const issue = (message: string, path: string) => ctx.addIssue({ code: 'custom', message, path: [path] });
    if (c.kind !== 'normal' && c.style_only !== undefined) issue('style_only は normal のカードだけ', 'style_only');
    if (c.kind !== 'normal' && c.opening !== undefined) issue('opening は normal のカードだけ', 'opening');
    if ((c.kind === 'fixed') !== (c.fixed_week !== undefined))
      issue('fixed_week は fixed のカードに必須で、それ以外には書かない', 'fixed_week');
    if ((c.kind === 'tutorial') !== (c.tutorial_week !== undefined))
      issue('tutorial_week は tutorial のカードに必須で、それ以外には書かない', 'tutorial_week');
  });

export const CardFileSchema = z.array(CardSchema);

/** JSON に書く形（効果値の省略あり） */
export type EventCardInput = z.input<typeof CardSchema>;
/** 読み込み後の形（効果値は4つすべて埋まっている） */
export type EventCard = z.output<typeof CardSchema>;
export type Choice = z.output<typeof ChoiceSchema>;
export type CardKind = EventCard['kind'];
