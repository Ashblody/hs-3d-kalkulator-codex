import type { Backup } from './model';
import { validate } from './storage';
import { revisionFilename } from './sync';
import type { GoogleAuth } from './google-auth';

const API = 'https://www.googleapis.com/drive/v3';
export const DRIVE_MARKER = 'hs3d-revision-v1';
export type DriveFile = {
  id: string;
  name: string;
  createdTime: string;
  appProperties: { hs3d: string; revisionId: string };
};
export class DriveError extends Error {
  constructor(public status: number) {
    super(
      status === 401
        ? 'Prijava je potekla. Povežite Google Drive znova.'
        : `Google Drive je zavrnil zahtevo (${status}). Podatki niso izbrisani.`,
    );
  }
}
export interface DriveRepository {
  list(): Promise<DriveFile[]>;
  read(id: string): Promise<Backup>;
  allocateId(): Promise<string>;
  create(id: string, data: Backup): Promise<void>;
}
export class DriveApi implements DriveRepository {
  constructor(
    private auth: GoogleAuth,
    private fetcher: typeof fetch = fetch,
  ) {}
  private async request(
    url: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${this.auth.accessToken()}`);
      const response = await this.fetcher(url, {
        ...init,
        headers,
        signal: controller.signal,
        redirect: 'error',
        cache: 'no-store',
      });
      if (!response.ok) {
        if (response.status === 401) this.auth.disconnect();
        throw new DriveError(response.status);
      }
      return response;
    } finally {
      clearTimeout(timer);
    }
  }
  async account(): Promise<{ id: string; email: string }> {
    const result = await (
      await this.request(`${API}/about?fields=user(permissionId,emailAddress)`)
    ).json();
    if (!result.user?.permissionId)
      throw new Error('Google račun ni prepoznan.');
    return {
      id: result.user.permissionId,
      email: result.user.emailAddress ?? '',
    };
  }
  async list(): Promise<DriveFile[]> {
    const files: DriveFile[] = [];
    let pageToken = '';
    const tokens = new Set<string>();
    do {
      const query = new URLSearchParams({
        q: `trashed = false and appProperties has { key='hs3d' and value='${DRIVE_MARKER}' }`,
        spaces: 'drive',
        fields:
          'nextPageToken,incompleteSearch,files(id,name,createdTime,appProperties)',
        pageSize: '100',
        ...(pageToken ? { pageToken } : {}),
      });
      const result = await (await this.request(`${API}/files?${query}`)).json();
      if (result.incompleteSearch || !Array.isArray(result.files))
        throw new Error(
          'Seznam različic ni popoln. Sinhronizacija je ustavljena.',
        );
      for (const file of result.files) {
        if (
          typeof file.id !== 'string' ||
          typeof file.appProperties?.revisionId !== 'string'
        )
          throw new Error('Neveljaven seznam različic.');
        files.push(file);
      }
      pageToken = result.nextPageToken ?? '';
      if (files.length > 5000 || (pageToken && tokens.has(pageToken)))
        throw new Error('Preveč različic ali nepopoln seznam.');
      tokens.add(pageToken);
    } while (pageToken);
    return files.sort((a, b) =>
      (b.createdTime ?? '').localeCompare(a.createdTime ?? ''),
    );
  }
  async read(id: string): Promise<Backup> {
    const response = await this.request(
      `${API}/files/${encodeURIComponent(id)}?alt=media`,
    );
    if (Number(response.headers.get('Content-Length')) > 10e6)
      throw new Error('Datoteka je prevelika.');
    // Bound the actual body too, including chunked responses.
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Prazna datoteka.');
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 10e6) throw new Error('Datoteka je prevelika.');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const data = validate(JSON.parse(new TextDecoder().decode(bytes)));
    if (!data.sync)
      throw new Error('Različica nima metapodatkov sinhronizacije.');
    return data;
  }
  async allocateId(): Promise<string> {
    const result = await (
      await this.request(
        `${API}/files/generateIds?count=1&space=drive&type=files`,
      )
    ).json();
    if (typeof result.ids?.[0] !== 'string')
      throw new Error('ID datoteke ni bil ustvarjen.');
    return result.ids[0];
  }
  async create(id: string, data: Backup): Promise<void> {
    const checked = validate(data);
    if (!checked.sync) throw new Error('Manjkajo metapodatki.');
    const boundary = `hs3d_${crypto.randomUUID()}`;
    const metadata = {
      id,
      name: revisionFilename(checked.sync),
      mimeType: 'application/json',
      appProperties: {
        hs3d: DRIVE_MARKER,
        revisionId: checked.sync.revisionId,
      },
    };
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(checked)}\r\n--${boundary}--`;
    try {
      await this.request(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
        {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        },
      );
    } catch (error) {
      if (!(error instanceof DriveError) || error.status !== 409) throw error;
      // Retry after an ambiguous failure: same allocated file ID, exact payload.
    }
    const confirmed = await this.read(id);
    if (JSON.stringify(confirmed) !== JSON.stringify(checked))
      throw new Error('Vsebina shranjene različice se ne ujema.');
  }
}
