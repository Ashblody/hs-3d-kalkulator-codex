import { useEffect, useRef, useState } from 'react';
import type { Backup } from './model';
import { Card } from './ui';
import { GoogleAuth, loadGoogleIdentity } from './google-auth';
import { DriveApi, type DriveFile } from './drive-api';
import {
  DriveSync,
  planSync,
  withDriveLock,
  withLocalWriteLock,
} from './drive-sync';
import {
  KEY,
  adoptDriveRevision,
  download,
  recoveryKeys,
  restoreRecovery,
} from './storage';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
type Session = {
  auth: GoogleAuth;
  api: DriveApi;
  sync: DriveSync;
  email: string;
};
type Review = {
  files: DriveFile[];
  snapshot: Backup;
  raw: string | null;
  conflict: boolean;
};

export function DrivePanel({
  data,
  blocked,
  capture,
  onAdopt,
}: {
  data: Backup;
  blocked: boolean;
  capture: () => Promise<{ snapshot: Backup; raw: string | null }>;
  onAdopt: (data: Backup) => void;
}) {
  const latest = useRef(data);
  latest.current = data;
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Google Drive ni povezan.');
  const [review, setReview] = useState<Review | null>(null);
  const [selected, setSelected] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [ready, setReady] = useState(false);
  const [recoveries, setRecoveries] = useState<string[]>([]);
  const [recovery, setRecovery] = useState('');
  const active = useRef(true);
  const running = useRef(false);
  useEffect(() => {
    active.current = true;
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      active.current = false;
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    if (clientId && online)
      loadGoogleIdentity()
        .then(() => {
          if (active.current) setReady(true);
        })
        .catch(() => {
          if (active.current)
            setMessage(
              'Prijave ni mogoče naložiti. Preverite povezavo in znova odprite nastavitve.',
            );
        });
  }, [online]);
  useEffect(() => () => session?.auth.disconnect(), [session]);

  async function run(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await withDriveLock(action);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Sinhronizacija ni uspela. Lokalni podatki so ohranjeni.',
      );
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function current(): Promise<{ snapshot: Backup; raw: string | null }> {
    if (blocked)
      throw Error(
        'Najprej rešite lokalne podatke ali obnovite veljavno kopijo.',
      );
    return capture();
  }
  function unchanged(snapshot: Backup, raw: string | null) {
    const { sync: _a, ...a } = latest.current;
    const { sync: _b, ...b } = snapshot;
    if (
      JSON.stringify(a) !== JSON.stringify(b) ||
      localStorage.getItem(KEY) !== raw
    )
      throw Error(
        'Lokalni podatki so se medtem spremenili. Ponovite sinhronizacijo.',
      );
  }
  function completed() {
    setLastSync(session!.sync.state().lastSync);
    setReview(null);
    setSelected('');
    setMessage(
      'Sinhronizacija je uspela. Različice so ohranjene kot ločene datoteke.',
    );
  }
  async function connect() {
    if (!window.google) {
      setMessage('Googlova prijava še ni pripravljena. Poskusite znova.');
      return;
    }
    if (running.current) return;
    running.current = true;
    session?.auth.disconnect();
    setSession(null);
    setReview(null);
    setBusy(true);
    const auth = new GoogleAuth();
    try {
      // Called directly by the click handler to preserve popup user activation.
      await auth.connect(window.google, clientId);
      if (!active.current) {
        auth.disconnect();
        return;
      }
      const api = new DriveApi(auth);
      const account = await api.account();
      const sync = new DriveSync(account.id, api);
      if (!active.current) {
        auth.disconnect();
        return;
      }
      setLastSync(sync.state().lastSync);
      setSession({ auth, api, sync, email: account.email });
      setMessage('Povezano. Lokalni podatki ob povezavi niso bili zamenjani.');
    } catch (error) {
      auth.disconnect();
      setMessage(error instanceof Error ? error.message : 'Prijava ni uspela.');
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function synchronize() {
    if (!session) return;
    await run(async () => {
      setReview(null);
      const { snapshot, raw } = await current();
      const files = await session.api.list();
      unchanged(snapshot, raw);
      const plan = planSync(snapshot, files, session.sync.state());
      if (plan.unseen.length) {
        setReview({ files, snapshot, raw, conflict: plan.conflict });
        setSelected('');
        setMessage(
          plan.conflict
            ? 'Konflikt različic. Obe strani sta ohranjeni; izberite naslednji korak.'
            : 'Na Drivu so druge različice. Izberite podatke za prevzem ali ohranite lokalne.',
        );
        return;
      }
      const id = await session.sync.publish(snapshot);
      unchanged(snapshot, raw);
      session.sync.acknowledge(snapshot, files, id);
      completed();
    });
  }
  async function resolve(takeRemote: boolean) {
    if (!session || !review) return;
    await run(async () => {
      unchanged(review.snapshot, review.raw);
      if (takeRemote) {
        const file = review.files.find((f) => f.id === selected);
        if (!file) throw Error('Izberite različico.');
        await session.sync.adopt(
          review.snapshot,
          file,
          review.files,
          () => unchanged(review.snapshot, review.raw),
          (remote) =>
            withLocalWriteLock(() => {
              unchanged(review.snapshot, review.raw);
              onAdopt(adoptDriveRevision(remote, review.raw));
            }),
        );
      } else {
        const id = await session.sync.publish(review.snapshot);
        unchanged(review.snapshot, review.raw);
        session.sync.acknowledge(review.snapshot, review.files, id);
      }
      completed();
    });
  }
  return (
    <Card title="Google Drive">
      <p className="muted">
        Ročna sinhronizacija med napravami. Vsaka različica je ločena datoteka
        JSON; lokalno delo deluje tudi brez povezave.
      </p>
      {!clientId && (
        <p>
          Google Client ID še ni nastavljen. Ročni JSON izvoz in uvoz ostajata
          na voljo.
        </p>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
      <p className="small">
        {session ? `Račun: ${session.email}` : 'Brez povezave z računom'} ·{' '}
        {online ? 'Internet je na voljo' : 'Brez interneta'}
        <br />
        Zadnja uspešna sinhronizacija:{' '}
        {lastSync
          ? new Date(lastSync).toLocaleString('sl-SI')
          : 'še ni izvedena'}
      </p>
      <div className="backup-actions">
        {!session ? (
          <button
            className="button"
            disabled={busy || !clientId || !online || !ready}
            onClick={connect}
          >
            Poveži Google Drive
          </button>
        ) : (
          <>
            <button
              className="button"
              disabled={busy || !online || blocked}
              onClick={synchronize}
            >
              {busy ? 'Poteka …' : 'Sinhroniziraj JSON'}
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => {
                session.auth.disconnect();
                setSession(null);
                setReview(null);
                setLastSync(null);
                setMessage(
                  'Google Drive je odklopljen. Lokalni podatki so ohranjeni.',
                );
              }}
            >
              Odklopi Google Drive
            </button>
            <button
              className="button"
              disabled={busy || !online || !ready}
              onClick={connect}
            >
              Ponovno poveži
            </button>
          </>
        )}
      </div>
      {review && (
        <fieldset disabled={busy || !online}>
          <legend>
            {review.conflict ? 'Razreši konflikt' : 'Izberi različico'}
          </legend>
          <p>
            Samodejnega združevanja ni. Pri prevzemu se lokalno stanje najprej
            ohrani na Drivu in v obnovljivi lokalni kopiji.
          </p>
          <label>
            Različica na Drivu{' '}
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Izberite …</option>
              {review.files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.createdTime
                    ? new Date(f.createdTime).toLocaleString('sl-SI')
                    : ''}{' '}
                  · {f.name} · {f.id}
                </option>
              ))}
            </select>
          </label>
          <div className="backup-actions">
            <button className="button" onClick={() => resolve(false)}>
              Ohrani lokalne in shrani na Drive
            </button>
            <button
              className="button"
              disabled={!selected}
              onClick={() => resolve(true)}
            >
              Prevzemi izbrano različico
            </button>
            <button className="button" onClick={() => setReview(null)}>
              Prekliči
            </button>
          </div>
        </fieldset>
      )}
      <details>
        <summary>Obnovljive lokalne kopije</summary>
        <button
          className="button"
          disabled={busy}
          onClick={() => {
            try {
              setRecoveries(recoveryKeys());
            } catch {
              setMessage('Lokalne kopije niso dostopne.');
            }
          }}
        >
          Prikaži kopije
        </button>
        <label>
          Lokalna kopija{' '}
          <select
            value={recovery}
            onChange={(e) => setRecovery(e.target.value)}
          >
            <option value="">Izberite …</option>
            {recoveries.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button"
          disabled={busy || !recovery}
          onClick={() => {
            const raw = localStorage.getItem(recovery);
            if (raw !== null) download(raw, `${recovery}.json`);
          }}
        >
          Prenesi kopijo JSON
        </button>
        <button
          className="button"
          disabled={busy || !recovery}
          onClick={() =>
            run(async () => {
              if (
                !window.confirm(
                  'Obnovim izbrano lokalno kopijo? Trenutno stanje bo najprej varnostno kopirano.',
                )
              )
                return;
              await withLocalWriteLock(() =>
                onAdopt(restoreRecovery(recovery)),
              );
              setReview(null);
              setMessage(
                'Lokalna kopija je obnovljena. Drive ni bil spremenjen.',
              );
            })
          }
        >
          Obnovi lokalno kopijo
        </button>
      </details>
    </Card>
  );
}
