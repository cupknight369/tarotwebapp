import { z } from 'zod';

import { DEFAULT_READING_GROUP_ID } from '../types/localDb.js';

/** User-visible reading group name. */
export const readingGroupTitleSchema = z.string().trim().min(1).max(120);

export const readingGroupCreateSchema = z.object({
  title: readingGroupTitleSchema,
});

const groupIdSchema = z
  .string()
  .min(1)
  .refine(
    (id) => id === DEFAULT_READING_GROUP_ID || z.string().uuid().safeParse(id).success,
    'Invalid group id',
  );

export const readingGroupAssignSchema = z.object({
  groupId: groupIdSchema,
});
