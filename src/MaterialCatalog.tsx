import { useState } from 'react';
import { ExternalLink, Plus, ShoppingBag, Check } from 'lucide-react';
import {
  catalog,
  checkedAt,
  catalogMaterial,
  type CatalogItem,
} from './catalog';
import { eur, dec, uid, type Material } from './model';
import { purchaseCost } from './procurement';
import { Num, Select, Card, Toggle } from './ui';

export function MaterialCatalog({
  materials,
  onAdd,
  onPurchase,
}: {
  materials: Material[];
  onAdd: (m: Material) => void;
  onPurchase: (id: string, price: number, mass: number, label: string) => void;
}) {
  const [maker, setMaker] = useState('Vsi');
  const [type, setType] = useState('Vsi');
  const [selected, setSelected] = useState(catalog[0]);
  const [price, setPrice] = useState(catalog[0].price ?? 0);
  const [mass, setMass] = useState(catalog[0].mass);
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [target, setTarget] = useState(materials[0].id);
  const [feedback, setFeedback] = useState('');
  const choose = (item: CatalogItem) => {
    setSelected(item);
    setPrice(item.price ?? 0);
    setMass(item.mass);
    setDiscount(0);
    setConfirmed(false);
    setFeedback('');
  };
  const r = purchaseCost(price, mass, quantity, discount, shipping);
  const discountFor = (n: number) =>
    n >= 20
      ? 40
      : n >= 12
        ? (selected.discount12 ?? 35)
        : n >= 6
          ? 30
          : n >= 3
            ? 20
            : 5;
  return (
    <div className="catalog-layout">
      <section className="catalog-intro">
        <div>
          <ShoppingBag size={25} />
          <h2>Materiali in pametna nabava</h2>
        </div>
        <p>
          PLA, PETG, ASA, ABS, PC, najlon in PCTG na enem mestu. Pregled virov:{' '}
          <b>25. 10. 2026</b>. To je shranjen pregled ponudbe, brez samodejnega
          sledenja cenam.
        </p>
        <p className="muted small">
          Referenčne cene niso potrdilo o današnji ceni ali zalogi. Uporabite
          končni znesek svoje košarice in pravo neto maso. Za izračun lastnih
          stroškov malega nezavezanca vnesite plačano ceno z nabavnim DDV.
        </p>
      </section>
      <div className="catalog-filters">
        <Select
          label="Proizvajalec"
          value={maker}
          onChange={setMaker}
          options={['Vsi', 'Bambu Lab', 'Prusa', 'Plastika Trček'].map((x) => ({
            label: x,
            value: x,
          }))}
        />
        <Select
          label="Vrsta materiala"
          value={type}
          onChange={setType}
          options={[
            'Vsi',
            'PLA',
            'PETG',
            'ASA',
            'ABS',
            'PC',
            'Nylon',
            'PCTG',
          ].map((x) => ({ label: x, value: x }))}
        />
      </div>
      <div className="catalog-grid">
        {catalog
          .filter(
            (x) =>
              (maker === 'Vsi' || x.maker === maker) &&
              (type === 'Vsi' || x.type === type),
          )
          .map((item) => (
            <article
              key={item.id}
              className={
                'card material-card ' +
                (selected.id === item.id ? 'selected-material' : '')
              }
            >
              <div className="material-heading">
                <span className="badge">{item.type}</span>
                <span className="muted small">{item.maker}</span>
              </div>
              <h2>{item.name}</h2>
              <div className="material-price">
                {item.price === null
                  ? 'Vnesite ceno'
                  : eur(item.price / (item.mass / 1000))}
                {item.price !== null && <small>/ kg</small>}
              </div>
              <p className="muted small">
                {dec(item.mass)} g{' '}
                {item.price !== null ? `· ${eur(item.price)} / kolut` : ''} ·{' '}
                {item.priceKind === 'user' ? 'Vaša začetna cena' : 'Referenca'}
              </p>
              <p className="material-description muted small">{item.note}</p>
              <div className="material-buttons">
                <a
                  className="button ghost"
                  href={item.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  Uradni vir
                  <ExternalLink size={13} />
                </a>
                <button
                  className="button"
                  onClick={() => {
                    choose(item);
                    document
                      .getElementById('purchase-calculator')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  Nabava
                </button>
              </div>
            </article>
          ))}
      </div>
      <p className="muted small">
        Bambu PCTG ter Prusament ABS in PCTG v pregledanih uradnih virih niso
        bili potrjeni. Zato zanje ni izmišljenih izdelkov ali cen. Pri najlonu
        primerjajte tudi oznako PA11, PA12 oziroma PA6-GF; to niso enaki
        materiali.
      </p>
      <div id="purchase-calculator">
        <Card
          title="Izračun akcijske ali količinske nabave"
          icon={<ShoppingBag size={18} />}
        >
          <Select
            label="Material za primerjavo"
            value={selected.id}
            options={catalog.map((x) => ({ value: x.id, label: x.name }))}
            onChange={(id) => choose(catalog.find((x) => x.id === id)!)}
          />
          <div className="fields three procurement-fields">
            <Num
              label="Redna ali izhodiščna cena koluta"
              value={price}
              onChange={setPrice}
              suffix="€"
            />
            <Num
              label="Neto masa enega koluta"
              value={mass}
              min={0.01}
              onChange={setMass}
              suffix="g"
            />
            <Num
              label="Število kolutov v tej nabavi"
              value={quantity}
              min={1}
              max={100000}
              integer
              onChange={setQuantity}
              suffix="kos"
            />
            <Num
              label="En sam potrjeni popust"
              value={discount}
              max={100}
              onChange={setDiscount}
              suffix="%"
            />
            <Num
              label="Dostava celotne nabave"
              value={shipping}
              onChange={setShipping}
              suffix="€"
            />
          </div>
          <p className="muted small">
            Če ste vnesli že znižano ceno, pustite popust 0 %. Popust se
            obračuna samo enkrat, dostava pa se razporedi med vse kilograme. Za
            mešano košarico dostavo tej skupini razporedite ročno.
          </p>
          {selected.bulk && (
            <div className="bulk-presets">
              <p>Objavljeni pragovi za ta izdelek, preverite v košarici:</p>
              {[1, 3, 6, 12, 20].map((n) => (
                <button
                  className="button ghost"
                  key={n}
                  onClick={() => {
                    setQuantity(n);
                    setDiscount(discountFor(n));
                    setConfirmed(false);
                  }}
                >
                  {n}+ kos · −{discountFor(n)} %
                </button>
              ))}
              <p className="muted small">
                Pri 12 kosih izdelki navajajo {selected.discount12} %. Splošna
                stran navaja drugačen prag; veljavno ceno potrdi izbrana
                košarica. Prednastavitev ni zagotovljen popust.
              </p>
            </div>
          )}
          {selected.id === 'trcek-nylon' && (
            <button
              className="button ghost"
              onClick={() => {
                setPrice(33.99);
                setDiscount(0);
                setConfirmed(false);
              }}
            >
              Uporabi opaženo akcijsko ceno 33,99 € (brez dodatnega popusta)
            </button>
          )}
          <div className="dashboard-stats procurement-results">
            {[
              ['Skupaj z dostavo', eur(r.total)],
              ['Dejanska cena / kg', eur(r.perKg)],
              ['Strošek na kolut', eur(r.perSpool)],
              ['Prihranek na blagu', eur(r.savings)],
            ].map(([label, v]) => (
              <div key={label}>
                <span className="muted small">{label}</span>
                <h2>{v}</h2>
              </div>
            ))}
          </div>
          <Toggle checked={confirmed} onChange={setConfirmed}>
            Preveril sem neto maso, končno ceno in veljavnost popusta za izbrano
            različico.
          </Toggle>
          <div className="backup-actions">
            <button
              className="button primary"
              disabled={!confirmed || price <= 0}
              onClick={() => {
                onAdd({
                  ...catalogMaterial(selected, r.perSpool, mass),
                  id: uid(),
                  name: selected.name + ' – moja nabava',
                  purchases: [
                    {
                      label: `Moja nabava · ${quantity} kos · ${discount} % · dostava vključena`,
                      price: r.perSpool,
                      mass,
                    },
                  ],
                  priceNote: `Ročno potrjena nabava; ${selected.note}`,
                });
                setFeedback(
                  'Nabava je dodana kot ločena različica v vaš cenik.',
                );
              }}
            >
              <Plus size={16} />
              Dodaj nabavno različico v cenik
            </button>
          </div>
          <details>
            <summary>
              Shrani kot novo nabavno ceno obstoječega materiala
            </summary>
            <Select
              label="Obstoječi material"
              value={target}
              onChange={setTarget}
              options={materials.map((x) => ({ value: x.id, label: x.name }))}
            />
            <button
              className="button"
              disabled={!confirmed || price <= 0}
              onClick={() => {
                onPurchase(
                  target,
                  r.perSpool,
                  mass,
                  `Potrjena nabava ${new Date().toLocaleDateString('sl-SI')} · dostava vključena`,
                );
                setFeedback(
                  'Nova nabavna cena je shranjena in uporabljena za nove projekte.',
                );
              }}
            >
              <Check size={15} />
              Shrani nabavo in uporabi ceno
            </button>
          </details>
          {feedback && (
            <p role="status" className="calculation-note">
              {feedback} Pri odprtem projektu uporabite gumb »Uporabi aktualni
              cenik«.
            </p>
          )}
        </Card>
      </div>
      <div className="buying-guides">
        <Card title="Bambu Lab · bulk in refill">
          <p>
            V EU trgovini primerjajte paketne cene in refill brez koluta. Uradna
            objava septembra 2026 omenja začetek popustov pri 2 kolutih; pogoji
            se razlikujejo po regijah in izdelkih. Aktualnih slovenskih cen ni
            bilo mogoče potrditi, zato odstotki niso prednastavljeni.
          </p>
          <a
            href="https://eu.store.bambulab.com/collections/filament-bulk-sale"
            target="_blank"
            rel="noreferrer"
          >
            Preveri EU bulk ponudbo ↗
          </a>
          <a
            href="https://forum.bambulab.com/t/filament-prices-drop-across-all-regions/259832"
            target="_blank"
            rel="noreferrer"
          >
            Uradna objava o popustih ↗
          </a>
        </Card>
        <Card title="Prusa · paketi in ugodnosti">
          <p>
            Preverite pakete 5 + 1 in 2 kg kolute. Uradna navodila navajajo 5 %
            popusta na izbrane filamente po nakupu upravičenega kompleta
            tiskalnika oziroma 10 % po sestavljenem tiskalniku, do 30 kolutov
            letno. Združevanja popustov ne predpostavljajte.
          </p>
          <p className="muted small">
            Objavljena akcija 22. 10.–30. 11. 2026 med drugim navaja do 40 % na
            PC Blend/PVB, 30 % na 2 kg PLA/PETG in 20 % na 1 kg PLA/PETG. Velja
            izbrana ponudba in zaloga; po koncu obdobja jo obravnavajte kot
            preteklo.
          </p>
          <a
            href="https://www.prusa3d.com/category/filament-bundles/"
            target="_blank"
            rel="noreferrer"
          >
            Paketi filamentov ↗
          </a>
          <a
            href="https://help.prusa3d.com/article/vouchers-discounts_793858"
            target="_blank"
            rel="noreferrer"
          >
            Pogoji ugodnosti ↗
          </a>
          <a
            href="https://blog.prusa3d.com/prusa-black-friday-2026-is-here-grab-the-biggest-deals-of-the-year_138966/"
            target="_blank"
            rel="noreferrer"
          >
            Akcija in datumi ↗
          </a>
        </Card>
        <Card title="Plastika Trček · količinski popusti">
          <p>
            Pri označenih izdelkih je dovoljeno kombiniranje materialov in barv.
            Produktne strani navajajo 5 % pri 1–2 kosih, 20 % pri 3–5, 30 % pri
            6–11 in 40 % pri 20+. Pri 12–19 kosih je odvisno od strani navedeno
            35 % ali 38 %; preverite košarico.
          </p>
          <p className="muted small">
            Preverite tudi refill ter neto maso: ASA Plus 800 g in najlon PA12
            700 g. Najnižja cena koluta ni nujno najnižja cena kilograma.
            Dostava je na strani navedena brezplačno nad 80 €; pred nakupom
            preverite veljavne pogoje.
          </p>
          <a href="https://3dtrcek.com/sl/" target="_blank" rel="noreferrer">
            Količinska ponudba in pogoji ↗
          </a>
        </Card>
      </div>
      <p className="muted small">
        Viri pregledani {checkedAt}. Povezave potrebujejo internet; shranjeni
        pregled in kalkulator nabave delujeta tudi brez povezave. Cene se ne
        osvežujejo samodejno.
      </p>
    </div>
  );
}
