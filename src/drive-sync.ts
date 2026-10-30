import type { Backup } from './model';
import type { DriveFile, DriveRepository } from './drive-api';
import { validate } from './storage';

export type SyncState = {
  knownFileIds: string[];
  localRevisionId: string | null;
  lastSync: string | null;
  pending?: { fileId: string; data: Backup };
};
const empty = (): SyncState => ({
  knownFileIds: [],
  localRevisionId: null,
  lastSync: null,
});
export function planSync(data: Backup, files: DriveFile[], state: SyncState) {
  const unseen = files.filter(
    (f) =>
      !state.knownFileIds.includes(f.id) &&
      f.appProperties.revisionId !== data.sync?.revisionId,
  );
  const localChanged = state.localRevisionId !== data.sync?.revisionId;
  return { unseen, conflict: unseen.length > 0 && localChanged };
}
export class DriveSync {
  private key: string;
  constructor(
    accountId: string,
    private api: DriveRepository,
    private storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
  ) {
    this.key = `hs3d.drive.${accountId}`;
  }
  state(): SyncState {
    const raw = this.storage.getItem(this.key);
    if (!raw) return empty();
    const value = JSON.parse(raw);
    if (
      !Array.isArray(value.knownFileIds) ||
      !value.knownFileIds.every((id: unknown) => typeof id === 'string') ||
      !(
        value.localRevisionId === null ||
        typeof value.localRevisionId === 'string'
      ) ||
      !(value.lastSync === null || typeof value.lastSync === 'string')
    )
      throw Error('Neveljavno stanje sinhronizacije.');
    if (value.pending) {
      if (typeof value.pending.fileId !== 'string')
        throw Error('Neveljaven čakajoči prenos.');
      value.pending.data = validate(value.pending.data);
      if (!value.pending.data.sync) throw Error('Neveljaven čakajoči prenos.');
    }
    return value;
  }
  private write(state: SyncState) {
    this.storage.setItem(this.key, JSON.stringify(state));
  }
  async publish(data: Backup): Promise<string> {
    const checked = validate(data);
    if (!checked.sync) throw Error('Manjkajo metapodatki.');
    let state = this.state();
    if (state.pending) {
      const pending = state.pending;
      await this.api.create(pending.fileId, pending.data);
      state = { ...state, pending: undefined };
      this.write(state);
      if (pending.data.sync!.revisionId === checked.sync.revisionId) {
        if (JSON.stringify(pending.data) !== JSON.stringify(checked))
          throw Error('Enak ID označuje različni vsebini.');
        return pending.fileId;
      }
    }
    const matches = (await this.api.list()).filter(
      (f) => f.appProperties.revisionId === checked.sync!.revisionId,
    );
    if (matches.length) {
      for (const file of matches) {
        if (
          JSON.stringify(validate(await this.api.read(file.id))) !==
          JSON.stringify(checked)
        )
          throw Error('Enak ID označuje različni vsebini.');
      }
      return matches[0].id;
    }
    const fileId = await this.api.allocateId();
    state = { ...state, pending: { fileId, data: checked } };
    // Persist the exact snapshot and allocated ID before any network write.
    this.write(state);
    await this.api.create(fileId, checked);
    this.write({ ...state, pending: undefined });
    return fileId;
  }
  async adopt(
    local: Backup,
    file: DriveFile,
    seen: DriveFile[],
    assertUnchanged: () => void,
    apply: (data: Backup) => void | Promise<void>,
  ): Promise<void> {
    assertUnchanged();
    const id = await this.publish(local);
    const remote = validate(await this.api.read(file.id));
    if (remote.sync?.revisionId !== file.appProperties.revisionId)
      throw Error('Metapodatki datoteke se ne ujemajo.');
    assertUnchanged();
    await apply(remote);
    this.acknowledge(remote, seen, id);
  }

  acknowledge(data: Backup, seen: DriveFile[], uploadedId: string) {
    if (!data.sync) throw Error('Manjkajo metapodatki.');
    this.write({
      ...this.state(),
      knownFileIds: [...new Set([...seen.map((f) => f.id), uploadedId])],
      localRevisionId: data.sync.revisionId,
      lastSync: new Date().toISOString(),
    });
  }
}

// Chrome supports Web Locks. Never silently run overlapping sync operations.
export async function withDriveLock<T>(action: () => Promise<T>): Promise<T> {
  if (!navigator.locks)
    throw Error(
      'Brskalnik ne podpira varnega zaklepanja. Uporabite posodobljen Chrome.',
    );
  return navigator.locks.request(
    'hs3d-drive-sync',
    { ifAvailable: true },
    async (lock) => {
      if (!lock) throw Error('Sinhronizacija že poteka v drugem zavihku.');
      return action();
    },
  );
}

// Keep local-write locks short: network transfers must never delay offline edits.
export async function withLocalWriteLock<T>(action: () => T): Promise<T> {
  if (!navigator.locks) return action();
  return navigator.locks.request('hs3d-local-write', action);
}
