import type { Material } from './model';
export const checkedAt = '2026-10-25';
export interface CatalogItem {
  id: string;
  name: string;
  maker: string;
  type: string;
  mass: number;
  price: number | null;
  source: string;
  note: string;
  bulk?: boolean;
  discount12?: number;
  drying?: number;
  priceKind?: 'user' | 'reference';
}
const trcek = (
  type: string,
  name: string,
  price: number,
  mass: number,
  slug: string,
  bulk = false,
  discount12 = 35,
  drying?: number,
): CatalogItem => ({
  id: 'trcek-' + type.toLowerCase(),
  name: '3DTrček ' + name,
  maker: 'Plastika Trček',
  type,
  mass,
  price,
  source: 'https://3dtrcek.com/sl/' + slug,
  note: 'Referenčna prikazana cena z 22 % DDV; izberite barvo in maso ter preverite košarico.',
  bulk,
  discount12,
  drying,
  priceKind: 'reference',
});
export const catalog: CatalogItem[] = [
  {
    id: 'bambu-pla',
    name: 'Bambu PLA Basic',
    maker: 'Bambu Lab',
    type: 'PLA',
    mass: 1000,
    price: 13,
    source: 'https://eu.store.bambulab.com/products/pla-basic-filament',
    priceKind: 'user',
    note: 'Vaša začetna nabavna cena, ne potrjena trenutna spletna cena. Refill in kolut imata lahko različni ceni.',
  },
  {
    id: 'bambu-petg',
    name: 'Bambu PETG HF',
    maker: 'Bambu Lab',
    type: 'PETG',
    mass: 1000,
    price: 13,
    source:
      'https://eu.store.bambulab.com/collections/bambu-lab-3d-printer-filament',
    priceKind: 'user',
    note: 'Vaša začetna nabavna cena. Preverite tudi aktualni PETG Basic; ni samodejno enak izdelek kot HF.',
  },
  {
    id: 'bambu-asa',
    name: 'Bambu ASA',
    maker: 'Bambu Lab',
    type: 'ASA',
    mass: 1000,
    price: 26.64,
    source: 'https://eu.store.bambulab.com/collections/price-drop',
    priceKind: 'user',
    note: 'Vaša začetna nabavna cena. Aktualna cena za dostavo v Slovenijo ni bila zanesljivo potrjena.',
  },
  {
    id: 'bambu-abs',
    name: 'Bambu ABS',
    maker: 'Bambu Lab',
    type: 'ABS',
    mass: 1000,
    price: null,
    source: 'https://eu.store.bambulab.com/products/abs-filament',
    note: 'Izdelek potrjen v uradni EU ponudbi. Končno ceno za Slovenijo vnesite iz košarice; stare indeksirane akcije niso uporabljene.',
  },
  {
    id: 'bambu-pc',
    name: 'Bambu PC',
    maker: 'Bambu Lab',
    type: 'PC',
    mass: 1000,
    price: null,
    source:
      'https://eu.store.bambulab.com/collections/bambu-lab-3d-printer-filament',
    note: 'Izdelek je v uradnem katalogu. Cena za Slovenijo ni potrjena; vnesite dejansko nabavno ceno.',
  },
  {
    id: 'bambu-nylon',
    name: 'Bambu PA6-GF (najlon s steklenimi vlakni)',
    maker: 'Bambu Lab',
    type: 'Nylon',
    mass: 1000,
    price: null,
    source: 'https://bambulab-eu.myshopify.com/products/pa6-gf',
    note: 'Ojačan PA6, ni čist najlon. Pred nabavo preverite maso različice, združljivost šobe in končno ceno.',
  },
  {
    id: 'prusa-pla',
    name: 'Prusament PLA Pistachio Green',
    maker: 'Prusa',
    type: 'PLA',
    mass: 1000,
    price: 29.99,
    source:
      'https://www.prusa3d.com/product/prusament-pla-pistachio-green-1kg/',
    note: 'Referenčni EUR z DDV iz prusament.com; cena se lahko spremeni glede na barvo, DDV države in akcijo.',
    priceKind: 'reference',
  },
  {
    id: 'prusa-petg',
    name: 'Prusament PETG Sky Blue',
    maker: 'Prusa',
    type: 'PETG',
    mass: 1000,
    price: 29.99,
    source: 'https://www.prusa3d.com/product/prusament-petg-sky-blue-1kg-nfc/',
    note: 'Referenčni EUR z DDV iz prusament.com; končni znesek preverite za Slovenijo.',
    priceKind: 'reference',
  },
  {
    id: 'prusa-asa',
    name: 'Prusament ASA Olive Green',
    maker: 'Prusa',
    type: 'ASA',
    mass: 800,
    price: 29.99,
    source: 'https://www.prusa3d.com/product/prusament-asa-olive-green-850g/',
    note: 'Naslov trenutne strani navaja 800 g, čeprav stari URL vsebuje 850g. Referenčni EUR z DDV iz prusament.com.',
    priceKind: 'reference',
  },
  {
    id: 'prusa-pc',
    name: 'Prusament PC Blend Jet Black',
    maker: 'Prusa',
    type: 'PC',
    mass: 900,
    price: 49.99,
    source:
      'https://www.prusa3d.com/product/prusament-pc-blend-jet-black-970g/',
    note: 'Trenutna deklarirana masa 900 g; stari URL vsebuje 970g. Referenčni EUR z DDV iz prusament.com.',
    priceKind: 'reference',
  },
  {
    id: 'prusa-nylon',
    name: 'Prusament PA11 Natural',
    maker: 'Prusa',
    type: 'Nylon',
    mass: 800,
    price: 107,
    source: 'https://www.prusa3d.com/product/prusament-pa11-natural-800g-nfc/',
    note: 'PA11 brez karbonskih vlaken. Referenčni EUR z DDV iz prusament.com; ni enak PA11-CF.',
    priceKind: 'reference',
  },
  trcek('PLA', 'PLA', 19.49, 1000, 'pla-filament', true),
  trcek('PETG', 'PETG', 19.49, 1000, 'petg-filament', true, 35, 60),
  trcek('ASA', 'ASA Plus', 21.9, 800, 'asa-plus-filament', true, 38, 60),
  trcek('ABS', 'ABS Plus', 19.99, 800, 'abs-plus-filament', true, 38, 60),
  trcek('PC', 'PC', 47.99, 1000, 'pc-filament'),
  {
    ...trcek(
      'Nylon',
      'Nylon PA-12',
      39.99,
      700,
      'nylon-pa-12-filament',
      false,
      0,
      80,
    ),
    note: 'Redna 39,99 €; ob preverjanju prikazana akcija 33,99 € z DDV za izdelek z možnostjo 700 g. Preverite izbrano različico. Popusti se ne seštevajo samodejno.',
  },
  trcek('PCTG', 'PCTG', 27.99, 1000, 'pctg-filament', true, 35, 65),
];
export function catalogMaterial(
  item: CatalogItem,
  price: number,
  mass = item.mass,
): Material {
  return {
    id: 'catalog-' + item.id,
    name: item.name,
    maker: item.maker,
    type: item.type,
    mass,
    price,
    drying: item.drying ?? null,
    purchases: [{ label: `Referenca / nabava ${checkedAt}`, price, mass }],
    source: item.source,
    checkedAt,
    priceNote: item.note,
  };
}
