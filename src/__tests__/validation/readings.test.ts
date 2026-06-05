import { describe, expect, it } from 'vitest';

import { DEFAULT_READING_GROUP_ID } from '../../types/localDb.js';
import {
  readingGroupAssignSchema,
  readingGroupCreateSchema,
  readingGroupTitleSchema,
} from '../../validation/readings.js';

describe('readingGroupTitleSchema', () => {
  it('accepts a non-empty title up to 120 characters', () => {
    expect(readingGroupTitleSchema.parse('Daily draws')).toBe('Daily draws');
    expect(readingGroupTitleSchema.parse('x'.repeat(120))).toBe('x'.repeat(120));
  });

  it('trims surrounding whitespace', () => {
    expect(readingGroupTitleSchema.parse('  Moon readings  ')).toBe('Moon readings');
  });

  it('rejects empty or whitespace-only titles', () => {
    expect(() => readingGroupTitleSchema.parse('')).toThrow();
    expect(() => readingGroupTitleSchema.parse('   ')).toThrow();
  });

  it('rejects titles longer than 120 characters', () => {
    expect(() => readingGroupTitleSchema.parse('x'.repeat(121))).toThrow();
  });
});

describe('readingGroupCreateSchema', () => {
  it('accepts a valid title payload', () => {
    expect(readingGroupCreateSchema.parse({ title: 'New group' })).toEqual({
      title: 'New group',
    });
  });

  it('rejects invalid titles', () => {
    expect(() => readingGroupCreateSchema.parse({ title: '' })).toThrow();
  });
});

describe('readingGroupAssignSchema', () => {
  it('accepts the default reading group id', () => {
    expect(readingGroupAssignSchema.parse({ groupId: DEFAULT_READING_GROUP_ID })).toEqual({
      groupId: DEFAULT_READING_GROUP_ID,
    });
  });

  it('accepts a valid UUID group id', () => {
    const groupId = 'a0000000-0000-4000-8000-000000000001';
    expect(readingGroupAssignSchema.parse({ groupId })).toEqual({ groupId });
  });

  it('rejects empty group ids', () => {
    expect(() => readingGroupAssignSchema.parse({ groupId: '' })).toThrow();
  });

  it('rejects non-UUID group ids that are not the default', () => {
    expect(() => readingGroupAssignSchema.parse({ groupId: 'custom-group' })).toThrow(/Invalid group id/);
    expect(() => readingGroupAssignSchema.parse({ groupId: 'not-a-uuid' })).toThrow(/Invalid group id/);
  });
});
