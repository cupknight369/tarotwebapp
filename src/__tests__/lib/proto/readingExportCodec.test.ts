import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocalReadingRow } from '../../../types/localDb.js';
import { DEFAULT_READING_GROUP_ID } from '../../../types/localDb.js';
import { READING_EXPORT_VERSION } from '../../../types/settings.js';
import { cktarot } from '../../../proto/generated/bundle.js';
import { encodeSavedReadingState } from '../../../lib/proto/savedReadingCodec.js';

import {
  decodeReadingExport,
  encodeReadingExport,
  insertReadingFromProto,
} from '../../../lib/proto/readingExportCodec.js';

describe('readingExportCodec.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('round-trips readings and groups', async () => {
    const stateBytes = encodeSavedReadingState({
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      cards: [],
      textLabels: [],
    });
    const readings: LocalReadingRow[] = [
      {
        id: 'r1',
        name: 'Celtic Cross',
        state: stateBytes,
        updated_at: '2026-05-20T00:00:00.000Z',
        group_id: DEFAULT_READING_GROUP_ID,
      },
    ];
    const bytes = await encodeReadingExport({
      groups: [{ id: DEFAULT_READING_GROUP_ID, title: 'Default' }],
      readings,
      exportedAt: '2026-05-20T00:00:00.000Z',
    });
    const { export: exportMsg, errors } = decodeReadingExport(bytes);
    expect(errors).toEqual([]);
    expect(exportMsg.version).toBe(READING_EXPORT_VERSION);
    expect(exportMsg.exportedAt).toBe('2026-05-20T00:00:00.000Z');
    expect(exportMsg.readings).toHaveLength(1);
    expect(exportMsg.readings?.[0]?.name).toBe('Celtic Cross');
    expect(exportMsg.readings?.[0]?.groupId).toBe(DEFAULT_READING_GROUP_ID);
    expect(exportMsg.groups).toHaveLength(1);
    expect(exportMsg.groups?.[0]?.title).toBe('Default');
  });

  it('decodeReadingExport accepts version 1 exports', async () => {
    const msg = new cktarot.CktarotReadingExport();
    msg.version = 1;
    const bytes = new Uint8Array(cktarot.CktarotReadingExport.encode(msg).finish());
    const { errors } = decodeReadingExport(bytes);
    expect(errors).toEqual([]);
  });

  it('decodeReadingExport adds error when version mismatches', async () => {
    const msg = new cktarot.CktarotReadingExport();
    msg.version = 99;
    const bytes = new Uint8Array(cktarot.CktarotReadingExport.encode(msg).finish());
    const { errors } = decodeReadingExport(bytes);
    expect(errors.some((e) => e.includes('Unsupported reading export version'))).toBe(true);
  });

  it('decodeReadingExport reports invalid protobuf', () => {
    const { errors } = decodeReadingExport(new Uint8Array([0xff, 0xff]));
    expect(errors.some((e) => e.includes('Invalid reading export file'))).toBe(true);
  });

  it('insertReadingFromProto assigns new id and remaps group id', () => {
    const stateBytes = encodeSavedReadingState({
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      cards: [],
      textLabels: [],
    });
    const proto = new cktarot.ReadingRow();
    proto.id = 'exported-id';
    proto.name = 'Same Title';
    proto.state = stateBytes;
    proto.updatedAt = '2026-05-19T10:00:00.000Z';
    proto.groupId = 'exported-group';

    const groupIdMap = new Map<string, string>([['exported-group', 'local-group']]);
    const errors: string[] = [];
    const row = insertReadingFromProto(proto, groupIdMap, errors);

    expect(errors).toEqual([]);
    expect(row).not.toBeNull();
    expect(row!.id).not.toBe('exported-id');
    expect(row!.name).toBe('Same Title');
    expect(row!.state).toEqual(stateBytes);
    expect(row!.updated_at).toBe('2026-05-19T10:00:00.000Z');
    expect(row!.group_id).toBe('local-group');
  });

  it('insertReadingFromProto rejects empty state bytes', () => {
    const proto = new cktarot.ReadingRow();
    proto.id = 'r1';
    proto.name = 'Bad';
    proto.state = new Uint8Array();
    proto.updatedAt = '2026-05-19T10:00:00.000Z';

    const errors: string[] = [];
    const row = insertReadingFromProto(proto, new Map(), errors);

    expect(row).toBeNull();
    expect(errors.some((e) => e.includes('non-empty protobuf bytes'))).toBe(true);
  });

  it('insertReadingFromProto uses Untitled Reading for blank name', () => {
    const stateBytes = encodeSavedReadingState({
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      cards: [],
      textLabels: [],
    });
    const proto = new cktarot.ReadingRow();
    proto.id = 'r1';
    proto.name = '   ';
    proto.state = stateBytes;
    proto.updatedAt = '2026-05-19T10:00:00.000Z';

    const errors: string[] = [];
    const row = insertReadingFromProto(proto, new Map(), errors);

    expect(row!.name).toBe('Untitled Reading');
    expect(row!.group_id).toBe(DEFAULT_READING_GROUP_ID);
  });
});
