import { describe, expect, it } from 'vitest';

import { DEFAULT_CORRESPONDENCE_GROUP_ID } from '../../types/localDb.js';
import {
  correspondenceDescriptionSchema,
  correspondenceGroupCreateSchema,
  correspondenceGroupTitleSchema,
  correspondenceTitleSchema,
  correspondenceUpsertSchema,
} from '../../validation/correspondences.js';

describe('correspondenceGroupTitleSchema', () => {
  it('accepts a non-empty title up to 120 characters', () => {
    expect(correspondenceGroupTitleSchema.parse('Planets')).toBe('Planets');
    expect(correspondenceGroupTitleSchema.parse('x'.repeat(120))).toBe('x'.repeat(120));
  });

  it('trims surrounding whitespace', () => {
    expect(correspondenceGroupTitleSchema.parse('  Elements  ')).toBe('Elements');
  });

  it('rejects empty or whitespace-only titles', () => {
    expect(() => correspondenceGroupTitleSchema.parse('')).toThrow();
    expect(() => correspondenceGroupTitleSchema.parse('   ')).toThrow();
  });

  it('rejects titles longer than 120 characters', () => {
    expect(() => correspondenceGroupTitleSchema.parse('x'.repeat(121))).toThrow();
  });
});

describe('correspondenceTitleSchema', () => {
  it('accepts a non-empty title up to 200 characters', () => {
    expect(correspondenceTitleSchema.parse('The Sun')).toBe('The Sun');
    expect(correspondenceTitleSchema.parse('x'.repeat(200))).toBe('x'.repeat(200));
  });

  it('trims surrounding whitespace', () => {
    expect(correspondenceTitleSchema.parse('  Mercury  ')).toBe('Mercury');
  });

  it('rejects empty or whitespace-only titles', () => {
    expect(() => correspondenceTitleSchema.parse('')).toThrow();
    expect(() => correspondenceTitleSchema.parse('   ')).toThrow();
  });

  it('rejects titles longer than 200 characters', () => {
    expect(() => correspondenceTitleSchema.parse('x'.repeat(201))).toThrow();
  });
});

describe('correspondenceDescriptionSchema', () => {
  it('accepts undefined and omits the field', () => {
    expect(correspondenceDescriptionSchema.parse(undefined)).toBeUndefined();
  });

  it('coerces empty or whitespace-only strings to undefined', () => {
    expect(correspondenceDescriptionSchema.parse('')).toBeUndefined();
    expect(correspondenceDescriptionSchema.parse('   ')).toBeUndefined();
  });

  it('accepts a trimmed description up to 8000 characters', () => {
    expect(correspondenceDescriptionSchema.parse('  Notes here  ')).toBe('Notes here');
    expect(correspondenceDescriptionSchema.parse('x'.repeat(8000))).toBe('x'.repeat(8000));
  });

  it('rejects descriptions longer than 8000 characters', () => {
    expect(() => correspondenceDescriptionSchema.parse('x'.repeat(8001))).toThrow();
  });
});

describe('correspondenceGroupCreateSchema', () => {
  it('accepts a valid title payload', () => {
    expect(correspondenceGroupCreateSchema.parse({ title: 'New group' })).toEqual({
      title: 'New group',
    });
  });

  it('rejects invalid titles', () => {
    expect(() => correspondenceGroupCreateSchema.parse({ title: '' })).toThrow();
  });
});

describe('correspondenceUpsertSchema', () => {
  const validUuid = 'a0000000-0000-4000-8000-000000000001';

  it('accepts a full payload with the default group id', () => {
    expect(
      correspondenceUpsertSchema.parse({
        title: 'Fire',
        description: 'Warmth and action',
        groupId: DEFAULT_CORRESPONDENCE_GROUP_ID,
      }),
    ).toEqual({
      title: 'Fire',
      description: 'Warmth and action',
      groupId: DEFAULT_CORRESPONDENCE_GROUP_ID,
    });
  });

  it('accepts a valid UUID group id and coerces empty description to undefined', () => {
    expect(
      correspondenceUpsertSchema.parse({
        title: 'Water',
        description: '',
        groupId: validUuid,
      }),
    ).toEqual({
      title: 'Water',
      description: undefined,
      groupId: validUuid,
    });
  });

  it('accepts omitted description', () => {
    expect(
      correspondenceUpsertSchema.parse({
        title: 'Air',
        groupId: validUuid,
      }),
    ).toEqual({
      title: 'Air',
      description: undefined,
      groupId: validUuid,
    });
  });

  it('rejects invalid titles', () => {
    expect(() =>
      correspondenceUpsertSchema.parse({
        title: '',
        groupId: validUuid,
      }),
    ).toThrow();
  });

  it('rejects empty group ids', () => {
    expect(() =>
      correspondenceUpsertSchema.parse({
        title: 'Earth',
        groupId: '',
      }),
    ).toThrow();
  });

  it('rejects non-UUID group ids that are not the default', () => {
    expect(() =>
      correspondenceUpsertSchema.parse({
        title: 'Earth',
        groupId: 'custom-group',
      }),
    ).toThrow(/Invalid group id/);
    expect(() =>
      correspondenceUpsertSchema.parse({
        title: 'Earth',
        groupId: 'not-a-uuid',
      }),
    ).toThrow(/Invalid group id/);
  });

  it('rejects descriptions longer than 8000 characters', () => {
    expect(() =>
      correspondenceUpsertSchema.parse({
        title: 'Earth',
        description: 'x'.repeat(8001),
        groupId: validUuid,
      }),
    ).toThrow();
  });
});
