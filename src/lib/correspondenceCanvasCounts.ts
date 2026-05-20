import type { DraggableCard, TarotCard } from '../types/canvas.js';
import {
  getCachedCorrespondenceThumbUrl,
  getCorrespondenceById,
  getCorrespondenceImageRow,
  setCachedCorrespondenceThumbUrl,
} from './localCorrespondences.js';

/** Resolved correspondence for display on a card or in the count bar. */
export interface CorrespondenceDisplay {
  id: string;
  title: string;
  thumbnailUrl: string | null;
}

/** One row in the canvas correspondence count status bar. */
export interface CorrespondenceCanvasCountEntry extends CorrespondenceDisplay {
  count: number;
}

/** Whether correspondence icons should render on canvas cards (thumbnails setting or count bar). */
export function shouldShowCorrespondenceOnCanvas(settings: {
  showCorrespondenceThumbnailsOnCanvas: boolean;
  showCorrespondenceCountBarOnCanvas: boolean;
}): boolean {
  return (
    settings.showCorrespondenceThumbnailsOnCanvas || settings.showCorrespondenceCountBarOnCanvas
  );
}

/** True when correspondence ids and display rows match between two card snapshots. */
export function correspondenceMetaEqual(a: TarotCard, b: TarotCard): boolean {
  const aIds = (a.correspondence_ids ?? []).join('\0');
  const bIds = (b.correspondence_ids ?? []).join('\0');
  if (aIds !== bIds) return false;
  const ad = a.correspondenceDisplays ?? [];
  const bd = b.correspondenceDisplays ?? [];
  if (ad.length !== bd.length) return false;
  for (let i = 0; i < ad.length; i++) {
    const x = ad[i];
    const y = bd[i];
    if (x.id !== y.id || x.title !== y.title || x.thumbnailUrl !== y.thumbnailUrl) return false;
  }
  return true;
}

/**
 * Counts how many canvas cards reference each correspondence id.
 *
 * @param draggableCards - Cards currently on the canvas.
 * @returns Map from correspondence id to occurrence count.
 */
export function aggregateCorrespondenceCounts(
  draggableCards: readonly DraggableCard[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const dc of draggableCards) {
    const ids = dc.card.correspondence_ids ?? [];
    const uniqueOnCard = new Set(ids.map((id) => id.trim()).filter(Boolean));
    for (const id of uniqueOnCard) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

async function resolveCorrespondenceThumbnailUrl(thumbnailBlobId: string): Promise<string | null> {
  let u = getCachedCorrespondenceThumbUrl(thumbnailBlobId);
  if (u) return u;
  const thumbMeta = await getCorrespondenceImageRow(thumbnailBlobId);
  if (!thumbMeta?.blob) return null;
  u = URL.createObjectURL(thumbMeta.blob);
  setCachedCorrespondenceThumbUrl(thumbnailBlobId, u);
  return u;
}

/**
 * Resolves correspondence metadata and thumbnails for display (card row or status bar).
 *
 * @param ids - Correspondence library ids assigned to a card.
 * @returns One entry per known id, in assignment order.
 */
export async function resolveCorrespondenceDisplays(
  ids: readonly string[],
): Promise<CorrespondenceDisplay[]> {
  const displays: CorrespondenceDisplay[] = [];
  const seen = new Set<string>();
  for (const rawId of ids) {
    const id = rawId.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const row = await getCorrespondenceById(id);
    if (!row) continue;
    let thumbnailUrl: string | null = null;
    if (row.thumbnailBlobId) {
      thumbnailUrl = await resolveCorrespondenceThumbnailUrl(row.thumbnailBlobId);
    }
    displays.push({ id, title: row.title, thumbnailUrl });
  }
  return displays;
}

/**
 * Resolves library metadata and thumbnail URLs for aggregated counts.
 *
 * @param counts - Per-id counts from {@link aggregateCorrespondenceCounts}.
 * @returns Sorted entries (count desc, then title asc).
 */
export async function resolveCorrespondenceCountEntries(
  counts: Map<string, number>,
): Promise<CorrespondenceCanvasCountEntry[]> {
  const entries: CorrespondenceCanvasCountEntry[] = [];
  for (const [id, count] of counts) {
    const displays = await resolveCorrespondenceDisplays([id]);
    const display = displays[0];
    if (!display) continue;
    entries.push({ ...display, count });
  }
  entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.title.localeCompare(b.title);
  });
  return entries;
}
