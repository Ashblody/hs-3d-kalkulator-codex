import { describe, it, expect } from 'vitest';
import { calculate, defaults, demo, fresh, orderSchema } from './model';
import { validate, initial } from './storage';
describe('Izračuni HS 3D', () => {
  it('demonstracijski projekt sledi formulam brez vmesnega zaokroževanja', () => {
    const r = calculate(demo(), defaults);
    expect(r.time).toBeCloseTo(18.8, 8);
    expect(r.grams).toBe(768);
    expect(r.material).toBeCloseTo(20.45952, 6);
    expect(r.electricity).toBeCloseTo(1.692, 6);
    expect(r.depreciation).toBeCloseTo(6.70784, 6);
    expect(r.base).toBeCloseTo(32.25936, 6);
    expect(r.printCost).toBeCloseTo(35.485296, 6);
    expect(r.printSale).toBeCloseTo(53.227944, 6);
    expect(r.work).toBe(78.75);
    expect(r.total).toBeCloseTo(131.977944, 6);
  });
  it('čas serije in dodatni material obračuna samo enkrat', () => {
    const r = calculate(
      { ...demo(), batch: true, batchHours: 10, extraGrams: 50 },
      defaults,
    );
    expect(r.time).toBe(10);
    expect(r.grams).toBe(818);
  });
  it('50 % pribitek pomeni 33,33 % marže na tisk', () => {
    const r = calculate(
      { ...fresh(defaults), manualCost: 100, markup: 50 },
      defaults,
    );
    expect(r.printSale).toBe(150);
    expect(r.margin).toBeCloseTo(33.333333, 5);
  });
  it('prijateljski popust velja samo za storitve', () => {
    const normal = calculate(demo(), defaults),
      friend = calculate(
        { ...demo(), mode: 'Prijatelj', km: 10, delivery: 5 },
        defaults,
      );
    expect(friend.friendDiscount).toBeCloseTo(78.75 * 0.15, 8);
    expect(friend.printSale).toBe(normal.printSale);
    expect(friend.total).toBeCloseTo(normal.total + 8 - 78.75 * 0.15, 8);
  });
  it('zase ne vključuje pribitka, minimalnega naročila, popusta ali prodajnega DDV', () => {
    const r = calculate(
      { ...demo(), mode: 'Zase', vatEnabled: true, discount: 100 },
      defaults,
    );
    expect(r.total).toBe(r.actualCosts);
    expect(r.work).toBe(78.75);
    expect(r.vat).toBe(0);
    expect(r.earnings).toBe(0);
  });
  it('DDV ne šteje v prihodke in ni dvojnega odštevanja amortizacije', () => {
    const r = calculate(
      { ...demo(), vatEnabled: true },
      { ...defaults, tax: 5 },
    );
    expect(r.total).toBeCloseTo(r.net * 1.22, 8);
    expect(r.contribution).toBeCloseTo(r.net - r.actualCosts, 8);
    expect(r.earnings).toBeCloseTo(
      r.net - r.actualCosts - r.fixed - r.net * 0.05,
      8,
    );
  });
  it('ločuje minimalno naročilo in omeji prevelik popust', () => {
    const r = calculate(
      { ...fresh(defaults), manualCost: 2, discount: 1000 },
      defaults,
    );
    expect(r.net).toBe(15);
    expect(r.discount).toBe(3);
    expect(calculate(fresh(defaults), defaults).total).toBe(0);
  });
  it('digitalna datoteka ne obračuna skritih vrednosti tiska', () => {
    const r = calculate(
      {
        ...demo(),
        kind: 'Digitalna datoteka',
        digitalHours: 2,
        digitalRate: 30,
        digitalCosts: 5,
        licenseFee: 10,
      },
      defaults,
    );
    expect(r.printCost).toBe(0);
    expect(r.work).toBe(60);
    expect(r.total).toBe(75);
  });
  it('skrite storitve drugih vrst ne vplivajo na izračun', () => {
    const r = calculate({ ...demo(), kind: 'Skeniranje' }, defaults);
    expect(r.work).toBe(45);
    expect(r.time).toBe(0);
    expect(r.total).toBe(45);
  });
  it('ceno kg izračuna iz neto mase koluta', () => {
    const s = structuredClone(defaults);
    s.materials[2].mass = 500;
    s.materials[2].price = 20;
    expect(calculate(demo(), s).material).toBeCloseTo(0.768 * 40, 8);
  });
  it('ročni strošek nadomesti stroške z rezervo, ne sešteje', () => {
    const r = calculate({ ...demo(), manualCost: 100 }, defaults);
    expect(r.printCost).toBe(100);
    expect(r.printSale).toBe(150);
  });
  it('posnetek projekta je neodvisen od spremembe splošnega cenika', () => {
    const b = initial(),
      before = calculate(b.projects[0].order, b.projects[0].snapshot).total;
    b.settings.materials[2].price = 999;
    expect(calculate(b.projects[0].order, b.projects[0].snapshot).total).toBe(
      before,
    );
  });
  it('zavrne negativne in neveljavne vnose', () => {
    expect(() => orderSchema.parse({ ...demo(), grams: -1 })).toThrow();
    expect(() => calculate(demo(), { ...defaults, monthlyHours: 0 })).toThrow();
    expect(() => orderSchema.parse({ ...demo(), quantity: 1.5 })).toThrow();
    expect(() => orderSchema.parse({ ...demo(), minutes: 60 })).toThrow();
  });
  it('preveri varnostne kopije in povezave na cenik', () => {
    expect(validate(initial()).version).toBe(1);
    expect(() => validate({ version: 99 })).toThrow();
    const b = initial();
    b.draft.printerId = 'manjka';
    expect(() => validate(b)).toThrow();
  });
  it('ni stroškov neobveznih ničelnih storitev', () => {
    const r = calculate(fresh(defaults), defaults);
    expect(r.total).toBe(0);
    expect(r.work).toBe(0);
  });
});
