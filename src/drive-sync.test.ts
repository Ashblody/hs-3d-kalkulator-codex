import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  DriveSync,
  planSync,
  withDriveLock,
  withLocalWriteLock,
} from './drive-sync';
import {
  type DriveFile,
  type DriveRepository,
  DRIVE_MARKER,
} from './drive-api';
import {
  KEY,
  adoptDriveRevision,
  initial,
  read,
  recoveryKeys,
  save,
  restoreRecovery,
} from './storage';
import type { Backup } from './model';

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
let files: Map<string, Backup>;
let api: DriveRepository;
function metadata(id: string, data: Backup): DriveFile {
  return {
    id,
    name: 'copy.json',
    createdTime: '2026-01-01',
    appProperties: { hs3d: DRIVE_MARKER, revisionId: data.sync!.revisionId },
  };
}
beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
  files = new Map();
  api = {
    list: vi.fn(async () => [...files].map(([id, data]) => metadata(id, data))),
    read: vi.fn(async (id) => {
      if (!files.has(id)) throw Error('missing');
      return files.get(id)!;
    }),
    allocateId: vi.fn(async () => crypto.randomUUID()),
    create: vi.fn(async (id, data) => {
      files.set(id, data);
    }),
  };
});
afterEach(() => vi.unstubAllGlobals());

describe('Ročna sinhronizacija in varna obnovitev', () => {
  it('lokalni zapisi uporabljajo ločen kratek lock in ne čakajo omrežnega prenosa', async () => {
    const request = vi.fn(async (name: string, action: () => unknown) => {
      expect(name).toBe('hs3d-local-write');
      return action();
    });
    vi.stubGlobal('navigator', { locks: { request } });
    const action = vi.fn(() => 'saved');
    expect(await withLocalWriteLock(action)).toBe('saved');
    expect(action).toHaveBeenCalledOnce();
  });
  it('lokalni kalkulator ostane uporaben brez podpore Web Locks', async () => {
    vi.stubGlobal('navigator', {});
    expect(await withLocalWriteLock(() => 'offline')).toBe('offline');
    await expect(withDriveLock(async () => {})).rejects.toThrow('Brskalnik');
  });

  it('priprava računa ne spreminja obstoječega LocalStorage', () => {
    storage.setItem(KEY, JSON.stringify(initial()));
    const before = [...storage.values];
    new DriveSync('account', api).state();
    expect([...storage.values]).toEqual(before);
  });
  it('prva povezava z različnimi kopijami zahteva odločitev', async () => {
    const local = save(initial());
    const remote = save({
      ...local,
      draft: { ...local.draft, name: 'Remote' },
    });
    const plan = planSync(
      local,
      [metadata('remote', remote)],
      new DriveSync('a', api).state(),
    );
    expect(plan.conflict).toBe(true);
    expect(plan.unseen).toHaveLength(1);
  });
  it('po potrditvi razlikuje novo oddaljeno kopijo od sočasne lokalne spremembe', () => {
    const local = save(initial());
    const remote = save({
      ...local,
      draft: { ...local.draft, name: 'Remote' },
    });
    const state = {
      knownFileIds: [],
      localRevisionId: local.sync!.revisionId,
      lastSync: null,
    };
    expect(planSync(local, [metadata('r', remote)], state).conflict).toBe(
      false,
    );
    const edited = save({ ...local, draft: { ...local.draft, name: 'Local' } });
    expect(planSync(edited, [metadata('r', remote)], state).conflict).toBe(
      true,
    );
  });
  it('izguba odgovora shrani čakajoči posnetek in ponovi isti ID tudi po ponovnem zagonu', async () => {
    const local = save(initial());
    const create = vi.spyOn(api, 'create');
    create.mockImplementationOnce(async (id, data) => {
      files.set(id, data);
      throw Error('connection lost');
    });
    const sync = new DriveSync('a', api);
    await expect(sync.publish(local)).rejects.toThrow('connection lost');
    expect(sync.state().lastSync).toBeNull();
    expect(sync.state().pending?.data).toEqual(local);
    const next = new DriveSync('a', api);
    const id = await next.publish(local);
    expect(create.mock.calls[0][0]).toBe(id);
    expect(create.mock.calls[1][0]).toBe(id);
    expect(files.size).toBe(1);
    expect(next.state().pending).toBeUndefined();
  });
  it('ob polni shrambi ne začne oddaljenega zapisa', async () => {
    const local = save(initial());
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw Error('quota');
    });
    await expect(new DriveSync('a', api).publish(local)).rejects.toThrow(
      'quota',
    );
    expect(api.create).not.toHaveBeenCalled();
  });
  it('računa imata ločeno stanje; ponovljena različica ne ustvari nove datoteke', async () => {
    const local = save(initial());
    const sync = new DriveSync('a', api);
    const id = await sync.publish(local);
    sync.acknowledge(local, await api.list(), id);
    expect(sync.state().lastSync).not.toBeNull();
    expect(new DriveSync('b', api).state().lastSync).toBeNull();
    expect(await sync.publish(local)).toBe(id);
    expect(api.create).toHaveBeenCalledTimes(1);
  });
  it('pred prevzemom ohrani obe različici na Drivu in obnovljivo lokalno kopijo', async () => {
    const local = save(initial());
    const raw = storage.getItem(KEY);
    const remote = {
      ...local,
      sync: { ...local.sync!, revisionId: crypto.randomUUID() },
      draft: { ...local.draft, name: 'Remote' },
    };
    files.set('remote', remote);
    const file = metadata('remote', remote);
    const sync = new DriveSync('a', api);
    await sync.adopt(
      local,
      file,
      [file],
      () => expect(storage.getItem(KEY)).toBe(raw),
      (data) => {
        adoptDriveRevision(data, raw);
      },
    );
    expect(files.size).toBe(2);
    expect(read().data).toEqual(remote);
    expect(recoveryKeys().some((k) => storage.getItem(k) === raw)).toBe(true);
    const key = recoveryKeys().find((k) => storage.getItem(k) === raw)!;
    restoreRecovery(key);
    expect(read().data.draft).toEqual(local.draft);
    expect(files.get('remote')).toEqual(remote);
  });
  it('neveljavni oddaljeni podatki ne prepišejo lokalnih', async () => {
    const local = save(initial());
    const raw = storage.getItem(KEY);
    const remote = {
      ...local,
      sync: { ...local.sync!, revisionId: crypto.randomUUID() },
    };
    files.set('r', remote);
    vi.spyOn(api, 'read').mockRejectedValue(Error('invalid JSON'));
    await expect(
      new DriveSync('a', api).adopt(
        local,
        metadata('r', remote),
        [],
        () => {},
        (d) => {
          adoptDriveRevision(d, raw);
        },
      ),
    ).rejects.toThrow();
    expect(storage.getItem(KEY)).toBe(raw);
  });
  it('neuspešna lokalna kopija ustavi prevzem in ne potrdi sinhronizacije', async () => {
    const local = save(initial());
    const raw = storage.getItem(KEY);
    const remote = {
      ...local,
      sync: { ...local.sync!, revisionId: crypto.randomUUID() },
    };
    files.set('local', local);
    files.set('remote', remote);
    const realSet = storage.setItem.bind(storage);
    vi.spyOn(storage, 'setItem').mockImplementation((key, value) => {
      if (key.startsWith('hs3d.recovery.')) throw Error('quota');
      realSet(key, value);
    });
    const sync = new DriveSync('a', api);
    await expect(
      sync.adopt(
        local,
        metadata('remote', remote),
        [],
        () => {},
        (d) => {
          adoptDriveRevision(d, raw);
        },
      ),
    ).rejects.toThrow('quota');
    expect(storage.getItem(KEY)).toBe(raw);
    expect(sync.state().lastSync).toBeNull();
  });
  it('sprememba lokalnih podatkov med prenosom ustavi prevzem', async () => {
    const local = save(initial());
    const raw = storage.getItem(KEY);
    const remote = {
      ...local,
      sync: { ...local.sync!, revisionId: crypto.randomUUID() },
    };
    files.set('l', local);
    files.set('r', remote);
    let checks = 0;
    const sync = new DriveSync('a', api);
    await expect(
      sync.adopt(
        local,
        metadata('r', remote),
        [],
        () => {
          if (++checks === 2) throw Error('changed');
        },
        (d) => {
          adoptDriveRevision(d, raw);
        },
      ),
    ).rejects.toThrow('changed');
    expect(storage.getItem(KEY)).toBe(raw);
  });
  it('primerjava lokalnih zapisov ustavi zastarel zapis iz drugega zavihka', () => {
    const local = save(initial());
    const raw = storage.getItem(KEY);
    save({ ...local, draft: { ...local.draft, name: 'Other tab' } });
    expect(() => save(local, raw)).toThrow('drugem zavihku');
    expect(() => adoptDriveRevision(local, raw)).toThrow('spremenili');
    expect(read().data.draft.name).toBe('Other tab');
  });
  it('sočasna sinhronizacija v drugem zavihku je zavrnjena', async () => {
    vi.stubGlobal('navigator', {
      locks: {
        request: (
          _name: string,
          _options: unknown,
          callback: (lock: null) => unknown,
        ) => callback(null),
      },
    });
    const action = vi.fn();
    await expect(withDriveLock(action)).rejects.toThrow('drugem zavihku');
    expect(action).not.toHaveBeenCalled();
  });
});
