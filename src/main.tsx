import { Num, Text, Select, Toggle, Card, options } from './ui';
import React, { useState, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Calculator,
  FolderOpen,
  ChartNoAxesCombined,
  Settings2,
  Box,
  Plus,
  ArrowUpRight,
  ArrowDownToLine,
  Sun,
  Moon,
  Check,
  ChevronRight,
  Save,
  Copy,
  Trash2,
  FileText,
  Menu,
  X,
  WifiOff,
  Layers,
  Printer,
  Clock,
  SlidersHorizontal,
  Download,
  Upload,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  calculate,
  defaults,
  demo,
  fresh,
  uid,
  eur,
  dec,
  serviceKeys,
  serviceLabels,
  digitalLabels,
  settingsSchema,
  orderSchema,
  type Settings,
  type Order,
  type Project,
  type Result,
} from './model';
import {
  read,
  save,
  download,
  validate,
  recover,
  replaceFromJson,
  exportData,
} from './storage';
import './style.css';
import { MaterialCatalog } from './MaterialCatalog';
import { ModelSales, newModelSale } from './ModelSales';
import { PlatesEditor } from './PlatesEditor';
import { ProjectList } from './ProjectList';
import { MonthlyPlan } from './MonthlyPlan';

const colors = [
  '#1b785c',
  '#54aa89',
  '#a0cdb9',
  '#d8e8df',
  '#e9ae65',
  '#899fba',
  '#2c4d44',
];
function Charts({ r }: { r: Result }) {
  const chart = [
    { name: 'Material', value: r.material },
    { name: 'Elektrika', value: r.electricity },
    { name: 'Amortizacija', value: r.depreciation },
    { name: 'Potrošni in neposredni stroški', value: r.consumables + r.direct },
    { name: 'Rezerva', value: r.reserve },
    { name: 'Aktivno delo', value: r.work },
    { name: 'Prodaja modelov', value: r.fileSale },
    { name: 'Pribitek', value: r.markup },
  ].filter((x) => x.value > 0);
  return (
    <Card
      title="Kam gre vrednost naročila?"
      icon={<ChartNoAxesCombined size={17} />}
    >
      <p className="muted small">Struktura pred popusti, prevozom in DDV.</p>
      <div className="chart-row">
        <div className="donut">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={chart}
                dataKey="value"
                innerRadius={55}
                outerRadius={77}
                paddingAngle={3}
                stroke="none"
              >
                {chart.map((x, i) => (
                  <Cell key={x.name} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => eur(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center">
            <b>{eur(chart.reduce((n, x) => n + x.value, 0))}</b>
            <span>vrednost</span>
          </div>
        </div>
        <div className="legend">
          {chart.map((x, i) => (
            <div key={x.name}>
              <i style={{ background: colors[i % colors.length] }} />
              <span>{x.name}</span>
              <b>{eur(x.value)}</b>
            </div>
          ))}
        </div>
      </div>
      {r.printing && Math.abs(r.printCost - r.base - r.reserve) > 0.005 && (
        <p className="muted small">
          Ročni strošek lahko odstopa od prikazane strukture:{' '}
          {eur(r.printCost - r.base - r.reserve)}.
        </p>
      )}
      <div className="bar-chart">
        <ResponsiveContainer width="100%" height={125}>
          <BarChart
            layout="vertical"
            data={[
              { name: 'Prihodki', value: r.net },
              { name: 'Stroški', value: r.actualCosts + r.fixed + r.tax },
            ]}
            margin={{ left: 0, right: 20, top: 10, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              width={62}
              tick={{ fontSize: 11, fill: '#82928b' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip formatter={(v) => eur(Number(v))} />
            <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={17}>
              <Cell fill="#247b60" />
              <Cell fill="#bdc9c2" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="muted small">
        Stroški vključujejo neposredne stroške, razporejene fiksne stroške in
        davčno rezervo.
      </p>
    </Card>
  );
}

function App() {
  const [loaded] = useState(read);
  const [data, setData] = useState(loaded.data);
  const [error, setError] = useState(loaded.error);
  const [blocked, setBlocked] = useState(!!loaded.error);
  const [tab, setTab] = useState('Kalkulator');
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('hs3d.theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [mobile, setMobile] = useState(false);
  const [print, setPrint] = useState(false);
  const [install, setInstall] = useState<any>(null);
  const o = orderSchema.parse(data.draft),
    s = data.draftSettings,
    r = calculate(o, s);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {
      localStorage.setItem('hs3d.theme', dark ? 'dark' : 'light');
    } catch {}
  }, [dark]);
  useEffect(() => {
    if (blocked) return;
    try {
      save(data);
      setError('');
    } catch {
      setError(
        'Data ni bilo mogoče shraniti. Prostor brskalnika je poln ali nedostopen. Prenesite varnostno kopijo.',
      );
    }
  }, [data, blocked]);
  useEffect(() => {
    const off = () => setOnline(false),
      on = () => setOnline(true),
      prompt = (e: Event) => {
        e.preventDefault();
        setInstall(e);
      };
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    window.addEventListener('beforeinstallprompt', prompt);
    return () => {
      window.removeEventListener('offline', off);
      window.removeEventListener('online', on);
      window.removeEventListener('beforeinstallprompt', prompt);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (print) {
      const t = setTimeout(() => {
        window.print();
        setPrint(false);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [print]);
  const update = (patch: Partial<Order>) =>
    setData((d) => ({ ...d, draft: { ...d.draft, ...patch } }));
  const store = () => {
    if (!o.name.trim()) {
      setNotice('Vnesite ime projekta.');
      return;
    }
    const p: Project = {
      order: structuredClone(o),
      snapshot: structuredClone(s),
      savedAt: new Date().toISOString(),
    };
    setData((d) => ({
      ...d,
      projects: [p, ...d.projects.filter((x) => x.order.id !== o.id)],
    }));
    setNotice('Projekt je shranjen s posnetkom cenika.');
  };
  const newOrder = () => {
    setData((d) => ({
      ...d,
      draft: fresh(d.settings),
      draftSettings: structuredClone(d.settings),
    }));
    setTab('Kalkulator');
  };
  const open = (p: Project, copy = false) => {
    setData((d) => ({
      ...d,
      draft: {
        ...structuredClone(p.order),
        ...(copy
          ? {
              id: uid(),
              name: p.order.name + ' – kopija',
              status: 'Osnutek' as const,
            }
          : {}),
      },
      draftSettings: structuredClone(p.snapshot),
    }));
    setTab('Kalkulator');
  };
  const backup = () =>
    download(
      exportData(data),
      `HS-3D-varnostna-kopija-${new Date().toISOString().slice(0, 10)}.json`,
    );
  async function restore(file?: File) {
    if (!file) return;
    if (file.size > 10e6) {
      setNotice('Datoteka je prevelika (največ 10 MB).');
      return;
    }
    try {
      const json = await file.text();
      validate(JSON.parse(json));
      download(data, 'HS-3D-pred-obnovo.json');
      const next = replaceFromJson(json);
      setBlocked(false);
      setData(next);
      setNotice('Podatki so obnovljeni. Predhodno stanje je preneseno.');
    } catch {
      setNotice(
        'Obnova ni uspela. Preverite veljavno varnostno kopijo HS 3D (različica 1).',
      );
    }
  }
  const nav = [
    { name: 'Kalkulator', icon: Calculator },
    { name: 'Projekti', icon: FolderOpen },
    { name: 'Poslovni pregled', icon: ChartNoAxesCombined },
    { name: 'Materiali in nabava', icon: Layers },
    { name: 'Nastavitve', icon: Settings2 },
  ];
  return (
    <>
      <div className="app-shell">
        <aside className={'sidebar ' + (mobile ? 'open' : '')}>
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setTab('Kalkulator');
            }}
          >
            <div className="brand-icon">
              <Box size={27} />
            </div>
            <div>
              HS <strong>3D</strong>
              <small>STUDIO WORKSPACE</small>
            </div>
          </a>
          <div className="workspace-label">VAŠ DELOVNI PROSTOR</div>
          <nav>
            {nav.map((n) => (
              <button
                key={n.name}
                className={tab === n.name ? 'active' : ''}
                onClick={() => {
                  setTab(n.name);
                  setMobile(false);
                }}
              >
                <n.icon size={19} />
                {n.name}
                {n.name === 'Projekti' && <small>{data.projects.length}</small>}
              </button>
            ))}
          </nav>
          <div className="sidebar-note">
            <Layers size={25} />
            <b>Od ideje do prave cene.</b>
            <p>
              Jasen pregled stroškov.
              <br />
              Več prostora za ustvarjanje.
            </p>
            <div>
              <i /> Vse ostane na vaši napravi
            </div>
          </div>
          <div className="sidebar-bottom">
            <span className="avatar">HS</span>
            <div>
              HS 3D<small>Osebni delovni prostor</small>
            </div>
            <button
              className="icon-button"
              aria-label="Spremeni temo"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumbs">
              <button
                className="icon-button mobile-menu"
                aria-label="Meni"
                onClick={() => setMobile(!mobile)}
              >
                {mobile ? <X size={20} /> : <Menu size={20} />}
              </button>
              <span>Delovni prostor</span>
              <ChevronRight size={14} />
              <b>{tab}</b>
            </div>
            <div className="top-actions">
              <button
                className="icon-button top-theme"
                aria-label="Spremeni temo"
                onClick={() => setDark(!dark)}
              >
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <span className="local-status">
                <i />
                {online ? 'Lokalno shranjevanje' : 'Brez povezave'}
              </span>
              {install && (
                <button
                  className="button ghost small"
                  onClick={async () => {
                    await install.prompt();
                    setInstall(null);
                  }}
                >
                  <Download size={14} />
                  Namesti
                </button>
              )}
              <span className="avatar small-avatar">HS</span>
            </div>
          </header>
          <main>
            <div className="page-title">
              <div>
                <div className="eyebrow">
                  HS 3D /{' '}
                  {tab === 'Kalkulator'
                    ? 'VAŠ NASLEDNJI PROJEKT'
                    : 'DELOVNI PROSTOR'}
                </div>
                <h1>
                  {tab === 'Kalkulator' ? 'Dobra ponudba se začne tukaj.' : tab}
                </h1>
                <p>
                  {tab === 'Kalkulator'
                    ? 'Izračunajte stroške, ovrednotite svoje delo in ustvarite jasno ponudbo.'
                    : tab === 'Projekti'
                      ? 'Vsa naročila in ponudbe, z njihovimi izvirnimi cenami.'
                      : tab === 'Nastavitve'
                        ? 'Vaše naprave, materiali in pravila poslovanja.'
                        : tab === 'Materiali in nabava'
                          ? 'Preverjeni viri, količinski popusti in vaša dejanska nabavna cena.'
                          : 'Realna slika prihodkov, stroškov in vašega časa.'}
                </p>
              </div>
              <button className="button" onClick={newOrder}>
                <Plus size={17} />
                Nov projekt
              </button>
            </div>
            {error && (
              <div className="alert">
                {error}
                {blocked && (
                  <button className="button ghost" onClick={recover}>
                    Reši podatke
                  </button>
                )}
              </div>
            )}
            {notice && (
              <div role="status" className="toast">
                <Check size={18} />
                {notice}
              </div>
            )}
            {tab === 'Kalkulator' && (
              <>
                <div className="project-strip">
                  <div>
                    <span className="status-dot" />
                    <b>{o.name}</b>
                    <span className="badge">{o.status}</span>
                  </div>
                  <div className="strip-actions">
                    <button
                      className="button ghost"
                      onClick={() => setPrint(true)}
                    >
                      <FileText size={16} />
                      PDF ponudba
                    </button>
                    <button className="button primary" onClick={store}>
                      <Save size={16} />
                      Shrani projekt
                    </button>
                  </div>
                </div>
                <div className="calculator-grid">
                  <div className="form-column">
                    <Card
                      title="Podatki o projektu"
                      icon={<FolderOpen size={18} />}
                      aside={<span className="section-number">01</span>}
                    >
                      <div className="fields two">
                        <Text
                          label="Ime projekta"
                          value={o.name}
                          onChange={(name) => update({ name })}
                        />
                        <Text
                          label="Stranka"
                          value={o.client}
                          onChange={(client) => update({ client })}
                        />
                        <Text
                          label="Datum"
                          type="date"
                          value={o.date}
                          onChange={(date) => {
                            if (/^\d{4}-\d{2}-\d{2}$/.test(date))
                              update({ date });
                          }}
                        />
                        <Select
                          label="Vrsta naročila"
                          value={o.kind}
                          options={options([
                            'Samo tisk',
                            'Skeniranje',
                            'CAD',
                            'Kombinirano',
                            'Digitalna datoteka',
                          ])}
                          onChange={(v) =>
                            update({
                              kind: v as Order['kind'],
                              ...(v === 'Digitalna datoteka' &&
                              !o.modelSaleEnabled
                                ? {
                                    modelSaleEnabled: true,
                                    modelSales: o.modelSales.length
                                      ? o.modelSales
                                      : [newModelSale()],
                                  }
                                : {}),
                            })
                          }
                        />
                      </div>
                      <div className="field">
                        <span>Način obračuna</span>
                        <div className="segmented">
                          {['Stranka', 'Prijatelj', 'Zase'].map((x) => (
                            <button
                              key={x}
                              className={o.mode === x ? 'selected' : ''}
                              onClick={() =>
                                update({ mode: x as Order['mode'] })
                              }
                            >
                              {x}
                            </button>
                          ))}
                        </div>
                      </div>
                      <details>
                        <summary>Opis in status projekta</summary>
                        <div className="fields two">
                          <label className="field">
                            <span>Opis</span>
                            <textarea
                              value={o.description}
                              maxLength={5000}
                              onChange={(e) =>
                                update({ description: e.target.value })
                              }
                            />
                          </label>
                          <Select
                            label="Status"
                            value={o.status}
                            options={options([
                              'Osnutek',
                              'Ponudba',
                              'Potrjeno',
                              'V izdelavi',
                              'Zaključeno',
                            ])}
                            onChange={(status) =>
                              update({ status: status as Order['status'] })
                            }
                          />
                        </div>
                      </details>
                    </Card>
                    {r.printing && (
                      <Card
                        title="3D-tiskanje"
                        icon={<Printer size={18} />}
                        aside={<span className="section-number">02</span>}
                      >
                        <PlatesEditor
                          order={o}
                          settings={s}
                          onChange={update}
                        />
                        {!o.platesEnabled && (
                          <>
                            <div className="fields two">
                              <Select
                                label="Tiskalnik"
                                value={o.printerId}
                                options={s.printers.map((p) => ({
                                  value: p.id,
                                  label: p.name,
                                }))}
                                onChange={(printerId) => update({ printerId })}
                              />
                              <Select
                                label="Material"
                                value={o.materialId}
                                options={s.materials.map((m) => ({
                                  value: m.id,
                                  label: m.name,
                                }))}
                                onChange={(materialId) =>
                                  update({ materialId })
                                }
                              />
                            </div>
                            <div className="material-note">
                              <span>
                                {eur(
                                  s.materials.find(
                                    (m) => m.id === o.materialId,
                                  )!.price /
                                    (s.materials.find(
                                      (m) => m.id === o.materialId,
                                    )!.mass /
                                      1000),
                                )}{' '}
                                / kg
                              </span>
                              <span>{dec(r.power)} W · ocenjena poraba</span>
                            </div>
                            {r.power === 0 && (
                              <p className="alert small">
                                Poraba ni podana. Nastavite moč tiskalnika za
                                pravilen strošek elektrike.
                              </p>
                            )}
                            <div className="fields two">
                              <Num
                                label="Število kosov"
                                value={o.quantity}
                                onChange={(quantity) => update({ quantity })}
                                min={1}
                                max={100000}
                                integer
                                suffix="kos"
                              />
                              <Num
                                label="Teža enega kosa"
                                value={o.grams}
                                onChange={(grams) => update({ grams })}
                                suffix="g"
                              />
                            </div>
                            <div className="sub-heading">
                              <Clock size={15} />
                              <b>Čas tiskanja</b>
                            </div>
                            <Toggle
                              checked={o.batch}
                              onChange={(batch) => update({ batch })}
                            >
                              Vnesi skupni čas za celotno serijo
                            </Toggle>
                            {o.batch ? (
                              <Num
                                label="Skupni čas serije"
                                value={o.batchHours}
                                onChange={(batchHours) =>
                                  update({ batchHours })
                                }
                                suffix="h"
                              />
                            ) : (
                              <div className="fields two">
                                <Num
                                  label="Ure na kos"
                                  value={o.hours}
                                  onChange={(hours) => update({ hours })}
                                  suffix="h"
                                />
                                <Num
                                  label="Minute na kos"
                                  value={o.minutes}
                                  max={59}
                                  onChange={(minutes) => update({ minutes })}
                                  suffix="min"
                                />
                              </div>
                            )}
                          </>
                        )}
                        <div className="calculation-note">
                          <Layers size={16} />
                          <span>
                            Skupaj <b>{dec(r.grams)} g</b> materiala in{' '}
                            <b>{dec(r.time)} h</b> tiskanja
                          </span>
                        </div>
                        <details>
                          <summary>
                            <SlidersHorizontal size={15} /> Dodatna poraba in
                            prilagoditve
                          </summary>
                          <div className="fields two">
                            {!o.platesEnabled && (
                              <Num
                                label="Dodatni material za celo serijo"
                                value={o.extraGrams}
                                onChange={(extraGrams) =>
                                  update({ extraGrams })
                                }
                                suffix="g"
                              />
                            )}
                            <Num
                              label="Potrošni material za projekt"
                              value={o.consumables}
                              onChange={(consumables) =>
                                update({ consumables })
                              }
                              suffix="€"
                            />
                            <Num
                              label="Drugi neposredni stroški tiska"
                              value={o.direct}
                              onChange={(direct) => update({ direct })}
                              suffix="€"
                            />
                            <Num
                              label="Rezerva za neuspele tiske"
                              value={o.reserve}
                              max={100}
                              onChange={(reserve) => update({ reserve })}
                              suffix="%"
                            />
                            <Num
                              label="Pribitek na stroške tiska"
                              value={o.markup}
                              onChange={(markup) => update({ markup })}
                              suffix="%"
                            />
                          </div>
                          <Toggle
                            checked={o.manualCost !== null}
                            onChange={(v) =>
                              update({ manualCost: v ? r.printCost : null })
                            }
                          >
                            Ročno določi celotne stroške tiskanja z rezervo
                          </Toggle>
                          {o.manualCost !== null && (
                            <Num
                              label="Ročni stroški tiska (nadomestijo izračun)"
                              value={o.manualCost}
                              onChange={(manualCost) => update({ manualCost })}
                              suffix="€"
                            />
                          )}
                        </details>
                      </Card>
                    )}
                    {r.legacyDigital && (
                      <Card
                        title="Dodatno delo za digitalne datoteke"
                        icon={<Box size={18} />}
                      >
                        <Select
                          label="Vrsta datoteke / storitve"
                          value={String(o.digitalType)}
                          options={digitalLabels.map((x, i) => ({
                            value: String(i),
                            label: x,
                          }))}
                          onChange={(v) =>
                            update({
                              digitalType: Number(v),
                              digitalRate:
                                Number(v) === 4
                                  ? s.rates.reverse
                                  : Number(v) < 2
                                    ? s.rates.clean
                                    : s.rates.cad,
                            })
                          }
                        />
                        <div className="fields two">
                          <Num
                            label="Čas izdelave ali izvoza"
                            value={o.digitalHours}
                            onChange={(digitalHours) =>
                              update({ digitalHours })
                            }
                            suffix="h"
                          />
                          <Num
                            label="Urna postavka te datoteke"
                            value={r.digitalRate}
                            onChange={(v) =>
                              update(
                                o.ownLabor
                                  ? { ownRate: v }
                                  : { digitalRate: v },
                              )
                            }
                            suffix="€/h"
                          />
                          <Num
                            label="Dodatni neposredni stroški"
                            value={o.digitalCosts}
                            onChange={(digitalCosts) =>
                              update({ digitalCosts })
                            }
                            suffix="€"
                          />
                          <Num
                            label="Doplačilo za pravice / izvorno datoteko"
                            value={o.licenseFee}
                            onChange={(licenseFee) => update({ licenseFee })}
                            suffix="€"
                          />
                        </div>
                        <Select
                          label="Obseg pravic"
                          value={o.license}
                          options={options([
                            'Samo fizični izdelek',
                            'Osebna uporaba',
                            'Komercialna uporaba',
                            'Izvorna CAD-datoteka',
                          ])}
                          onChange={(v) =>
                            update({ license: v as Order['license'] })
                          }
                        />
                        <p className="muted small">
                          Čas in ceno določite za izbrani obseg. Izvoz
                          obstoječega STEP je ločen od rekonstrukcije skena;
                          cene licenc niso predpostavljene.
                        </p>
                      </Card>
                    )}
                    <ModelSales order={o} onChange={update} />
                    <Card
                      title="Vaše delo in storitve"
                      icon={<Clock size={18} />}
                      aside={<span className="section-number">03</span>}
                    >
                      <p className="muted small">
                        Vnesite samo opravljeno delo. Vrednost 0 se ne obračuna.
                      </p>
                      <div className="labor-mode">
                        <Toggle
                          checked={o.ownLabor}
                          onChange={(ownLabor) => update({ ownLabor })}
                        >
                          Moja ura: {eur(o.ownRate)}/h namesto cenika storitev
                        </Toggle>
                        {o.ownLabor && (
                          <Num
                            label="Moja enotna urna postavka"
                            value={o.ownRate}
                            onChange={(ownRate) => update({ ownRate })}
                            suffix="€/h"
                          />
                        )}
                        <p className="muted small">
                          Velja za skeniranje, CAD, pripravo, dodelavo, dodatno
                          delo in digitalne datoteke. Izračun tiskanja ostane
                          enak. To je prodajna postavka dela; osebni zaslužek
                          upošteva še fiksne stroške in davčno rezervo.
                        </p>
                        <div className="labor-comparison">
                          <span>
                            Po ceniku{' '}
                            <b>
                              {eur(
                                calculate({ ...o, ownLabor: false }, s).total,
                              )}
                            </b>
                          </span>
                          <span>
                            Moja ura {eur(o.ownRate)}{' '}
                            <b>
                              {eur(
                                calculate({ ...o, ownLabor: true }, s).total,
                              )}
                            </b>
                          </span>
                        </div>
                      </div>
                      <div className="service-list">
                        {(o.kind === 'Digitalna datoteka' && !o.modelSaleEnabled
                          ? []
                          : o.kind === 'Skeniranje'
                            ? (['scan', 'clean'] as const)
                            : o.kind === 'CAD'
                              ? (['cad', 'reverse'] as const)
                              : serviceKeys
                        ).map((k) => (
                          <div className="service-row" key={k}>
                            <div>
                              <b>{serviceLabels[k]}</b>
                              <small>{eur(r.laborRates[k])} / h</small>
                            </div>
                            <Num
                              label={serviceLabels[k] + ' – ure'}
                              value={o.services[k]}
                              onChange={(v) =>
                                update({ services: { ...o.services, [k]: v } })
                              }
                              suffix="h"
                            />
                          </div>
                        ))}
                      </div>
                      <details>
                        <summary>Dodatno delo po lastni postavki</summary>
                        <div className="fields two">
                          <Num
                            label="Dodatno delo"
                            value={o.extraHours}
                            onChange={(extraHours) => update({ extraHours })}
                            suffix="h"
                          />
                          <Num
                            label="Cena dodatnega dela"
                            value={r.extraRate}
                            onChange={(v) =>
                              update(
                                o.ownLabor ? { ownRate: v } : { extraRate: v },
                              )
                            }
                            suffix="€/h"
                          />
                        </div>
                      </details>
                      <div className="subtotal">
                        <span>
                          Skupaj aktivnega dela{' '}
                          <small>{dec(r.activeHours)} h</small>
                        </span>
                        <b>{eur(r.work)}</b>
                      </div>
                    </Card>
                    <Card
                      title="Ostalo in popusti"
                      icon={<SlidersHorizontal size={18} />}
                    >
                      <details>
                        <summary>Prevoz, pakiranje, dostava in popust</summary>
                        <div className="fields two">
                          {(
                            [
                              ['km', 'Prevoz', 'km'],
                              ['packaging', 'Pakiranje', '€'],
                              ['delivery', 'Dostava', '€'],
                              ['other', 'Ostali stroški', '€'],
                              ['discount', 'Dodatni popust na projekt', '€'],
                            ] as const
                          ).map(([key, label, suffix]) => (
                            <Num
                              key={key}
                              label={label}
                              value={o[key]}
                              suffix={suffix}
                              onChange={(v) => update({ [key]: v })}
                            />
                          ))}
                        </div>
                      </details>
                      <Select
                        label="Zaokroži ponudbo navzgor (pred DDV)"
                        value={String(o.roundTo)}
                        options={[
                          { value: '0', label: 'Brez zaokroževanja' },
                          ...[1, 5, 10].map((n) => ({
                            value: String(n),
                            label: 'Na ' + n + ' €',
                          })),
                        ]}
                        onChange={(v) => update({ roundTo: Number(v) })}
                      />
                      {o.mode === 'Prijatelj' && (
                        <>
                          <Num
                            label="Prijateljski popust samo na delo"
                            value={o.friend}
                            max={100}
                            onChange={(friend) => update({ friend })}
                            suffix="%"
                          />
                          <p className="muted small">
                            Material, tiskanje, prevoz in dostava niso samodejno
                            znižani. Dodaten popust v EUR prilagodi celoten
                            projekt.
                          </p>
                        </>
                      )}
                      <Toggle
                        checked={o.vatEnabled}
                        onChange={(vatEnabled) => update({ vatEnabled })}
                      >
                        Obračunaj DDV ({dec(s.vat)} %)
                      </Toggle>
                      <p className="muted small">
                        {o.mode === 'Zase'
                          ? 'Zasebni način prikazuje stroške brez prodajnega DDV.'
                          : 'Privzeto brez obračunanega DDV. Stopnjo prilagodite v nastavitvah.'}
                      </p>
                    </Card>
                    <Card title="Dejanska poraba" icon={<Check size={18} />}>
                      <details>
                        <summary>Primerjaj oceno z izvedbo</summary>
                        <p className="muted small">
                          Vključite le podatke, ki ste jih že izmerili. Prazno
                          pomeni še nezabeleženo.
                        </p>
                        {(
                          [
                            ['actualHours', 'Dejanski čas tiskanja', 'h'],
                            ['actualGrams', 'Dejanska skupna poraba', 'g'],
                            ['actualWork', 'Dejansko aktivno delo', 'h'],
                          ] as const
                        ).map(([key, label, suffix]) => (
                          <div key={key}>
                            <Toggle
                              checked={o[key] !== null}
                              onChange={(v) => update({ [key]: v ? 0 : null })}
                            >
                              {label}
                            </Toggle>
                            {o[key] !== null && (
                              <Num
                                label={label}
                                value={o[key]}
                                suffix={suffix}
                                onChange={(v) => update({ [key]: v })}
                              />
                            )}
                          </div>
                        ))}
                        <div className="detail-lines">
                          <p>
                            <span>Razlika tiskanja</span>
                            <b>
                              {o.actualHours === null
                                ? 'Ni vnosa'
                                : dec(o.actualHours - r.time) + ' h'}
                            </b>
                          </p>
                          <p>
                            <span>Razlika materiala</span>
                            <b>
                              {o.actualGrams === null
                                ? 'Ni vnosa'
                                : dec(o.actualGrams - r.grams) + ' g'}
                            </b>
                          </p>
                          <p>
                            <span>Razlika aktivnega dela</span>
                            <b>
                              {o.actualWork === null
                                ? 'Ni vnosa'
                                : dec(o.actualWork - r.activeHours) + ' h'}
                            </b>
                          </p>
                        </div>
                      </details>
                    </Card>
                  </div>
                  <aside className="results-column">
                    <section className="price-card">
                      <div className="price-label">
                        {o.mode === 'Zase' ? 'DEJANSKI STROŠKI' : 'KONČNA CENA'}
                        <span>
                          {o.mode === 'Zase'
                            ? 'Zase'
                            : o.vatEnabled
                              ? 'z DDV'
                              : 'brez DDV'}
                        </span>
                      </div>
                      <div className="big-price">{eur(r.total)}</div>
                      <p>
                        {o.mode === 'Zase'
                          ? 'Vaš čas je prikazan ločeno.'
                          : 'Pregledna cena. Ovrednoteno delo.'}
                      </p>
                      <div className="price-divider" />
                      <div className="unit-price">
                        <span>
                          {r.digital && o.modelSaleEnabled
                            ? 'Povprečna cena datoteke / paketa'
                            : 'Cena na kos'}{' '}
                          <small>
                            {r.quantity}{' '}
                            {r.digital && o.modelSaleEnabled
                              ? 'datotek / paketov'
                              : 'kos'}
                          </small>
                        </span>
                        <b>{eur(r.unit)}</b>
                      </div>
                      <div className="price-decoration">
                        <Box size={130} strokeWidth={0.7} />
                      </div>
                    </section>
                    <div className="mini-stats">
                      <div className="card">
                        <Printer size={18} />
                        <span>STROŠKI TISKANJA</span>
                        <b>{eur(r.printCost)}</b>
                        <small>Z vključeno rezervo</small>
                      </div>
                      <div className="card">
                        <Clock size={18} />
                        <span>VREDNOST STORITEV</span>
                        <b>{eur(r.work)}</b>
                        <small>{dec(r.activeHours)} h aktivnega dela</small>
                      </div>
                    </div>
                    <Card title="Pregled izračuna">
                      <div className="detail-lines">
                        {[
                          ['Material', r.material],
                          ['Elektrika', r.electricity],
                          ['Amortizacija in servis', r.depreciation],
                          [
                            'Potrošni + neposredni stroški',
                            r.consumables + r.direct,
                          ],
                          ['Rezerva za neuspele tiske', r.reserve],
                          ...(o.manualCost !== null && r.printing
                            ? [
                                [
                                  'Ročna prilagoditev',
                                  r.printCost - r.base - r.reserve,
                                ],
                              ]
                            : []),
                          ['Pribitek tiskanja', r.markup],
                          ['Storitve', r.work],
                          ['Prodaja STL / STEP in modelov', r.fileSale],
                          ['Pravice digitalne datoteke', r.license],
                          ['Prevoz', r.travel],
                          ['Dodatni stroški in dostava', r.extras],
                          ['Popust', -r.discount],
                          ...(r.rounding > 0
                            ? [['Zaokroževanje navzgor', r.rounding]]
                            : []),
                          [
                            'Dopolnitev do minimalnega naročila',
                            r.minimumTopup,
                          ],
                        ].map(([label, value]) => (
                          <p key={String(label)}>
                            <span>{label}</span>
                            <b>{eur(Number(value))}</b>
                          </p>
                        ))}
                        <p className="line-total">
                          <span>
                            {o.mode === 'Zase' ? 'Stroški' : 'Cena brez DDV'}
                          </span>
                          <b>{eur(r.net)}</b>
                        </p>
                        <p>
                          <span>
                            DDV {o.vatEnabled ? `(${dec(s.vat)} %)` : ''}
                          </span>
                          <b>{eur(r.vat)}</b>
                        </p>
                      </div>
                    </Card>
                    <section className="earnings-card">
                      <div>
                        <ArrowUpRight size={21} />
                        <span>
                          {o.mode === 'Zase'
                            ? 'INFORMATIVNA VREDNOST ČASA'
                            : 'PREDVIDENI OSEBNI ZASLUŽEK'}
                        </span>
                      </div>
                      <b>{eur(o.mode === 'Zase' ? r.work : r.earnings)}</b>
                      <p>
                        {o.mode === 'Zase'
                          ? `${dec(r.activeHours)} h po ceniku storitev`
                          : `Po neposrednih stroških, fiksnih stroških in davčni rezervi.`}
                      </p>
                      {o.mode !== 'Zase' && (
                        <div className="detail-lines">
                          <p>
                            <span>Prispevek pred fiksnimi stroški</span>
                            <strong>{eur(r.contribution)}</strong>
                          </p>
                          <p>
                            <span>Razporejeni fiksni stroški</span>
                            <strong>− {eur(r.fixed)}</strong>
                          </p>
                          <p>
                            <span>
                              Davčna rezerva ({dec(s.tax)} % prihodkov)
                            </span>
                            <strong>− {eur(r.tax)}</strong>
                          </p>
                          <p>
                            <span>Zaslužek na aktivno uro</span>
                            <strong>
                              {r.activeHours
                                ? eur(r.hourly) + '/h'
                                : 'Brez aktivnih ur'}
                            </strong>
                          </p>
                          <p>
                            <span>Bruto marža projekta</span>
                            <strong>{dec(r.margin)} %</strong>
                          </p>
                        </div>
                      )}
                      {o.mode !== 'Zase' &&
                        r.activeHours > 0 &&
                        r.hourly < s.target && (
                          <div className="warning">
                            Pod ciljem {eur(s.target)}/h pri{' '}
                            {dec(s.monthlyHours)} obračunljivih urah na mesec.
                          </div>
                        )}
                    </section>
                    <Charts r={r} />
                    <div className="snapshot-note">
                      <Save size={15} />
                      <span>
                        Projekt uporablja svoj cenik.{' '}
                        <button
                          onClick={() => {
                            if (
                              o.plates.some(
                                (plate) =>
                                  (plate.printerId &&
                                    !data.settings.printers.some(
                                      (p) => p.id === plate.printerId,
                                    )) ||
                                  (plate.materialId &&
                                    !data.settings.materials.some(
                                      (m) => m.id === plate.materialId,
                                    )),
                              )
                            ) {
                              setNotice(
                                'Aktualni cenik nima vseh tiskalnikov ali materialov plošč. Projekt ohranja svoj cenik; najprej dodaj manjkajoče vnose.',
                              );
                              return;
                            }
                            setData((d) => ({
                              ...d,
                              draftSettings: structuredClone(d.settings),
                              draft: {
                                ...d.draft,
                                printerId: d.settings.printers.some(
                                  (p) => p.id === o.printerId,
                                )
                                  ? o.printerId
                                  : d.settings.printers[0].id,
                                materialId: d.settings.materials.some(
                                  (m) => m.id === o.materialId,
                                )
                                  ? o.materialId
                                  : d.settings.materials[0].id,
                              },
                            }));
                            setNotice('Uporabljen je aktualni cenik.');
                          }}
                        >
                          Uporabi aktualni cenik
                        </button>
                      </span>
                    </div>
                  </aside>
                </div>
              </>
            )}
            {tab === 'Projekti' && (
              <ProjectList
                projects={data.projects}
                onOpen={open}
                onNew={newOrder}
                onDelete={(p) => {
                  if (confirm('Izbrišem shranjeni projekt?'))
                    setData((d) => ({
                      ...d,
                      projects: d.projects.filter(
                        (x) => x.order.id !== p.order.id,
                      ),
                    }));
                }}
                onStatus={(p, status) => {
                  setData((d) => ({
                    ...d,
                    projects: d.projects.map((x) =>
                      x.order.id === p.order.id
                        ? {
                            ...x,
                            order: { ...x.order, status },
                            savedAt: new Date().toISOString(),
                          }
                        : x,
                    ),
                    draft:
                      d.draft.id === p.order.id
                        ? { ...d.draft, status }
                        : d.draft,
                  }));
                  setNotice('Status projekta je shranjen.');
                }}
              />
            )}
            {tab === 'Poslovni pregled' && (
              <Dashboard
                projects={data.projects}
                settings={data.settings}
                onPlanRate={(planRate) =>
                  setData((d) => ({
                    ...d,
                    settings: { ...d.settings, planRate },
                  }))
                }
              />
            )}
            {tab === 'Nastavitve' && (
              <SettingsEditor
                settings={data.settings}
                onSave={(settings) => {
                  setData((d) => ({ ...d, settings }));
                  setNotice(
                    'Nastavitve so shranjene. Novi projekti uporabijo novi cenik.',
                  );
                }}
                backup={backup}
                restore={restore}
              />
            )}
            {tab === 'Materiali in nabava' && (
              <MaterialCatalog
                materials={data.settings.materials}
                onAdd={(material) => {
                  setData((d) => ({
                    ...d,
                    settings: {
                      ...d.settings,
                      materials: [...d.settings.materials, material],
                    },
                  }));
                  setNotice(
                    'Material je dodan v vaš cenik. Pri odprtem projektu kliknite »Uporabi aktualni cenik«.',
                  );
                }}
                onPurchase={(id, price, mass, label) =>
                  setData((d) => ({
                    ...d,
                    settings: {
                      ...d.settings,
                      materials: d.settings.materials.map((m) =>
                        m.id === id
                          ? {
                              ...m,
                              price,
                              mass,
                              purchases: [
                                ...m.purchases,
                                { label, price, mass },
                              ],
                            }
                          : m,
                      ),
                    },
                  }))
                }
              />
            )}
            <footer>
              <span>
                HS 3D <i /> Vaša ideja. Vaša vrednost.
              </span>
              <span>Podatki na tej napravi · različica 1.0</span>
            </footer>
          </main>
        </div>
      </div>
      <Quote order={o} settings={s} r={r} />
    </>
  );
}

function Dashboard({
  projects,
  settings: s,
  onPlanRate,
}: {
  projects: Project[];
  settings: Settings;
  onPlanRate: (rate: number) => void;
}) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const selected = projects.filter(
    (p) =>
      p.order.date.startsWith(month) &&
      p.order.status === 'Zaključeno' &&
      p.order.mode !== 'Zase',
  );
  const results = selected.map((p) => calculate(p.order, p.snapshot));
  const revenue = results.reduce((a, r) => a + r.net, 0),
    costs = results.reduce((a, r) => a + r.actualCosts, 0),
    tax = results.reduce((a, r) => a + r.tax, 0),
    hours = selected.reduce(
      (a, p, i) => a + (p.order.actualWork ?? results[i].activeHours),
      0,
    );
  const earned = revenue - costs - tax - s.fixed;
  return (
    <>
      <div className="dashboard-filter">
        <Text
          label="Izbrani mesec"
          type="month"
          value={month}
          onChange={setMonth}
        />
        <span className="muted">
          Vključeni so zaključeni projekti po datumu projekta; prihodki brez
          DDV.
        </span>
      </div>
      <div className="dashboard-stats">
        {[
          ['Prihodki', eur(revenue)],
          ['Stroški z davčno rezervo', eur(costs + tax + s.fixed)],
          ['Predvideni rezultat', eur(earned)],
          ['Obračunljive ure', dec(hours) + ' h'],
        ].map(([label, value]) => (
          <div className="card" key={label}>
            <span className="muted">{label}</span>
            <h2>{value}</h2>
          </div>
        ))}
      </div>
      <Card title="Mesečni poslovni pregled">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={[
              { name: 'Prihodki', value: revenue },
              { name: 'Neposredni stroški', value: costs },
              { name: 'Fiksni stroški', value: s.fixed },
              { name: 'Davčna rezerva', value: tax },
              { name: 'Rezultat', value: earned },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => eur(Number(v))} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#247b60" />
          </BarChart>
        </ResponsiveContainer>
        <p className="muted">
          Fiksni mesečni stroški so odšteti enkrat v celoti. Davčna rezerva
          uporablja posnetek vsakega projekta. Razporejeni fiksni stroški iz
          kalkulatorja se tu ne odštevajo ponovno.
        </p>
        <p>
          {hours
            ? `Rezultat na aktivno uro: ${eur(earned / hours)}. Cilj: ${eur(s.target)}/h.`
            : 'Ta mesec še ni zabeleženih obračunljivih ur.'}
        </p>
        {earned < s.target * hours && (
          <div className="warning">
            Načrtovani osebni zaslužek ne dosega ciljne postavke.
          </div>
        )}
        <p className="muted small">
          Prihodki in stroški so ocene iz ponudb. Dejanski aktivni čas, kadar je
          vnesen, nadomesti oceno ur. To ni evidenca plačil ali davčni obračun.
        </p>
      </Card>
      <div className="monthly-plan-section">
        <MonthlyPlan settings={s} onRateChange={onPlanRate} />
      </div>
    </>
  );
}

function SettingsEditor({
  settings,
  onSave,
  backup,
  restore,
}: {
  settings: Settings;
  onSave: (s: Settings) => void;
  backup: () => void;
  restore: (f?: File) => void;
}) {
  const [s, setS] = useState(() => structuredClone(settings));
  useEffect(() => setS(structuredClone(settings)), [settings]);
  const [message, setMessage] = useState('');
  const put = (p: Partial<Settings>) => setS((v) => ({ ...v, ...p }));
  return (
    <div className="settings-layout">
      <div className="settings-toolbar">
        <p className="muted">
          Spremembe veljajo za nove projekte. Obstoječe posodobite iz
          kalkulatorja.
        </p>
        <button
          className="button primary"
          onClick={() => {
            const parsed = settingsSchema.safeParse(s);
            if (parsed.success) {
              onSave(parsed.data);
              setMessage('Nastavitve so shranjene.');
            } else
              setMessage(
                'Preverite imena, pozitivno življenjsko dobo, mase in mesečne ure.',
              );
          }}
        >
          <Save size={16} />
          Shrani nastavitve
        </button>
      </div>
      {message && (
        <p role="status" className="calculation-note">
          {message}
        </p>
      )}
      <Card title="Poslovne nastavitve">
        <div className="fields three">
          {(
            [
              ['electricity', 'Cena elektrike', '€/kWh'],
              ['km', 'Cena prevoza', '€/km'],
              ['minimum', 'Minimalno naročilo', '€'],
              ['roundTo', 'Privzeto zaokroževanje navzgor (0 = brez)', '€'],
              ['markup', 'Privzeti pribitek tiska', '%'],
              ['reserve', 'Privzeta rezerva tiska', '%'],
              ['friend', 'Popust za prijatelje na delo', '%'],
              ['target', 'Ciljni osebni zaslužek', '€/h'],
              ['monthlyHours', 'Obračunljive ure na mesec', 'h'],
              ['fixed', 'Mesečni prispevki in administracija', '€'],
              ['tax', 'Davčna rezerva od prihodkov', '%'],
              ['vat', 'Stopnja DDV', '%'],
            ] as const
          ).map(([key, label, suffix]) => (
            <Num
              key={key}
              label={label}
              value={s[key] ?? 0}
              suffix={suffix}
              min={key === 'monthlyHours' ? 0.01 : 0}
              max={
                ['reserve', 'friend', 'tax', 'vat'].includes(key) ? 100 : 1e9
              }
              onChange={(v) => put({ [key]: v })}
            />
          ))}
        </div>
        <p className="muted small">
          138,01 € je vaša začetna predpostavka mesečnih stroškov. Davčna
          rezerva je ročni odstotek prihodkov brez DDV, ne avtomatski zakonski
          izračun. Začetnih 0 % pomeni brez rezerve; določite svojo vrednost.
        </p>
        <Text
          label="Podatki ponudnika za ponudbo (naziv, naslov, kontakt)"
          value={s.business}
          onChange={(business) => put({ business })}
        />
      </Card>
      <Card title="Urne postavke storitev">
        <div className="fields three">
          {serviceKeys.map((k) => (
            <Num
              key={k}
              label={serviceLabels[k]}
              value={s.rates[k]}
              suffix="€/h"
              onChange={(v) => put({ rates: { ...s.rates, [k]: v } })}
            />
          ))}
        </div>
      </Card>
      <Card
        title="Tiskalniki"
        aside={
          <button
            className="button ghost"
            onClick={() =>
              put({
                printers: [
                  ...s.printers,
                  {
                    id: uid(),
                    name: 'Nov tiskalnik',
                    price: 0,
                    life: 3000,
                    service: 0,
                    power: {},
                    fallbackPower: 0,
                  },
                ],
              })
            }
          >
            <Plus size={15} />
            Dodaj
          </button>
        }
      >
        <p className="muted small">
          Amortizacija = (nabava + servis) / življenjska doba. Moči so ocene; 0
          W pomeni, da podatek manjka. Bambu ASA: vaša začetna ocena 450 W. Za
          ostale kombinacije vnesite meritve.
        </p>
        {s.printers.map((p, i) => {
          const edit = (patch: Partial<typeof p>) =>
            put({
              printers: s.printers.map((x, j) =>
                j === i ? { ...x, ...patch } : x,
              ),
            });
          return (
            <details key={p.id} className="editor-item">
              <summary>
                {p.name}
                <span>{eur((p.price + p.service) / p.life)}/h</span>
              </summary>
              <div className="fields three">
                <Text
                  label="Naziv tiskalnika"
                  value={p.name}
                  onChange={(name) => edit({ name })}
                />
                <Num
                  label="Nabavna cena"
                  value={p.price}
                  suffix="€"
                  onChange={(price) => edit({ price })}
                />
                <Num
                  label="Življenjska doba"
                  value={p.life}
                  min={0.01}
                  suffix="h"
                  onChange={(life) => edit({ life })}
                />
                <Num
                  label="Servis v življenjski dobi"
                  value={p.service}
                  suffix="€"
                  onChange={(service) => edit({ service })}
                />
                <Num
                  label="Splošna ocenjena moč"
                  value={p.fallbackPower}
                  suffix="W"
                  onChange={(fallbackPower) => edit({ fallbackPower })}
                />
              </div>
              <p className="muted small">
                Moč po materialih (ima prednost pred splošno):
              </p>
              <div className="fields three">
                {[...new Set(s.materials.map((m) => m.type))].map((type) => (
                  <Num
                    key={type}
                    label={type}
                    value={p.power[type] ?? p.fallbackPower}
                    suffix="W"
                    onChange={(v) => edit({ power: { ...p.power, [type]: v } })}
                  />
                ))}
              </div>
            </details>
          );
        })}
      </Card>
      <Card
        title="Materiali in nabavne cene"
        aside={
          <button
            className="button ghost"
            onClick={() =>
              put({
                materials: [
                  ...s.materials,
                  {
                    id: uid(),
                    name: 'Nov material',
                    maker: '',
                    type: 'PLA',
                    mass: 1000,
                    price: 0,
                    drying: null,
                    purchases: [],
                  },
                ],
              })
            }
          >
            <Plus size={15} />
            Dodaj
          </button>
        }
      >
        <p className="muted small">
          Neto masa ne vključuje teže praznega koluta. Izbrana nabava določa
          trenutno ceno; zgodovinske ponudbe ostanejo nespremenjene.
        </p>
        {s.materials.map((m, i) => {
          const edit = (patch: Partial<typeof m>) =>
            put({
              materials: s.materials.map((x, j) =>
                j === i ? { ...x, ...patch } : x,
              ),
            });
          return (
            <details className="editor-item" key={m.id}>
              <summary>
                {m.name}
                <span>{eur(m.price / (m.mass / 1000))}/kg</span>
              </summary>
              <div className="fields three">
                <Text
                  label="Naziv materiala"
                  value={m.name}
                  onChange={(name) => edit({ name })}
                />
                <Text
                  label="Proizvajalec"
                  value={m.maker}
                  onChange={(maker) => edit({ maker })}
                />
                <Text
                  label="Vrsta (ASA, PLA, smola …)"
                  value={m.type}
                  onChange={(type) => edit({ type })}
                />
                <Num
                  label="Neto masa koluta / embalaže"
                  value={m.mass}
                  min={0.01}
                  suffix="g"
                  onChange={(mass) => edit({ mass })}
                />
                <Num
                  label="Plačana cena embalaže"
                  value={m.price}
                  suffix="€"
                  onChange={(price) => edit({ price })}
                />
                <Num
                  label="Temperatura sušenja (0 = ni določena)"
                  value={m.drying ?? 0}
                  suffix="°C"
                  onChange={(drying) => edit({ drying: drying || null })}
                />
              </div>
              <div className="purchase-list">
                {m.purchases.map((p, j) => (
                  <div key={j}>
                    <Text
                      label="Naziv nabavne cene"
                      value={p.label}
                      onChange={(label) =>
                        edit({
                          purchases: m.purchases.map((x, k) =>
                            j === k ? { ...x, label } : x,
                          ),
                        })
                      }
                    />
                    <Num
                      label="Cena"
                      value={p.price}
                      suffix="€"
                      onChange={(price) =>
                        edit({
                          purchases: m.purchases.map((x, k) =>
                            j === k ? { ...x, price } : x,
                          ),
                        })
                      }
                    />
                    <Num
                      label="Neto masa"
                      value={p.mass}
                      min={0.01}
                      suffix="g"
                      onChange={(mass) =>
                        edit({
                          purchases: m.purchases.map((x, k) =>
                            j === k ? { ...x, mass } : x,
                          ),
                        })
                      }
                    />
                    <button
                      className="button ghost"
                      onClick={() => edit({ price: p.price, mass: p.mass })}
                    >
                      Uporabi
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="button ghost"
                onClick={() =>
                  edit({
                    purchases: [
                      ...m.purchases,
                      { label: 'Nova nabava', price: m.price, mass: m.mass },
                    ],
                  })
                }
              >
                <Plus size={14} />
                Shrani novo nabavno ceno
              </button>
            </details>
          );
        })}
      </Card>
      <Card title="Varnostne kopije">
        <p className="muted">
          Podatki so shranjeni samo v tem brskalniku. Redno prenesite kopijo, še
          posebej pred menjavo naprave ali brisanjem podatkov brskalnika.
        </p>
        <div className="backup-actions">
          <button className="button" onClick={backup}>
            <Download size={16} />
            Izvozi vse v JSON
          </button>
          <label className="button upload">
            <Upload size={16} />
            Obnovi iz JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                restore(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <p className="muted small">
          Obnova zamenja vse podatke. Predhodno stanje se ob uspešni validaciji
          samodejno prenese v JSON.
        </p>
      </Card>
    </div>
  );
}

function Quote({
  order: o,
  settings: s,
  r,
}: {
  order: Order;
  settings: Settings;
  r: Result;
}) {
  return (
    <article className="print-quote">
      <header>
        <div>
          <h1>HS 3D</h1>
          <p>3D-tiskanje · skeniranje · CAD</p>
          <p>{s.business}</p>
        </div>
        <div>
          <h2>PONUDBA</h2>
          <p>Št. HS-{o.id.slice(0, 8)}</p>
          <p>Datum: {new Date(o.date).toLocaleDateString('sl-SI')}</p>
        </div>
      </header>
      <hr />
      <h2>{o.name}</h2>
      <p>Stranka: {o.client || '—'}</p>
      <p className="quote-description">{o.description}</p>
      <table>
        <thead>
          <tr>
            <th>Postavka</th>
            <th>Količina</th>
            <th>Znesek</th>
          </tr>
        </thead>
        <tbody>
          {r.printing && (
            <tr>
              <td>
                3D-tiskanje ·{' '}
                {o.platesEnabled
                  ? 'Po tiskalnih ploščah'
                  : s.materials.find((m) => m.id === o.materialId)?.name}
                <small>
                  {o.platesEnabled
                    ? r.plateDetails
                        .map(
                          (p) =>
                            `${p.name || 'Plošča'} · ${p.printer} · ${p.materialName} · ${p.quantity} kos · ${dec(p.grams)} g · ${dec(p.time)} h`,
                        )
                        .join('; ')
                    : s.printers.find((p) => p.id === o.printerId)?.name}
                </small>
              </td>
              <td>{r.quantity} kos</td>
              <td>{eur(o.mode === 'Zase' ? r.printCost : r.printSale)}</td>
            </tr>
          )}
          {o.mode !== 'Zase' &&
            serviceKeys
              .filter(
                (k) =>
                  o.services[k] > 0 &&
                  (o.kind === 'Kombinirano' ||
                    (o.kind === 'Digitalna datoteka' && o.modelSaleEnabled) ||
                    o.kind === 'Samo tisk' ||
                    (o.kind === 'Skeniranje' &&
                      ['scan', 'clean'].includes(k)) ||
                    (o.kind === 'CAD' && ['cad', 'reverse'].includes(k))),
              )
              .map((k) => (
                <tr key={k}>
                  <td>{serviceLabels[k]}</td>
                  <td>
                    {dec(o.services[k])} h × {eur(r.laborRates[k])}
                  </td>
                  <td>{eur(o.services[k] * r.laborRates[k])}</td>
                </tr>
              ))}
          {r.legacyDigital && o.mode !== 'Zase' && (
            <tr>
              <td>
                {digitalLabels[o.digitalType]}
                <small>{o.license}</small>
              </td>
              <td>
                {dec(o.digitalHours)} h × {eur(r.digitalRate)}
              </td>
              <td>{eur(o.digitalHours * r.digitalRate)}</td>
            </tr>
          )}
          {o.modelSaleEnabled &&
            o.mode !== 'Zase' &&
            o.modelSales.map((row) => (
              <tr key={row.id}>
                <td>
                  Prodaja modela · {row.format}
                  {row.name && ' · ' + row.name}
                  <small>{row.rights}</small>
                </td>
                <td>1 datoteka / paket</td>
                <td>{eur(row.price)}</td>
              </tr>
            ))}
          {o.extraHours > 0 && o.mode !== 'Zase' && (
            <tr>
              <td>Dodatno delo</td>
              <td>{dec(o.extraHours)} h</td>
              <td>{eur(o.extraHours * r.extraRate)}</td>
            </tr>
          )}
          {r.license > 0 && o.mode !== 'Zase' && (
            <tr>
              <td>Pravice / izvorna datoteka</td>
              <td>1</td>
              <td>{eur(r.license)}</td>
            </tr>
          )}
          {r.travel > 0 && (
            <tr>
              <td>Prevoz</td>
              <td>{dec(o.km)} km</td>
              <td>{eur(r.travel)}</td>
            </tr>
          )}
          {r.extras > 0 && (
            <tr>
              <td>Pakiranje, dostava in dodatni stroški</td>
              <td>1</td>
              <td>{eur(r.extras)}</td>
            </tr>
          )}
          {r.discount > 0 && o.mode !== 'Zase' && (
            <tr>
              <td>Popust</td>
              <td>1</td>
              <td>−{eur(r.discount)}</td>
            </tr>
          )}
          {r.rounding > 0 && o.mode !== 'Zase' && (
            <tr>
              <td>Zaokroževanje navzgor</td>
              <td>1</td>
              <td>{eur(r.rounding)}</td>
            </tr>
          )}
          {r.minimumTopup > 0 && (
            <tr>
              <td>Dopolnitev do minimalnega naročila</td>
              <td>1</td>
              <td>{eur(r.minimumTopup)}</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="quote-totals">
        <p>
          Skupaj brez DDV <b>{eur(r.net)}</b>
        </p>
        <p>
          DDV {o.vatEnabled ? `(${dec(s.vat)} %)` : 'ni obračunan'}{' '}
          <b>{eur(r.vat)}</b>
        </p>
        <h2>
          Skupaj <b>{eur(r.total)}</b>
        </h2>
      </div>
      <footer>
        {o.mode === 'Zase'
          ? 'Informativni obračun lastnih stroškov.'
          : 'Ponudba je informativna. Obseg, rok dobave in pravice uporabe se dogovorijo ob potrditvi.'}
        <br />
        HS 3D · {o.kind}
      </footer>
    </article>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
