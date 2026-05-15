import { z } from 'zod';

import { DEFAULT_CORRESPONDENCE_GROUP_ID } from '../types/localDb.js';

/** User-visible correspondence group name. */
export const correspondenceGroupTitleSchema = z.string().trim().min(1).max(120);

/** Correspondence title. */
export const correspondenceTitleSchema = z.string().trim().min(1).max(200);

/** Optional correspondence description (empty string coerced to undefined). */
export const correspondenceDescriptionSchema = z
  .string()
  .trim()
  .max(8000)
  .optional()
  .transform((s) => (s === '' ? undefined : s));

export const correspondenceGroupCreateSchema = z.object({
  title: correspondenceGroupTitleSchema,
});

const groupIdSchema = z
  .string()
  .min(1)
  .refine(
    (id) => id === DEFAULT_CORRESPONDENCE_GROUP_ID || z.string().uuid().safeParse(id).success,
    'Invalid group id',
  );

export const correspondenceUpsertSchema = z.object({
  title: correspondenceTitleSchema,
  description: correspondenceDescriptionSchema,
  groupId: groupIdSchema,
});
