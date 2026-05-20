import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_CORRESPONDENCE_GROUP_ID } from '../../../types/localDb.js';
import type {
  LocalCorrespondenceGroupRow,
  LocalCorrespondenceRow,
} from '../../../types/localDb.js';
import { CORRESPONDENCE_EXPORT_VERSION } from '../../../types/settings.js';
import { cktarot } from '../../../proto/generated/bundle.js';

const getCorrespondenceImageRow = vi.hoisted(() => vi.fn());
const putCorrespondenceImageRow = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/localCorrespondences.js', () => ({
  getCorrespondenceImageRow,
  putCorrespondenceImageRow,
}));

import {
  decodeCorrespondenceExport,
  encodeCorrespondenceExport,
  insertCorrespondenceFromProto,
} from '../../../lib/proto/correspondenceExportCodec.js';

describe('correspondenceExportCodec.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    putCorrespondenceImageRow.mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('round-trips groups and correspondences', async () => {
    const groups: LocalCorrespondenceGroupRow[] = [
      { id: DEFAULT_CORRESPONDENCE_GROUP_ID, title: 'Default' },
      { id: 'g-user', title: 'Herbs' },
    ];
    const correspondences: LocalCorrespondenceRow[] = [
      {
        id: 'c1',
        title: 'Rose',
        description: 'Love',
        group_id: 'g-user',
        thumbnailBlobId: null,
      },
    ];
    const bytes = await encodeCorrespondenceExport({
      groups,
      correspondences,
      exportedAt: '2026-05-20T00:00:00.000Z',
    });
    const { export: exportMsg, errors } = decodeCorrespondenceExport(bytes);
    expect(errors).toEqual([]);
    expect(exportMsg.version).toBe(CORRESPONDENCE_EXPORT_VERSION);
    expect(exportMsg.exportedAt).toBe('2026-05-20T00:00:00.000Z');
    expect(exportMsg.groups).toHaveLength(2);
    expect(exportMsg.correspondences).toHaveLength(1);
    expect(exportMsg.correspondences?.[0]?.title).toBe('Rose');
    expect(exportMsg.correspondences?.[0]?.groupId).toBe('g-user');
  });

  it('decodeCorrespondenceExport adds error when version mismatches', async () => {
    const msg = new cktarot.CktarotCorrespondenceExport();
    msg.version = 99;
    const bytes = new Uint8Array(cktarot.CktarotCorrespondenceExport.encode(msg).finish());
    const { errors } = decodeCorrespondenceExport(bytes);
    expect(errors.some((e) => e.includes('Unsupported correspondence export version'))).toBe(true);
  });

  it('decodeCorrespondenceExport reports invalid protobuf', () => {
    const { errors } = decodeCorrespondenceExport(new Uint8Array([0xff, 0xff]));
    expect(errors.some((e) => e.includes('Invalid correspondence export file'))).toBe(true);
  });

  it('insertCorrespondenceFromProto assigns new ids and remaps group', async () => {
    const proto = new cktarot.CorrespondenceRow();
    proto.id = 'exported-id';
    proto.title = '  Sage  ';
    proto.description = ' wisdom ';
    proto.groupId = 'old-group';

    const groupIdMap = new Map<string, string>([['old-group', 'new-group-uuid']]);
    const errors: string[] = [];
    const row = await insertCorrespondenceFromProto(proto, groupIdMap, errors);

    expect(errors).toEqual([]);
    expect(row).not.toBeNull();
    expect(row!.id).not.toBe('exported-id');
    expect(row!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(row!.title).toBe('Sage');
    expect(row!.description).toBe('wisdom');
    expect(row!.group_id).toBe('new-group-uuid');
    expect(row!.thumbnailBlobId).toBeNull();
  });

  it('insertCorrespondenceFromProto creates thumbnail with new blob id', async () => {
    const proto = new cktarot.CorrespondenceRow();
    proto.id = 'c-old';
    proto.title = 'Thumb';
    proto.groupId = DEFAULT_CORRESPONDENCE_GROUP_ID;
    proto.thumbnailData = new Uint8Array([1, 2, 3]);
    proto.thumbnailMimeType = 'image/png';

    const groupIdMap = new Map<string, string>([
      [DEFAULT_CORRESPONDENCE_GROUP_ID, DEFAULT_CORRESPONDENCE_GROUP_ID],
    ]);
    const errors: string[] = [];
    const row = await insertCorrespondenceFromProto(proto, groupIdMap, errors);

    expect(row!.thumbnailBlobId).not.toBeNull();
    expect(putCorrespondenceImageRow).toHaveBeenCalledTimes(1);
    const putArg = putCorrespondenceImageRow.mock.calls[0][0] as { id: string };
    expect(putArg.id).toBe(row!.thumbnailBlobId);
    expect(putArg.id).not.toBe('c-old');
  });

  it('insertCorrespondenceFromProto falls back to default group when map missing', async () => {
    const proto = new cktarot.CorrespondenceRow();
    proto.id = 'x';
    proto.title = 'X';
    proto.groupId = 'unknown-group';

    const errors: string[] = [];
    const row = await insertCorrespondenceFromProto(proto, new Map(), errors);

    expect(row!.group_id).toBe(DEFAULT_CORRESPONDENCE_GROUP_ID);
  });
});
