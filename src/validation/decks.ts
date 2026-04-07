import { z } from 'zod';

const TITLE_MAX = 200;
const CARD_TITLE_MAX = 500;
const CARD_NUMBER_MAX = 99999;

export const localDeckTitleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`);

export const deckCardTitleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(CARD_TITLE_MAX, `Title must be at most ${CARD_TITLE_MAX} characters`);

export const deckCardNumberSchema = z.coerce
  .number({ invalid_type_error: 'Number is required' })
  .int('Number must be a whole number')
  .min(0, 'Number must be at least 0')
  .max(CARD_NUMBER_MAX, `Number must be at most ${CARD_NUMBER_MAX}`);

const imageFileSchema = z.custom<File>(
  (f) =>
    f instanceof File && f.size > 0 && typeof f.type === 'string' && f.type.startsWith('image/'),
  { message: 'Choose a valid image file' },
);

const optionalImageFileSchema = z
  .custom<File | null | undefined>((f) => f == null || f instanceof File)
  .refine(
    (f) => !f || f.size === 0 || (typeof f.type === 'string' && f.type.startsWith('image/')),
    { message: 'Censor image must be an image file' },
  );

export const addLocalCardFormSchema = z.object({
  title: deckCardTitleSchema,
  number: deckCardNumberSchema,
  mainFile: imageFileSchema,
  censorFile: optionalImageFileSchema.optional(),
});

export const saveLocalCardFormSchema = z.object({
  title: deckCardTitleSchema,
  number: deckCardNumberSchema,
  mainFile: z
    .custom<File | null | undefined>((f) => f == null || f instanceof File)
    .refine(
      (f) => !f || f.size === 0 || (typeof f.type === 'string' && f.type.startsWith('image/')),
      { message: 'Main image must be an image file' },
    )
    .optional(),
  censorFile: optionalImageFileSchema.optional(),
});

export type AddLocalCardFormInput = z.infer<typeof addLocalCardFormSchema>;
export type SaveLocalCardFormInput = z.infer<typeof saveLocalCardFormSchema>;
