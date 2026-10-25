import { backupSchema, defaults, demo, type Backup } from './model';
const KEY = 'hs3d.v1';
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
export function save(data: Backup) {
  localStorage.setItem(KEY, JSON.stringify(data));
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
