import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  initial,
  save,
  read,
  validate,
  replaceFromJson,
  restoreRecovery,
  recoveryKeys,
  exportData,
  KEY,
} from './storage';
import { compareRevisions, uploadRevision, revisionFilename } from './sync';

class MemoryStorage {
  values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  key(i: number) {
    return [...this.values.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.values.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.values.set(k, v);
  }
}
let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
});
afterEach(() => vi.unstubAllGlobals());

describe('Varno lokalno shranjevanje in različice', () => {
  it('sprejme stare kopije brez metapodatkov in ohrani vsebino', () => {
    const old = initial();
    expect(validate(JSON.parse(JSON.stringify(old)))).toEqual(old);
    const saved = save(old);
    expect(saved.sync?.schemaVersion).toBe(1);
    const { sync, ...payload } = saved;
    expect(payload).toEqual(old);
    expect(read().data).toEqual(saved);
  });
  it('zavrne neznano shemo metapodatkov', () => {
    const saved = save(initial());
    expect(() =>
      validate({ ...saved, sync: { ...saved.sync, schemaVersion: 99 } }),
    ).toThrow();
  });
  it('nova sprememba dobi ID in starša; enaka vsebina ne ustvari različice', () => {
    const a = save(initial());
    const b = save({ ...a, draft: { ...a.draft, name: 'Sprememba' } });
    expect(b.sync?.revisionId).not.toBe(a.sync?.revisionId);
    expect(b.sync?.baseRevisionId).toBe(a.sync?.revisionId);
    expect(b.sync?.deviceId).toBe(a.sync?.deviceId);
    expect(save(b)).toEqual(b);
  });
  it('neveljaven JSON ali podatki ne spremenijo lokalnega zapisa', () => {
    save(initial());
    const before = [...storage.values];
    for (const json of ['{', '{"version":99}'])
      expect(() => replaceFromJson(json)).toThrow();
    expect([...storage.values]).toEqual(before);
  });
  it('napaka pri kopiranju ustavi zamenjavo', () => {
    save(initial());
    const raw = storage.getItem(KEY);
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw Error('QuotaExceeded');
    });
    expect(() => replaceFromJson(JSON.stringify(initial()))).toThrow();
    expect(storage.getItem(KEY)).toBe(raw);
  });
  it('napaka pri kopiranju ustavi tudi samodejni zapis', () => {
    const a = save(initial());
    const raw = storage.getItem(KEY);
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw Error('QuotaExceeded');
    });
    expect(() => save({ ...a, draft: { ...a.draft, name: 'Novo' } })).toThrow();
    expect(storage.getItem(KEY)).toBe(raw);
  });
  it('ohrani in obnovi prejšnje podatke, tudi po ponovnem branju', () => {
    const a = save(initial());
    const raw = storage.getItem(KEY);
    replaceFromJson(
      JSON.stringify({ ...a, draft: { ...a.draft, name: 'Novo' } }),
    );
    const key = recoveryKeys().find((k) => storage.getItem(k) === raw)!;
    expect(read().data.draft.name).toBe('Novo');
    const restored = restoreRecovery(key);
    expect(restored.draft).toEqual(a.draft);
    expect(storage.getItem(key)).toBe(raw);
    expect(recoveryKeys().length).toBe(2);
  });
  it('ohrani tudi poškodovan izvirnik pred izrecnim uvozom', () => {
    storage.setItem(KEY, '{broken');
    expect(read().error).not.toBe('');
    expect(() => save(initial())).toThrow();
    replaceFromJson(JSON.stringify(initial()));
    expect(recoveryKeys().some((k) => storage.getItem(k) === '{broken')).toBe(
      true,
    );
  });
  it('izvoz ohrani shranjene metapodatke tudi če jih stanje UI še nima', () => {
    const old = initial();
    const saved = save(old);
    expect(exportData(old)).toEqual(saved);
  });
});

describe('Konflikti in nespremenljive oddaljene datoteke', () => {
  it('razlikuje enako, lokalno, oddaljeno in sočasno spremembo', () => {
    const a = save(initial()).sync!;
    const b = {
      ...a,
      revisionId: crypto.randomUUID(),
      baseRevisionId: a.revisionId,
    };
    const c = { ...b, revisionId: crypto.randomUUID() };
    expect(compareRevisions(a, a, null)).toBe('equal');
    expect(compareRevisions(b, a, a.revisionId)).toBe('upload');
    expect(compareRevisions(a, b, a.revisionId)).toBe('download');
    expect(compareRevisions(b, c, a.revisionId)).toBe('conflict');
    expect(compareRevisions(a, b, null)).toBe('conflict');
  });
  it('izguba povezave ohrani lokalno stanje in omogoči ponovitev iste različice', async () => {
    const data = save(initial());
    const before = [...storage.values];
    const createRevision = vi
      .fn()
      .mockRejectedValueOnce(Error('offline'))
      .mockResolvedValueOnce(undefined);
    await expect(uploadRevision(data, { createRevision })).rejects.toThrow(
      'offline',
    );
    expect([...storage.values]).toEqual(before);
    await expect(uploadRevision(data, { createRevision })).resolves.toBe(
      data.sync!.revisionId,
    );
    expect(createRevision.mock.calls[0]).toEqual(createRevision.mock.calls[1]);
  });
  it('vsako različico pošlje v ločeno datoteko in nikoli ne posodablja skupne datoteke', async () => {
    const a = save(initial());
    const b = save({ ...a, draft: { ...a.draft, name: 'Novo' } });
    const createRevision = vi.fn().mockResolvedValue(undefined);
    await uploadRevision(a, { createRevision });
    await uploadRevision(b, { createRevision });
    expect(revisionFilename(a.sync!)).not.toBe(revisionFilename(b.sync!));
    expect(JSON.parse(createRevision.mock.calls[1][1])).toEqual(b);
  });
});
