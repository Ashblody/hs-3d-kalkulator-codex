import { ChartNoAxesCombined } from 'lucide-react';
import { Card, Num } from './ui';
import { monthlyPlan, settingsSchema, eur, dec, type Settings } from './model';
export function MonthlyPlan({
  settings,
  onRateChange,
}: {
  settings: Settings;
  onRateChange: (rate: number) => void;
}) {
  const s = settingsSchema.parse(settings);
  const p = monthlyPlan(s);
  return (
    <Card
      title="Mesečni načrt · ali moja ura pokrije cilj?"
      icon={<ChartNoAxesCombined size={18} />}
    >
      <p className="muted small">
        Scenarij samo za aktivno delo pri {dec(s.monthlyHours)} obračunljivih
        urah mesečno. Ni prihodek iz shranjenih projektov in ne vključuje
        prispevka tiskanja.
      </p>
      <div className="plan-rate">
        <Num
          label="Predpostavljena prodajna ura dela"
          value={s.planRate}
          onChange={onRateChange}
          suffix="€/h"
        />
        <div className="plan-presets">
          {[15, 18, 25].map((rate) => (
            <button
              className="button ghost"
              key={rate}
              onClick={() => onRateChange(rate)}
            >
              {eur(rate)}/h
            </button>
          ))}
        </div>
      </div>
      <div className="detail-lines">
        <p>
          <span>
            Prihodki: {dec(s.monthlyHours)} h × {eur(s.planRate)}
          </span>
          <b>{eur(p.revenue)}</b>
        </p>
        <p>
          <span>Mesečni fiksni stroški</span>
          <b>− {eur(s.fixed)}</b>
        </p>
        <p>
          <span>Davčna rezerva ({dec(s.tax)} % prihodkov)</span>
          <b>− {eur(p.tax)}</b>
        </p>
        <p className="line-total">
          <span>Predvideni osebni zaslužek</span>
          <b>{eur(p.earnings)}</b>
        </p>
        <p>
          <span>Zaslužek na aktivno uro</span>
          <b>{eur(p.hourly)}/h</b>
        </p>
        <p>
          <span>Potrebna prodajna ura za cilj {eur(s.target)}/h</span>
          <b>
            {p.requiredRate === null
              ? 'Pri 100 % rezervi ni dosegljivo'
              : eur(p.requiredRate) + '/h'}
          </b>
        </p>
      </div>
      {p.belowTarget && (
        <p className="warning">
          Pri izbranem obsegu dela prodajna ura {eur(s.planRate)} še ne doseže
          cilja {eur(s.target)}/h po fiksnih stroških in davčni rezervi.
        </p>
      )}
      <p className="muted small plan-footnote">
        Načrt predpostavlja, da razen fiksnih stroškov in izbrane davčne rezerve
        ni drugih stroškov dela. Dodatne stroške upoštevaj posebej. Nastavitve
        ur, prispevkov, rezerve in cilja spremeni v poslovnih nastavitvah.
      </p>
    </Card>
  );
}
