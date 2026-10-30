import { describe, expect, it, vi } from 'vitest';
import { DriveApi, DriveError, DRIVE_MARKER } from './drive-api';
import { initial } from './storage';
import type { GoogleAuth } from './google-auth';

const auth = () =>
  ({
    accessToken: () => 'fake-token',
    disconnect: vi.fn(),
  }) as unknown as GoogleAuth;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
function snapshot() {
  return {
    ...initial(),
    sync: {
      schemaVersion: 1 as const,
      revisionId: crypto.randomUUID(),
      baseRevisionId: null,
      deviceId: crypto.randomUUID(),
    },
  };
}

describe('Google Drive API', () => {
  it.each([401, 403, 429, 500])(
    'zavrne HTTP %s brez spreminjanja podatkov',
    async (status) => {
      const credentials = auth();
      const fetcher = vi.fn().mockResolvedValue(json({}, status));
      const api = new DriveApi(credentials, fetcher);
      await expect(api.list()).rejects.toBeInstanceOf(DriveError);
      expect(credentials.disconnect).toHaveBeenCalledTimes(
        status === 401 ? 1 : 0,
      );
    },
  );
  it('omrežna napaka ostane napaka', async () => {
    const api = new DriveApi(
      auth(),
      vi.fn().mockRejectedValue(new TypeError('offline')),
    );
    await expect(api.list()).rejects.toThrow('offline');
  });
  it('prebere vse strani in pošilja žeton samo kot Authorization header', async () => {
    const file = {
      id: 'f',
      name: 'copy.json',
      createdTime: '2026-01-01',
      appProperties: { hs3d: DRIVE_MARKER, revisionId: 'r' },
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ files: [], nextPageToken: 'next' }))
      .mockResolvedValueOnce(json({ files: [file] }));
    expect(await new DriveApi(auth(), fetcher).list()).toEqual([file]);
    expect(fetcher.mock.calls[1][0]).toContain('pageToken=next');
    for (const [url, init] of fetcher.mock.calls) {
      expect(url).not.toContain('fake-token');
      expect(init.headers.get('Authorization')).toBe('Bearer fake-token');
      expect(init.cache).toBe('no-store');
    }
  });
  it('nepopoln seznam ne dovoli sinhronizacije', async () => {
    await expect(
      new DriveApi(
        auth(),
        vi.fn().mockResolvedValue(json({ files: [], incompleteSearch: true })),
      ).list(),
    ).rejects.toThrow('popoln');
  });
  it('prepozna račun za ločeno stanje sinhronizacije', async () => {
    const api = new DriveApi(
      auth(),
      vi
        .fn()
        .mockResolvedValue(
          json({
            user: { permissionId: 'account', emailAddress: 'test@example.com' },
          }),
        ),
    );
    expect(await api.account()).toEqual({
      id: 'account',
      email: 'test@example.com',
    });
  });
  it('zavrne neveljaven JSON in preveliko telo', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('{'))
      .mockResolvedValueOnce(new Response('x'.repeat(10e6 + 1)));
    const api = new DriveApi(auth(), fetcher);
    await expect(api.read('bad')).rejects.toThrow();
    await expect(api.read('big')).rejects.toThrow('prevelika');
  });
  it('ustvari ločeno datoteko POST z vnaprej določenim ID in preveri vsebino', async () => {
    const data = snapshot();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ id: 'allocated' }))
      .mockResolvedValueOnce(json(data));
    await new DriveApi(auth(), fetcher).create('allocated', data);
    expect(fetcher.mock.calls[0][1].method).toBe('POST');
    expect(fetcher.mock.calls[0][1].body).toContain('"id":"allocated"');
    expect(fetcher.mock.calls[0][1].body).toContain(
      `hs3d-${data.sync.revisionId}.json`,
    );
    expect(fetcher.mock.calls[0][1].body).not.toContain('fake-token');
  });
  it('409 po ponovitvi prizna samo ob popolnoma enaki vsebini', async () => {
    const data = snapshot();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({}, 409))
      .mockResolvedValueOnce(json(data));
    await expect(
      new DriveApi(auth(), fetcher).create('same-id', data),
    ).resolves.toBeUndefined();
    const wrong = vi
      .fn()
      .mockResolvedValueOnce(json({}, 409))
      .mockResolvedValueOnce(
        json({ ...data, draft: { ...data.draft, name: 'other' } }),
      );
    await expect(
      new DriveApi(auth(), wrong).create('same-id', data),
    ).rejects.toThrow('ne ujema');
  });
  it('pridobi ID za varen ponovni poskus', async () => {
    expect(
      await new DriveApi(
        auth(),
        vi.fn().mockResolvedValue(json({ ids: ['allocated'] })),
      ).allocateId(),
    ).toBe('allocated');
  });
});
