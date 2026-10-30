import { backupSchema, defaults, demo, type Backup } from './model';
export const KEY = 'hs3d.v1';
export const RECOVERY_PREFIX = 'hs3d.recovery.';
const DEVICE_KEY = 'hs3d.deviceId';
export function initial(): Backup {
  const d = demo();
  return {
    version: 1,
    settings: structuredClone(defaults),
    projects: [
      {
        order: d,
        snapshot: structuredClone(defaults),
        savedAt: new Date().toISOString(),
      },
    ],
    draft: structuredClone(d),
    draftSettings: structuredClone(defaults),
  };
}
export function read(): { data: Backup; error: string } {
  try {
    const raw = localStorage.getItem(KEY);
    return { data: raw ? validate(JSON.parse(raw)) : initial(), error: '' };
  } catch {
    return {
      data: initial(),
      error:
        'Shranjenih podatkov ni bilo mogoče prebrati. Izvirnik je ostal v brskalniku; najprej ga prenesite z gumbom »Reši podatke«.',
    };
  }
}
export function validate(value: unknown): Backup {
  const b = backupSchema.parse(value);
  for (const p of [
    ...b.projects,
    { order: b.draft, snapshot: b.draftSettings },
  ]) {
    if (
      !p.snapshot.printers.some((x) => x.id === p.order.printerId) ||
      !p.snapshot.materials.some((x) => x.id === p.order.materialId)
    )
      throw Error('Neveljavne povezave projekta.');
    if (
      p.order.plates.some(
        (plate) =>
          (plate.printerId &&
            !p.snapshot.printers.some((x) => x.id === plate.printerId)) ||
          (plate.materialId &&
            !p.snapshot.materials.some((x) => x.id === plate.materialId)),
      )
    )
      throw Error('Neveljavne povezave tiskalnih plošč.');
    if (
      new Set(p.order.plates.map((x) => x.id)).size !== p.order.plates.length ||
      new Set(p.order.modelSales.map((x) => x.id)).size !==
        p.order.modelSales.length
    )
      throw Error('Podvojene plošče ali prodajne postavke.');
  }
  if (new Set(b.projects.map((p) => p.order.id)).size !== b.projects.length)
    throw Error('Podvojeni projekti.');
  return b;
}
function deviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

function content(data: Backup) {
  const { sync: _sync, ...payload } = data;
  return JSON.stringify(payload);
}

// Preserve exact bytes, including corrupt data, before any replacement.
function preserve(raw: string): string {
  const key = RECOVERY_PREFIX + crypto.randomUUID();
  localStorage.setItem(key, raw);
  if (localStorage.getItem(key) !== raw)
    throw Error('Varnostna kopija ni potrjena.');
  return key;
}

export function save(data: Backup): Backup {
  const next = validate(data);
  const raw = localStorage.getItem(KEY);
  const previous = raw === null ? null : validate(JSON.parse(raw));
  if (previous?.sync && content(previous) === content(next)) return previous;
  const id = deviceId();
  const result: Backup = {
    ...next,
    sync: {
      schemaVersion: 1,
      revisionId: crypto.randomUUID(),
      baseRevisionId: previous?.sync?.revisionId ?? null,
      deviceId: id,
    },
  };
  if (raw !== null) preserve(raw);
  localStorage.setItem(KEY, JSON.stringify(result));
  return result;
}

// Validate and persist before React state changes. Failed backup/storage leaves
// the current data intact; recovery records are never deleted automatically.
export function replaceFromJson(json: string): Backup {
  const next = validate(JSON.parse(json));
  const raw = localStorage.getItem(KEY);
  const id = deviceId();
  const result: Backup = {
    ...next,
    sync: {
      schemaVersion: 1,
      revisionId: crypto.randomUUID(),
      baseRevisionId: next.sync?.revisionId ?? null,
      deviceId: id,
    },
  };
  if (raw !== null) preserve(raw);
  localStorage.setItem(KEY, JSON.stringify(result));
  return result;
}

export function restoreRecovery(key: string): Backup {
  if (!key.startsWith(RECOVERY_PREFIX)) throw Error('Neveljavna kopija.');
  const raw = localStorage.getItem(key);
  if (raw === null) throw Error('Kopija ne obstaja.');
  return replaceFromJson(raw);
}

export function recoveryKeys(): string[] {
  return Array.from({ length: localStorage.length }, (_, i) =>
    localStorage.key(i),
  ).filter(
    (key): key is string => key !== null && key.startsWith(RECOVERY_PREFIX),
  );
}

export function exportData(data: Backup): Backup {
  const raw = localStorage.getItem(KEY);
  if (raw !== null) {
    try {
      const saved = validate(JSON.parse(raw));
      if (content(saved) === content(validate(data))) return saved;
    } catch {
      // Keep manual export available even when the persisted record is corrupt.
    }
  }
  return validate(data);
}
export function download(data: unknown, filename: string) {
  const blob = new Blob(
    [typeof data === 'string' ? data : JSON.stringify(data, null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function recover() {
  download(localStorage.getItem(KEY) ?? '{}', 'hs3d-izvirni-podatki.json');
}
