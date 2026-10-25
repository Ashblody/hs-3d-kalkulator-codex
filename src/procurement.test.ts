import { describe, it, expect } from 'vitest';
import { purchaseCost } from './procurement';
import { catalog, catalogMaterial } from './catalog';
import {
  materialSchema,
  calculate,
  defaults,
  demo,
  orderSchema,
} from './model';
describe('Lastna ura in nabava', () => {
  it('15 €/h spremeni samo vrednost dela in ohrani vse postavke tiska', () => {
    const original = calculate(demo(), defaults),
      own = calculate({ ...demo(), ownLabor: true }, defaults);
    expect(own.work).toBe(52.5);
    expect(own.total).toBeCloseTo(105.727944, 6);
    for (const k of [
      'material',
      'electricity',
      'depreciation',
      'reserve',
      'printCost',
      'printSale',
      'markup',
    ] as const)
      expect(own[k]).toBe(original[k]);
    expect(own.laborRates.cad).toBe(15);
    expect(own.earnings).toBeLessThan(own.contribution);
  });
  it('vse vrste aktivnega dela vključi v lastno urno postavko', () => {
    const r = calculate(
      {
        ...demo(),
        ownLabor: true,
        ownRate: 15,
        kind: 'Digitalna datoteka',
        digitalHours: 2,
        digitalRate: 99,
        extraHours: 1,
        extraRate: 77,
      },
      defaults,
    );
    expect(r.work).toBe(45);
    expect(r.digitalRate).toBe(15);
    expect(r.extraRate).toBe(15);
  });
  it('preklop nazaj obnovi prvotne tarifne postavke', () => {
    const order = { ...demo(), ownLabor: true };
    const initial = calculate(demo(), defaults);
    expect(calculate({ ...order, ownLabor: false }, defaults).total).toBe(
      initial.total,
    );
  });
  it('stare shranjene ponudbe dobijo izključen novi način', () => {
    const { ownRate, ownLabor, ...old } = demo();
    const parsed = orderSchema.parse(old);
    expect(parsed.ownLabor).toBe(false);
    expect(parsed.ownRate).toBe(15);
    expect(calculate(parsed, defaults).total).toBeCloseTo(131.977944, 6);
  });
  it('bulk popust uporabi samo enkrat in razporedi dostavo', () => {
    const r = purchaseCost(20, 800, 10, 30, 6);
    expect(r.total).toBe(146);
    expect(r.kg).toBe(8);
    expect(r.perKg).toBe(18.25);
    expect(r.perSpool).toBe(14.6);
    expect(r.savings).toBe(60);
  });
  it('akcijska cena z 0 % ne dobi dodatnega popusta', () => {
    expect(purchaseCost(33.99, 700, 1, 0, 0).perKg).toBeCloseTo(48.557142, 5);
  });
  it('zavrne nepravilne podatke nakupa', () => {
    expect(() => purchaseCost(20, 0, 1, 0, 0)).toThrow();
    expect(() => purchaseCost(20, 1000, 1.5, 0, 0)).toThrow();
    expect(() => purchaseCost(20, 1000, 2, 101, 0)).toThrow();
  });
  it('katalog vsebuje vse zahtevane vrste in ne izmisli neznane cene', () => {
    expect(new Set(catalog.map((x) => x.type))).toEqual(
      new Set(['PLA', 'PETG', 'ASA', 'ABS', 'PC', 'Nylon', 'PCTG']),
    );
    expect(catalog.find((x) => x.id === 'bambu-abs')?.price).toBeNull();
    for (const item of catalog)
      if (item.price !== null)
        expect(
          materialSchema.safeParse(catalogMaterial(item, item.price)).success,
        ).toBe(true);
    expect(catalog.find((x) => x.id === 'trcek-asa')?.mass).toBe(800);
  });
});
