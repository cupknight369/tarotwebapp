import { describe, expect, it } from 'vitest';

import type { PostgrestError } from '@supabase/supabase-js';

import type { QueryFailure, QueryFailureKind } from '../../lib/supabaseErrors.js';
import {
  exceptionToQueryFailure,
  queryFailureMessage,
  toQueryFailure,
} from '../../lib/supabaseErrors.js';

function pgErr(overrides: Partial<PostgrestError>): PostgrestError {
  return {
    name: 'PostgrestError',
    message: 'm',
    details: '',
    hint: '',
    code: 'XX',
    ...overrides,
  } as PostgrestError;
}

describe('supabaseErrors.ts', () => {
  describe('toQueryFailure', () => {
    it('maps PGRST116 to not_found', () => {
      const err = pgErr({ code: 'PGRST116', message: 'No rows' });
      expect(toQueryFailure(err, 'op1')).toEqual({
        kind: 'not_found',
        operation: 'op1',
        message: 'No rows',
        supabaseCode: 'PGRST116',
      });
    });

    it('maps 42501 to permission', () => {
      const err = pgErr({ code: '42501', message: 'denied' });
      expect(toQueryFailure(err, 'op2')).toMatchObject({
        kind: 'permission',
        operation: 'op2',
        message: 'denied',
        supabaseCode: '42501',
      });
    });

    it('maps PGRST301 to permission', () => {
      const err = pgErr({ code: 'PGRST301', message: 'jwt' });
      expect(toQueryFailure(err, 'op3')).toMatchObject({
        kind: 'permission',
        supabaseCode: 'PGRST301',
      });
    });

    it('maps other codes to unknown', () => {
      const err = pgErr({ code: 'PGRST500', message: 'oops' });
      expect(toQueryFailure(err, 'op4')).toEqual({
        kind: 'unknown',
        operation: 'op4',
        message: 'oops',
        supabaseCode: 'PGRST500',
      });
    });
  });

  describe('queryFailureMessage', () => {
    it('returns fixed copy for not_found', () => {
      expect(
        queryFailureMessage({
          kind: 'not_found',
          operation: 'o',
          message: 'ignored',
        }),
      ).toBe('Nothing was found for that request.');
    });

    it('returns fixed copy for permission', () => {
      expect(
        queryFailureMessage({
          kind: 'permission',
          operation: 'o',
          message: 'ignored',
        }),
      ).toBe('You do not have permission to load this data.');
    });

    it('returns original unknown message when trim is non-empty (trim only gates the fallback)', () => {
      expect(
        queryFailureMessage({
          kind: 'unknown',
          operation: 'o',
          message: '  hello  ',
        }),
      ).toBe('  hello  ');
    });

    it('returns server fallback when unknown message is empty after trim', () => {
      expect(
        queryFailureMessage({
          kind: 'unknown',
          operation: 'o',
          message: '   ',
        }),
      ).toBe('Could not load data from the server.');
    });

    it('hits default switch branch for non-union kind at runtime', () => {
      const f = {
        kind: 'not_a_real_kind' as QueryFailureKind,
        operation: 'o',
        message: 'custom',
      } as QueryFailure;
      expect(queryFailureMessage(f)).toBe('custom');
    });

    it('default branch uses fallback when message is whitespace', () => {
      const f = {
        kind: 'not_a_real_kind' as QueryFailureKind,
        operation: 'o',
        message: '\t\n',
      } as QueryFailure;
      expect(queryFailureMessage(f)).toBe('Could not load data from the server.');
    });
  });

  describe('exceptionToQueryFailure', () => {
    it('uses Error message', () => {
      expect(exceptionToQueryFailure('op', new Error('boom'))).toEqual({
        kind: 'unknown',
        operation: 'op',
        message: 'boom',
      });
    });

    it('uses string throwables', () => {
      expect(exceptionToQueryFailure('op', 'plain')).toEqual({
        kind: 'unknown',
        operation: 'op',
        message: 'plain',
      });
    });

    it('uses Unexpected error for other values', () => {
      expect(exceptionToQueryFailure('op', { x: 1 })).toEqual({
        kind: 'unknown',
        operation: 'op',
        message: 'Unexpected error.',
      });
    });

    it('uses server fallback when Error message is only whitespace', () => {
      expect(exceptionToQueryFailure('op', new Error('  \n'))).toEqual({
        kind: 'unknown',
        operation: 'op',
        message: 'Could not load data from the server.',
      });
    });

    it('uses server fallback when string throwable is only whitespace', () => {
      expect(exceptionToQueryFailure('op', '   ')).toEqual({
        kind: 'unknown',
        operation: 'op',
        message: 'Could not load data from the server.',
      });
    });
  });
});
