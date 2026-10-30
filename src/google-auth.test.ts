import { afterEach, describe, expect, it, vi } from 'vitest';
import { DRIVE_SCOPE, GoogleAuth, type GoogleIdentity } from './google-auth';

function identity(
  reply: (
    config: Parameters<
      GoogleIdentity['accounts']['oauth2']['initTokenClient']
    >[0],
  ) => void,
): GoogleIdentity {
  return {
    accounts: {
      oauth2: {
        initTokenClient: (config) => ({
          requestAccessToken: () => reply(config),
        }),
      },
    },
  };
}
afterEach(() => vi.useRealTimers());
describe('Google prijava: žeton ostane v pomnilniku', () => {
  it('zahteva drive.file in sprejme uspešno prijavo brez spreminjanja shrambe', async () => {
    const storage = { setItem: vi.fn() };
    vi.stubGlobal('localStorage', storage);
    try {
      const auth = new GoogleAuth();
      await auth.connect(
        identity((config) => {
          expect(config.scope).toBe(DRIVE_SCOPE);
          expect(config.client_id).toBe('test-client');
          config.callback({
            access_token: 'test-access',
            expires_in: 3600,
            scope: DRIVE_SCOPE,
          });
        }),
        'test-client',
      );
      expect(auth.accessToken()).toBe('test-access');
      expect(storage.setItem).not.toHaveBeenCalled();
      auth.disconnect();
      expect(() => auth.accessToken()).toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('zavrne manjkajoč Client ID', async () => {
    await expect(
      new GoogleAuth().connect(
        identity(() => {}),
        '',
      ),
    ).rejects.toThrow('VITE_GOOGLE_CLIENT_ID');
  });
  it.each(['denied', 'popup', 'scope'])(
    'varno obravnava napako %s',
    async (kind) => {
      const auth = new GoogleAuth();
      const gis = identity((config) => {
        if (kind === 'popup') config.error_callback();
        else if (kind === 'denied') config.callback({ error: 'access_denied' });
        else
          config.callback({
            access_token: 'test-access',
            expires_in: 3600,
            scope: 'other',
          });
      });
      await expect(auth.connect(gis, 'test-client')).rejects.toThrow();
      expect(() => auth.accessToken()).toThrow();
    },
  );
  it('potek žetona zahteva ponovno prijavo', async () => {
    let now = 0;
    const auth = new GoogleAuth(() => now);
    await auth.connect(
      identity((c) =>
        c.callback({
          access_token: 'test-access',
          expires_in: 60,
          scope: DRIVE_SCOPE,
        }),
      ),
      'test-client',
    );
    now = 31000;
    expect(() => auth.accessToken()).toThrow('potekla');
  });
  it('pozni odgovor po časovni omejitvi ne obnovi prijave', async () => {
    vi.useFakeTimers();
    let callback!: Parameters<
      GoogleIdentity['accounts']['oauth2']['initTokenClient']
    >[0]['callback'];
    const auth = new GoogleAuth();
    const promise = auth.connect(
      identity((c) => {
        callback = c.callback;
      }),
      'test-client',
    );
    const rejected = expect(promise).rejects.toThrow('potekla');
    await vi.advanceTimersByTimeAsync(120000);
    await rejected;
    callback({
      access_token: 'late-test-access',
      expires_in: 3600,
      scope: DRIVE_SCOPE,
    });
    expect(() => auth.accessToken()).toThrow();
  });
});
