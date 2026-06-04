import { z } from 'zod';

import { clampFixedWidthPx, clampLabelFontSize, labelColorSchema } from './canvasLabel.js';

const fontStyleSchema = z.enum(['normal', 'italic']);
const textDecorationSchema = z.enum(['none', 'underline']);

/** Parses and normalizes a single font profile from persisted JSON. */
export const fontProfileSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).max(200),
    fontSize: z.number(),
    fontWeight: z
      .number()
      .transform((n) => (n === 700 ? 700 : 400))
      .pipe(z.union([z.literal(400), z.literal(700)])),
    fontStyle: fontStyleSchema,
    textDecoration: textDecorationSchema,
    color: labelColorSchema,
    fixedWidth: z.boolean(),
    fixedWidthPx: z.number(),
  })
  .transform((p) => ({
    ...p,
    fontSize: clampLabelFontSize(p.fontSize),
    fixedWidthPx: clampFixedWidthPx(p.fixedWidthPx),
  }));

/** Parses persisted font profiles storage payload. */
export const fontProfilesStorageSchema = z.object({
  profiles: z.array(fontProfileSchema),
  defaultFontProfileId: z.string().min(1).nullable(),
});
