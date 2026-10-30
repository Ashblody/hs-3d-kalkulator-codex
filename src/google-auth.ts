export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

type TokenResponse = {
  access_token?: string;
  expires_in?: number | string;
  scope?: string;
  error?: string;
};
export interface GoogleIdentity {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback: () => void;
      }): { requestAccessToken(options: { prompt: string }): void };
    };
  };
}
declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}
let loading: Promise<GoogleIdentity> | undefined;
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google) return Promise.resolve(window.google);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => fail(), 15000);
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      loading = undefined;
      reject(
        new Error('Googlove prijave ni mogoče naložiti. Preverite povezavo.'),
      );
    };
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      clearTimeout(timer);
      if (window.google) resolve(window.google);
      else fail();
    };
    script.onerror = fail;
    document.head.append(script);
  });
  return loading;
}

// Token and expiry live only in this object, never in browser storage.
export class GoogleAuth {
  private token = '';
  private expiresAt = 0;
  private generation = 0;
  constructor(private now = () => Date.now()) {}
  connect(identity: GoogleIdentity, clientId: string): Promise<void> {
    this.disconnect();
    if (!clientId.trim())
      return Promise.reject(new Error('Manjka VITE_GOOGLE_CLIENT_ID.'));
    const generation = this.generation;
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        settled = true;
        this.disconnect();
        reject(new Error('Prijava je potekla. Poskusite znova.'));
      }, 120000);
      const fail = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.disconnect();
        reject(new Error('Prijava ni uspela ali je bila preklicana.'));
      };
      try {
        identity.accounts.oauth2
          .initTokenClient({
            client_id: clientId,
            scope: DRIVE_SCOPE,
            callback: (response) => {
              if (settled) return;
              if (generation !== this.generation) {
                fail();
                return;
              }
              clearTimeout(timer);
              if (
                response.error ||
                !response.access_token ||
                !response.scope?.split(' ').includes(DRIVE_SCOPE) ||
                !(Number(response.expires_in) > 0)
              ) {
                fail();
                return;
              }
              settled = true;
              this.token = response.access_token;
              this.expiresAt = this.now() + Number(response.expires_in) * 1000;
              resolve();
            },
            error_callback: fail,
          })
          .requestAccessToken({ prompt: 'select_account' });
      } catch {
        fail();
      }
    });
  }
  accessToken(): string {
    if (!this.token || this.now() >= this.expiresAt - 30000) {
      this.disconnect();
      throw new Error('Povežite Google Drive znova; prijava je potekla.');
    }
    return this.token;
  }
  disconnect() {
    this.generation++;
    this.token = '';
    this.expiresAt = 0;
  }
}
