import type { Backup } from './model';

export type Revision = NonNullable<Backup['sync']>;
export type SyncDecision = 'equal' | 'upload' | 'download' | 'conflict';

// The acknowledged common revision is authoritative; device clocks are not.
export function compareRevisions(
  local: Revision,
  remote: Revision,
  acknowledgedRevisionId: string | null,
): SyncDecision {
  if (local.revisionId === remote.revisionId) return 'equal';
  if (acknowledgedRevisionId === null) return 'conflict';
  if (remote.revisionId === acknowledgedRevisionId) return 'upload';
  if (local.revisionId === acknowledgedRevisionId) return 'download';
  return 'conflict';
}

export interface RevisionTransport {
  // Must create a new immutable file; never update an existing shared file.
  createRevision(filename: string, json: string): Promise<void>;
}

export function revisionFilename(revision: Revision): string {
  return `hs3d-${revision.revisionId}.json`;
}

// No local mutation or acknowledgement on failure (including lost connection).
// Retrying uses the same name: adapters must reject collisions or verify equality.
export async function uploadRevision(
  data: Backup,
  transport: RevisionTransport,
) {
  if (!data.sync) throw new Error('Manjkajo metapodatki različice.');
  await transport.createRevision(
    revisionFilename(data.sync),
    JSON.stringify(data),
  );
  return data.sync.revisionId;
}
