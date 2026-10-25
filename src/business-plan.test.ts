import { describe, it, expect } from 'vitest';
import {
  calculate,
  demo,
  defaults,
  roundOffer,
  monthlyPlan,
  orderSchema,
  settingsSchema,
} from './model';
describe('Ideje za ponudbe in mesečni načrt', () => {
  it('zaokroži po popustih in minimumu, pred DDV', () => {
    const r = calculate(
      { ...demo(), discount: 2, roundTo: 5, vatEnabled: true },
      defaults,
    );
    expect(r.netBeforeRounding).toBeCloseTo(129.977944, 8);
    expect(r.net).toBe(130);
    expect(r.rounding).toBeCloseTo(0.022056, 8);
    expect(r.vat).toBeCloseTo(28.6, 8);
    expect(r.total).toBeCloseTo(158.6, 8);
  });
  it('točni večkratniki se ne zaokrožijo na naslednji korak', () => {
    expect(roundOffer(100, 5)).toBe(100);
    expect(roundOffer(100.0001, 5)).toBe(105);
    expect(roundOffer(100, 0)).toBe(100);
    expect(roundOffer(0, 5)).toBe(0);
  });
  it('zase ne zaokroži dejanskih stroškov', () => {
    const r = calculate({ ...demo(), mode: 'Zase', roundTo: 5 }, defaults);
    expect(r.total).toBeCloseTo(35.485296, 8);
    expect(r.rounding).toBe(0);
  });
  it('privzeto ohrani stare ponudbe brez zaokroževanja', () => {
    const { roundTo, ...old } = demo();
    expect(orderSchema.parse(old).roundTo).toBe(0);
    expect(calculate(orderSchema.parse(old), defaults).total).toBeCloseTo(
      131.977944,
      8,
    );
    const { planRate, roundTo: step, ...oldSettings } = defaults;
    expect(settingsSchema.parse(oldSettings).planRate).toBe(18);
    expect(settingsSchema.parse(oldSettings).roundTo).toBe(0);
  });
  it('mesečni načrt pri 18 €/h loči prihodke od osebnega zaslužka', () => {
    const r = monthlyPlan(defaults);
    expect(r.revenue).toBe(360);
    expect(r.earnings).toBeCloseTo(221.99, 8);
    expect(r.hourly).toBeCloseTo(11.0995, 8);
    expect(r.requiredRate).toBeCloseTo(21.9005, 8);
    expect(r.belowTarget).toBe(true);
  });
  it('potrebna urna postavka pokrije fiksne stroške in davčno rezervo', () => {
    const s = { ...defaults, tax: 10 };
    const r = monthlyPlan(s);
    expect(r.requiredRate).toBeCloseTo(21.9005 / 0.9, 8);
    const target = monthlyPlan({ ...s, planRate: r.requiredRate! });
    expect(target.hourly).toBeCloseTo(15, 8);
    expect(monthlyPlan({ ...defaults, tax: 100 }).requiredRate).toBeNull();
  });
});
