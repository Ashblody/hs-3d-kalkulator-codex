import { z } from 'zod';
const num = z.number().finite().min(0).max(1e9);
const pct = z.number().finite().min(0).max(100);
const name = z.string().min(1).max(200);
export const serviceKeys = [
  'scan',
  'clean',
  'cad',
  'reverse',
  'prep',
  'finish',
] as const;
export const serviceLabels: Record<(typeof serviceKeys)[number], string> = {
  scan: '3D-skeniranje na terenu',
  clean: 'Urejanje skena',
  cad: 'CAD-modeliranje',
  reverse: 'Reverse engineering',
  prep: 'Priprava tiska',
  finish: 'Dodelava in podpore',
};
const ratesSchema = z.object({
  scan: num,
  clean: num,
  cad: num,
  reverse: num,
  prep: num,
  finish: num,
});
export const printerSchema = z.object({
  id: name,
  name,
  price: num,
  life: z.number().finite().positive(),
  service: num,
  power: z.record(num),
  fallbackPower: num,
});
export const materialSchema = z.object({
  id: name,
  name,
  maker: z.string().max(200),
  type: name,
  mass: z.number().finite().positive(),
  price: num,
  drying: num.nullable(),
  source: z.string().url().optional(),
  checkedAt: z.string().optional(),
  priceNote: z.string().max(1000).optional(),
  purchases: z
    .array(
      z.object({
        label: name,
        price: num,
        mass: z.number().finite().positive(),
      }),
    )
    .max(100),
});
export const settingsSchema = z.object({
  printers: z.array(printerSchema).min(1).max(100),
  materials: z.array(materialSchema).min(1).max(500),
  rates: ratesSchema,
  electricity: num,
  km: num,
  minimum: num,
  markup: num,
  reserve: pct,
  friend: pct,
  target: num,
  monthlyHours: z.number().finite().positive(),
  fixed: num,
  tax: pct,
  vat: pct,
  business: z.string().max(2000),
  roundTo: num.default(0),
  planRate: num.default(18),
});
export type Settings = z.infer<typeof settingsSchema>;
export type Printer = z.infer<typeof printerSchema>;
export type Material = z.infer<typeof materialSchema>;
export const digitalLabels = [
  'Surov 3D-sken (OBJ/STL)',
  'Očiščen in popravljen STL',
  'CAD-model izvožen v STL',
  'Parametrični CAD-model / izvoz STEP',
  'Rekonstrukcija STEP iz skena',
  'STL + STEP + dokumentacija',
];
export const orderSchema = z.object({
  roundTo: num.default(0),
  platesEnabled: z.boolean().default(false),
  plates: z
    .array(
      z.object({
        id: name,
        name: z.string().max(200),
        printerId: z.string().max(200).default(''),
        materialId: z.string().max(200).default(''),
        pieces: z.number().int().min(1).max(100000),
        runs: z.number().int().min(1).max(100000),
        grams: num,
        hours: num,
        minutes: z.number().finite().min(0).max(59.999999),
        notes: z.string().max(2000),
      }),
    )
    .max(200)
    .default([]),
  modelSaleEnabled: z.boolean().default(false),
  modelSales: z
    .array(
      z.object({
        id: name,
        format: z.enum([
          'STL',
          'STEP',
          'STL + STEP',
          'OBJ',
          'Izvorni CAD',
          'Celoten paket',
        ]),
        name: z.string().max(200),
        price: num,
        rights: z.enum([
          'Osebna uporaba',
          'Komercialna uporaba',
          'Po dogovoru',
        ]),
      }),
    )
    .max(100)
    .default([]),
  id: name,
  name: z.string().max(200),
  ownLabor: z.boolean().default(false),
  ownRate: num.default(15),
  client: z.string().max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(5000),
  mode: z.enum(['Stranka', 'Prijatelj', 'Zase']),
  kind: z.enum([
    'Samo tisk',
    'Skeniranje',
    'CAD',
    'Kombinirano',
    'Digitalna datoteka',
  ]),
  status: z.enum([
    'Osnutek',
    'Ponudba',
    'Potrjeno',
    'V izdelavi',
    'Zaključeno',
  ]),
  printerId: name,
  materialId: name,
  quantity: z.number().int().min(1).max(100000),
  grams: num,
  hours: num,
  minutes: z.number().min(0).max(59),
  batch: z.boolean(),
  batchHours: num,
  extraGrams: num,
  consumables: num,
  direct: num,
  reserve: pct,
  markup: num,
  manualCost: num.nullable(),
  services: ratesSchema,
  extraHours: num,
  extraRate: num,
  km: num,
  packaging: num,
  delivery: num,
  other: num,
  discount: num,
  friend: pct,
  vatEnabled: z.boolean(),
  digitalType: z.number().int().min(0).max(5),
  digitalHours: num,
  digitalRate: num,
  digitalCosts: num,
  license: z.enum([
    'Samo fizični izdelek',
    'Osebna uporaba',
    'Komercialna uporaba',
    'Izvorna CAD-datoteka',
  ]),
  licenseFee: num,
  actualHours: num.nullable(),
  actualGrams: num.nullable(),
  actualWork: num.nullable(),
});
export type Order = z.infer<typeof orderSchema>;
export type Plate = Order['plates'][number];
export type ModelSale = Order['modelSales'][number];
export const projectSchema = z.object({
  order: orderSchema,
  snapshot: settingsSchema,
  savedAt: z.string(),
});
export type Project = z.infer<typeof projectSchema>;
export const backupSchema = z.object({
  version: z.literal(1),
  settings: settingsSchema,
  projects: z.array(projectSchema).max(5000),
  draft: orderSchema,
  draftSettings: settingsSchema,
});
export type Backup = z.infer<typeof backupSchema>;
export const defaults: Settings = {
  printers: [
    {
      id: 'bambu',
      name: 'Bambu Lab X2D Combo',
      price: 870.4,
      life: 3000,
      service: 200,
      power: { ASA: 450 },
      fallbackPower: 450,
    },
    {
      id: 'prusa',
      name: 'Prusa CORE One INDX',
      price: 2249,
      life: 3000,
      service: 100,
      power: {},
      fallbackPower: 0,
    },
    {
      id: 'elegoo',
      name: 'Elegoo Mars 2 Pro',
      price: 450,
      life: 3000,
      service: 200,
      power: {},
      fallbackPower: 0,
    },
    {
      id: 'formlabs',
      name: 'Formlabs Form Studio 1',
      price: 1650,
      life: 3000,
      service: 200,
      power: {},
      fallbackPower: 0,
    },
  ],
  materials: [
    ['Bambu PLA Basic', 'Bambu', 'PLA', 13],
    ['Bambu PETG HF', 'Bambu', 'PETG', 13],
    ['Bambu ASA', 'Bambu', 'ASA', 26.64],
    ['Prusament PLA', 'Prusa', 'PLA', 32],
    ['Prusament PETG', 'Prusa', 'PETG', 32],
    ['Prusament ASA', 'Prusa', 'ASA', 32],
    ['Plastika Trček PLA', 'Plastika Trček', 'PLA', 21],
    ['Plastika Trček PETG', 'Plastika Trček', 'PETG', 22],
    ['Prusament PC Blend', 'Prusa', 'PC', 46.39],
    ['Plastika Trček TPU', 'Plastika Trček', 'TPU', 38.57],
    ['Prusament PETG-CF', 'Prusa', 'PETG-CF', 60],
  ].map(([n, m, t, p], i) => ({
    id: `m${i}`,
    name: String(n),
    maker: String(m),
    type: String(t),
    mass: 1000,
    price: Number(p),
    drying: null,
    purchases: [{ label: 'Začetna cena', price: Number(p), mass: 1000 }],
  })),
  rates: { scan: 25, clean: 20, cad: 25, reverse: 30, prep: 20, finish: 20 },
  electricity: 0.2,
  km: 0.3,
  minimum: 15,
  markup: 50,
  reserve: 10,
  friend: 15,
  target: 15,
  monthlyHours: 20,
  fixed: 138.01,
  tax: 0,
  vat: 22,
  business: '',
  roundTo: 0,
  planRate: 18,
};
export const uid = () => crypto.randomUUID();
export function fresh(s: Settings): Order {
  return {
    id: uid(),
    name: 'Nov projekt',
    client: '',
    date: new Date().toLocaleDateString('sv-SE'),
    description: '',
    mode: 'Stranka',
    kind: 'Samo tisk',
    status: 'Osnutek',
    printerId: s.printers[0].id,
    materialId: s.materials[0].id,
    quantity: 1,
    grams: 0,
    hours: 0,
    minutes: 0,
    batch: false,
    batchHours: 0,
    platesEnabled: false,
    plates: [],
    modelSaleEnabled: false,
    modelSales: [],
    extraGrams: 0,
    consumables: 0,
    direct: 0,
    reserve: s.reserve,
    markup: s.markup,
    roundTo: s.roundTo,
    manualCost: null,
    services: { scan: 0, clean: 0, cad: 0, reverse: 0, prep: 0, finish: 0 },
    extraHours: 0,
    extraRate: 20,
    ownLabor: false,
    ownRate: 15,
    km: 0,
    packaging: 0,
    delivery: 0,
    other: 0,
    discount: 0,
    friend: s.friend,
    vatEnabled: false,
    digitalType: 0,
    digitalHours: 0,
    digitalRate: s.rates.scan,
    digitalCosts: 0,
    license: 'Samo fizični izdelek',
    licenseFee: 0,
    actualHours: null,
    actualGrams: null,
    actualWork: null,
  };
}
export function demo(): Order {
  return {
    ...fresh(defaults),
    id: 'demo-nosilci',
    name: 'Nosilci lučk – 2 leva + 2 desna',
    description:
      'Štirje nosilci lučk, izdelani iz ASA. Demonstracijski izračun.',
    kind: 'Kombinirano',
    materialId: 'm2',
    quantity: 4,
    grams: 192,
    hours: 4,
    minutes: 42,
    consumables: 3.4,
    services: {
      scan: 1,
      clean: 1,
      cad: 0.75,
      reverse: 0,
      prep: 0.25,
      finish: 0.5,
    },
  };
}
export const eur = (n: number) =>
  new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' }).format(
    Math.abs(n) < 0.005 ? 0 : n,
  );
export const dec = (n: number, digits = 2) =>
  new Intl.NumberFormat('sl-SI', { maximumFractionDigits: digits }).format(n);
export function calculate(order: Order, settings: Settings) {
  const o = orderSchema.parse(order),
    s = settingsSchema.parse(settings);
  const printer = s.printers.find((p) => p.id === o.printerId),
    mat = s.materials.find((m) => m.id === o.materialId);
  if (!printer || !mat) throw new Error('Manjka tiskalnik ali material.');
  const printing = ['Samo tisk', 'Kombinirano'].includes(o.kind),
    digital = o.kind === 'Digitalna datoteka';
  const simpleTime = printing
    ? o.batch
      ? o.batchHours
      : (o.hours + o.minutes / 60) * o.quantity
    : 0;
  const simpleGrams = printing ? o.grams * o.quantity + o.extraGrams : 0;
  const power = printer.power[mat.type] ?? printer.fallbackPower;
  const plateDetails =
    printing && o.platesEnabled
      ? o.plates.map((plate) => {
          const device = s.printers.find(
            (p) => p.id === (plate.printerId || o.printerId),
          );
          const filament = s.materials.find(
            (m) => m.id === (plate.materialId || o.materialId),
          );
          if (!device || !filament)
            throw Error('Plošča uporablja neznan tiskalnik ali material.');
          const time = (plate.hours + plate.minutes / 60) * plate.runs,
            grams = plate.grams * plate.runs;
          const watts = device.power[filament.type] ?? device.fallbackPower;
          return {
            id: plate.id,
            name: plate.name,
            printer: device.name,
            materialName: filament.name,
            time,
            grams,
            quantity: plate.pieces * plate.runs,
            runs: plate.runs,
            power: watts,
            material:
              (grams / 1000) * (filament.price / (filament.mass / 1000)),
            electricity: ((time * watts) / 1000) * s.electricity,
            depreciation:
              (time * (device.price + device.service)) / device.life,
          };
        })
      : [];
  const platesActive = printing && o.platesEnabled;
  const time = platesActive
    ? plateDetails.reduce((sum, p) => sum + p.time, 0)
    : simpleTime;
  const grams = platesActive
    ? plateDetails.reduce((sum, p) => sum + p.grams, 0)
    : simpleGrams;
  const quantity = platesActive
    ? plateDetails.reduce((sum, p) => sum + p.quantity, 0)
    : digital && o.modelSaleEnabled
      ? o.modelSales.length
      : o.quantity;
  const material = platesActive
    ? plateDetails.reduce((sum, p) => sum + p.material, 0)
    : (grams / 1000) * (mat.price / (mat.mass / 1000));
  const electricity = platesActive
    ? plateDetails.reduce((sum, p) => sum + p.electricity, 0)
    : ((time * power) / 1000) * s.electricity;
  const depreciation = platesActive
    ? plateDetails.reduce((sum, p) => sum + p.depreciation, 0)
    : (time * (printer.price + printer.service)) / printer.life;
  const consumables = printing ? o.consumables : 0,
    direct = printing ? o.direct : 0;
  const base = material + electricity + depreciation + consumables + direct;
  const reserve = (base * o.reserve) / 100;
  const printCost = printing ? (o.manualCost ?? base + reserve) : 0;
  const printSale = printCost * (1 + o.markup / 100);
  const activeKeys =
    o.kind === 'Skeniranje'
      ? (['scan', 'clean'] as const)
      : o.kind === 'CAD'
        ? (['cad', 'reverse'] as const)
        : o.kind === 'Digitalna datoteka' && !o.modelSaleEnabled
          ? []
          : serviceKeys;
  const legacyDigital = digital && !o.modelSaleEnabled;
  const fileSale = o.modelSaleEnabled
    ? o.modelSales.reduce((sum, row) => sum + row.price, 0)
    : 0;
  const laborRates = Object.fromEntries(
    serviceKeys.map((key) => [key, o.ownLabor ? o.ownRate : s.rates[key]]),
  ) as Settings['rates'];
  const extraRate = o.ownLabor ? o.ownRate : o.extraRate;
  const digitalRate = o.ownLabor ? o.ownRate : o.digitalRate;
  const work =
    activeKeys.reduce(
      (sum, key) => sum + o.services[key] * laborRates[key],
      0,
    ) +
    o.extraHours * extraRate +
    (legacyDigital ? o.digitalHours * digitalRate : 0);
  const activeHours =
    activeKeys.reduce((sum, key) => sum + o.services[key], 0) +
    o.extraHours +
    (legacyDigital ? o.digitalHours : 0);
  const digitalCost = legacyDigital ? o.digitalCosts : 0,
    license = legacyDigital ? o.licenseFee : 0;
  const travel = o.km * s.km,
    extras = o.packaging + o.delivery + o.other + digitalCost;
  const friendDiscount = o.mode === 'Prijatelj' ? (work * o.friend) / 100 : 0;
  const beforeDiscount =
    printSale + work + fileSale + license + travel + extras;
  const discount = Math.min(beforeDiscount, friendDiscount + o.discount);
  const minimumTopup =
    o.mode !== 'Zase' && beforeDiscount > 0
      ? Math.max(0, s.minimum - (beforeDiscount - discount))
      : 0;
  const actualCosts = printCost + travel + extras;
  const netBeforeRounding =
    o.mode === 'Zase'
      ? actualCosts
      : Math.max(0, beforeDiscount - discount) + minimumTopup;
  const net =
    o.mode === 'Zase'
      ? netBeforeRounding
      : roundOffer(netBeforeRounding, o.roundTo);
  const rounding = net - netBeforeRounding;
  const vat = o.vatEnabled && o.mode !== 'Zase' ? (net * s.vat) / 100 : 0;
  const contribution = o.mode === 'Zase' ? 0 : net - actualCosts;
  const fixed =
    o.mode === 'Zase' ? 0 : (activeHours * s.fixed) / s.monthlyHours;
  const tax = o.mode === 'Zase' ? 0 : (net * s.tax) / 100;
  const earnings = contribution - fixed - tax;
  return {
    plateDetails,
    quantity,
    fileSale,
    legacyDigital,
    laborRates,
    extraRate,
    digitalRate,
    printing,
    digital,
    time,
    grams,
    power,
    material,
    electricity,
    depreciation,
    consumables,
    direct,
    base,
    reserve,
    printCost,
    printSale,
    work,
    activeHours,
    digitalCost,
    license,
    travel,
    extras,
    friendDiscount,
    discount,
    minimumTopup,
    netBeforeRounding,
    rounding,
    actualCosts,
    net,
    vat,
    total: net + vat,
    unit: quantity > 0 ? (net + vat) / quantity : 0,
    contribution,
    fixed,
    tax,
    earnings,
    hourly: activeHours ? earnings / activeHours : 0,
    margin: net ? (contribution / net) * 100 : 0,
    markup: printSale - printCost,
  };
}
export type Result = ReturnType<typeof calculate>;

/** Optional upward rounding is applied once, after discount/minimum, before VAT. */
export function roundOffer(amount: number, step: number) {
  if (
    !Number.isFinite(amount) ||
    !Number.isFinite(step) ||
    amount < 0 ||
    step < 0
  )
    throw Error('Neveljavno zaokroževanje.');
  return step > 0 && amount > 0
    ? Math.ceil((amount - 1e-9) / step) * step
    : amount;
}
/** Scenario for active labor only, separate from actual project revenue. */
export function monthlyPlan(s: Settings) {
  const revenue = s.monthlyHours * s.planRate;
  const tax = (revenue * s.tax) / 100;
  const earnings = revenue - s.fixed - tax;
  const hourly = earnings / s.monthlyHours;
  const requiredRate =
    s.tax < 100
      ? (s.target + s.fixed / s.monthlyHours) / (1 - s.tax / 100)
      : null;
  return {
    revenue,
    tax,
    earnings,
    hourly,
    requiredRate,
    belowTarget: hourly < s.target,
  };
}
