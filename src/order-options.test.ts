import { describe, it, expect } from 'vitest';
import {
  calculate,
  demo,
  defaults,
  orderSchema,
  type Plate,
  type ModelSale,
} from './model';
import { initial, validate } from './storage';
const plate = (patch: Partial<Plate> = {}): Plate => ({
  id: 'plate-1',
  name: 'Levi nosilci',
  printerId: 'bambu',
  materialId: 'm2',
  pieces: 2,
  runs: 1,
  grams: 384,
  hours: 9,
  minutes: 24,
  notes: 'Podpore in purge vključeni.',
  ...patch,
});
const sale = (patch: Partial<ModelSale> = {}): ModelSale => ({
  id: 'sale-1',
  format: 'STL',
  name: 'Nosilec lučk',
  price: 40,
  rights: 'Osebna uporaba',
  ...patch,
});
describe('Prodaja modelov in tiskalne plošče', () => {
  it('prodaja STL in STEP ne poveča obračunanih ur in ne podvoji skena ali CAD-a', () => {
    const original = calculate(demo(), defaults);
    const result = calculate(
      {
        ...demo(),
        modelSaleEnabled: true,
        modelSales: [sale(), sale({ id: 'sale-2', format: 'STEP', price: 60 })],
      },
      defaults,
    );
    expect(result.fileSale).toBe(100);
    expect(result.total).toBeCloseTo(original.total + 100, 8);
    expect(result.work).toBe(original.work);
    expect(result.activeHours).toBe(original.activeHours);
    expect(result.printCost).toBe(original.printCost);
  });
  it('prodaja že izdelane datoteke ne potrebuje ur ali tiskanja', () => {
    const o = {
      ...demo(),
      kind: 'Digitalna datoteka' as const,
      modelSaleEnabled: true,
      modelSales: [sale()],
      services: { scan: 0, clean: 0, cad: 0, reverse: 0, prep: 0, finish: 0 },
    };
    const r = calculate(o, defaults);
    expect(r.total).toBe(40);
    expect(r.quantity).toBe(1);
    expect(r.unit).toBe(40);
    expect(r.activeHours).toBe(0);
    expect(r.printCost).toBe(0);
  });
  it('novi način datotek izključi stari obračun digitalnih ur in licenc', () => {
    const r = calculate(
      {
        ...demo(),
        kind: 'Digitalna datoteka',
        modelSaleEnabled: true,
        modelSales: [sale()],
        digitalHours: 100,
        digitalRate: 200,
        licenseFee: 999,
        digitalCosts: 500,
      },
      defaults,
    );
    expect(r.work).toBe(78.75);
    expect(r.fileSale).toBe(40);
    expect(r.license).toBe(0);
    expect(r.digitalCost).toBe(0);
    expect(r.activeHours).toBe(3.5);
    expect(r.total).toBe(118.75);
  });
  it('prijateljski odstotek zniža delo, ne prodaje modela; DDV zajame tudi datoteko', () => {
    const r = calculate(
      {
        ...demo(),
        mode: 'Prijatelj',
        vatEnabled: true,
        modelSaleEnabled: true,
        modelSales: [sale()],
      },
      defaults,
    );
    expect(r.friendDiscount).toBeCloseTo(78.75 * 0.15, 8);
    expect(r.net).toBeCloseTo(131.977944 + 40 - 78.75 * 0.15, 8);
    expect(r.vat).toBeCloseTo(r.net * 0.22, 8);
  });
  it('način zase ne prišteje prodajne vrednosti datotek', () => {
    const r = calculate(
      { ...demo(), mode: 'Zase', modelSaleEnabled: true, modelSales: [sale()] },
      defaults,
    );
    expect(r.total).toBeCloseTo(35.485296, 8);
  });
  it('dve plošči reproducirata prvotni projekt, brez množenja s kosi', () => {
    const r = calculate(
      {
        ...demo(),
        platesEnabled: true,
        plates: [plate(), plate({ id: 'plate-2', name: 'Desni nosilci' })],
      },
      defaults,
    );
    expect(r.time).toBeCloseTo(18.8, 8);
    expect(r.grams).toBe(768);
    expect(r.quantity).toBe(4);
    expect(r.total).toBeCloseTo(calculate(demo(), defaults).total, 8);
    expect(r.unit).toBeCloseTo(r.total / 4, 8);
  });
  it('pri ploščah ignorira skrite skupne in posamične vnose ter dodatni material', () => {
    const r = calculate(
      {
        ...demo(),
        platesEnabled: true,
        plates: [plate()],
        quantity: 999,
        grams: 999,
        hours: 999,
        batch: true,
        batchHours: 999,
        extraGrams: 999,
      },
      defaults,
    );
    expect(r.time).toBeCloseTo(9.4, 8);
    expect(r.grams).toBe(384);
    expect(r.quantity).toBe(2);
  });
  it('ponovitve množijo celo ploščo enkrat; potrošni material in rezerva ostaneta projektna', () => {
    const r = calculate(
      {
        ...demo(),
        platesEnabled: true,
        plates: [plate({ runs: 2, pieces: 9 })],
      },
      defaults,
    );
    expect(r.time).toBeCloseTo(18.8, 8);
    expect(r.grams).toBe(768);
    expect(r.quantity).toBe(18);
    expect(r.consumables).toBe(3.4);
    expect(r.reserve).toBeCloseTo(r.base * 0.1, 8);
    expect(r.printCost).toBeCloseTo(35.485296, 8);
  });
  it('za vsako ploščo uporabi njen material, tiskalnik in moč', () => {
    const s = structuredClone(defaults);
    s.printers[1].power.PLA = 100;
    const r = calculate(
      {
        ...demo(),
        platesEnabled: true,
        plates: [
          plate({ grams: 100, hours: 1, minutes: 0 }),
          plate({
            id: 'plate-2',
            printerId: 'prusa',
            materialId: 'm0',
            grams: 200,
            hours: 2,
            minutes: 0,
          }),
        ],
      },
      s,
    );
    expect(r.material).toBeCloseTo(0.1 * 26.64 + 0.2 * 13, 8);
    expect(r.electricity).toBeCloseTo(0.45 * 0.2 + 2 * 0.1 * 0.2, 8);
    expect(r.depreciation).toBeCloseTo(1070.4 / 3000 + (2 * 2349) / 3000, 8);
  });
  it('stare ponudbe in JSON ostanejo združljivi, z izključenima novima možnostma', () => {
    const { plates, platesEnabled, modelSales, modelSaleEnabled, ...old } =
      demo();
    const normalized = orderSchema.parse(old);
    expect(normalized.plates).toEqual([]);
    expect(normalized.modelSales).toEqual([]);
    expect(normalized.platesEnabled).toBe(false);
    expect(normalized.modelSaleEnabled).toBe(false);
    expect(calculate(normalized, defaults).total).toBeCloseTo(131.977944, 8);
  });
  it('JSON ohrani plošče in prodajne postavke ter preveri povezave in negativne vrednosti', () => {
    const b = initial();
    b.draft.plates = [plate()];
    b.draft.platesEnabled = true;
    b.draft.modelSales = [sale()];
    b.draft.modelSaleEnabled = true;
    expect(validate(JSON.parse(JSON.stringify(b))).draft.plates[0].notes).toBe(
      plate().notes,
    );
    b.draft.plates[0].materialId = 'manjka';
    expect(() => validate(b)).toThrow();
    expect(() =>
      orderSchema.parse({ ...demo(), plates: [plate({ runs: 0 })] }),
    ).toThrow();
    expect(() =>
      orderSchema.parse({ ...demo(), modelSales: [sale({ price: -1 })] }),
    ).toThrow();
  });
});
