import { z } from 'zod';

export const passwordLoginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const magicLinkEmailSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

export const passwordResetSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
export type MagicLinkEmailInput = z.infer<typeof magicLinkEmailSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
