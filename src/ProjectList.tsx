import { useState } from 'react';
import { FolderOpen, ArrowUpRight, Copy, Trash2 } from 'lucide-react';
import { Card, Text, Select, options } from './ui';
import { calculate, eur, type Project, type Order } from './model';
const statuses = ['Osnutek', 'Ponudba', 'Potrjeno', 'V izdelavi', 'Zaključeno'];
export function ProjectList({
  projects,
  onOpen,
  onNew,
  onDelete,
  onStatus,
}: {
  projects: Project[];
  onOpen: (p: Project, copy?: boolean) => void;
  onNew: () => void;
  onDelete: (p: Project) => void;
  onStatus: (p: Project, status: Order['status']) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Vsi');
  const visible = projects.filter(
    (p) =>
      (status === 'Vsi' || p.order.status === status) &&
      [p.order.name, p.order.client, p.order.description]
        .join(' ')
        .toLocaleLowerCase('sl-SI')
        .includes(query.trim().toLocaleLowerCase('sl-SI')),
  );
  return (
    <>
      <div className="project-filters">
        <Text
          label="Poišči projekt ali stranko"
          value={query}
          onChange={setQuery}
        />
        <Select
          label="Filtriraj po statusu"
          value={status}
          options={options(['Vsi', ...statuses])}
          onChange={setStatus}
        />
        <span className="muted small">
          Prikazanih {visible.length} od {projects.length}
        </span>
      </div>
      <div className="projects-grid">
        {visible.map((p) => {
          const r = calculate(p.order, p.snapshot);
          return (
            <Card
              key={p.order.id}
              title={p.order.name}
              aside={<span className="badge">{p.order.status}</span>}
            >
              <p className="muted">
                {p.order.client || 'Brez stranke'} ·{' '}
                {new Date(p.order.date).toLocaleDateString('sl-SI')}
              </p>
              <div className="project-value">
                {eur(r.total)}
                <span>
                  {p.order.kind} · {r.quantity}{' '}
                  {p.order.kind === 'Digitalna datoteka' &&
                  p.order.modelSaleEnabled
                    ? 'datotek / paketov'
                    : 'kos'}
                </span>
              </div>
              <Select
                label={`Status projekta: ${p.order.name}`}
                value={p.order.status}
                options={options(statuses)}
                onChange={(v) => onStatus(p, v as Order['status'])}
              />
              <div className="project-buttons project-quick-actions">
                <button className="button primary" onClick={() => onOpen(p)}>
                  Odpri
                  <ArrowUpRight size={15} />
                </button>
                <button
                  className="button ghost"
                  onClick={() => onOpen(p, true)}
                >
                  <Copy size={15} />
                  Kopiraj
                </button>
                <button
                  className="icon-button"
                  aria-label={'Izbriši ' + p.order.name}
                  onClick={() => onDelete(p)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          );
        })}
        {!projects.length && (
          <div className="empty-state">
            <FolderOpen size={40} />
            <h2>Prostor za vaš prvi projekt.</h2>
            <p>
              Izračun shranite iz kalkulatorja in ga boste vedno našli tukaj.
            </p>
            <button className="button primary" onClick={onNew}>
              Nov projekt
            </button>
          </div>
        )}
        {projects.length > 0 && !visible.length && (
          <div className="empty-state">
            <FolderOpen size={32} />
            <h2>Ni zadetkov za izbrane filtre.</h2>
            <button
              className="button"
              onClick={() => {
                setQuery('');
                setStatus('Vsi');
              }}
            >
              Ponastavi filtre
            </button>
          </div>
        )}
      </div>
    </>
  );
}
