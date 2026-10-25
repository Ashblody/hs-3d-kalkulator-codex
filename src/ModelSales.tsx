import { Box, Plus, Trash2 } from 'lucide-react';
import { Card, Toggle, Text, Num, Select, options } from './ui';
import { uid, eur, type Order, type ModelSale } from './model';
export const newModelSale = (): ModelSale => ({
  id: uid(),
  format: 'STL',
  name: '',
  price: 0,
  rights: 'Osebna uporaba',
});
export function ModelSales({
  order: o,
  onChange,
}: {
  order: Order;
  onChange: (patch: Partial<Order>) => void;
}) {
  const edit = (id: string, patch: Partial<ModelSale>) =>
    onChange({
      modelSales: o.modelSales.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    });
  return (
    <Card title="Prodaja digitalnega modela" icon={<Box size={18} />}>
      <Toggle
        checked={o.modelSaleEnabled}
        onChange={(modelSaleEnabled) =>
          onChange({
            modelSaleEnabled,
            ...(modelSaleEnabled && !o.modelSales.length
              ? { modelSales: [newModelSale()] }
              : {}),
          })
        }
      >
        Dodaj prodajo STL / STEP k naročilu
      </Toggle>
      <p className="muted small">
        Samostojna cena za že izdelan model ali pravice uporabe. Ure skeniranja,
        čiščenja in CAD-a vnesi pri storitvah; ta postavka jih ne obračuna
        ponovno.
      </p>
      {o.modelSaleEnabled && (
        <>
          <div className="model-sale-list">
            {o.modelSales.map((row, i) => (
              <div className="order-option-item" key={row.id}>
                <div className="option-heading">
                  <b>Datoteka {i + 1}</b>
                  <button
                    className="icon-button"
                    aria-label={`Odstrani datoteko ${i + 1}`}
                    onClick={() =>
                      onChange({
                        modelSales: o.modelSales.filter((x) => x.id !== row.id),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="fields two">
                  <Select
                    label={`Format datoteke ${i + 1}`}
                    value={row.format}
                    options={options([
                      'STL',
                      'STEP',
                      'STL + STEP',
                      'OBJ',
                      'Izvorni CAD',
                      'Celoten paket',
                    ])}
                    onChange={(format) =>
                      edit(row.id, { format: format as ModelSale['format'] })
                    }
                  />
                  <Num
                    label={`Cena datoteke ${i + 1}`}
                    value={row.price}
                    onChange={(price) => edit(row.id, { price })}
                    suffix="€"
                  />
                  <Text
                    label={`Naziv modela ${i + 1} (neobvezno)`}
                    value={row.name}
                    onChange={(name) => edit(row.id, { name })}
                  />
                  <Select
                    label={`Pravice uporabe datoteke ${i + 1}`}
                    value={row.rights}
                    options={options([
                      'Osebna uporaba',
                      'Komercialna uporaba',
                      'Po dogovoru',
                    ])}
                    onChange={(rights) =>
                      edit(row.id, { rights: rights as ModelSale['rights'] })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            className="button ghost"
            disabled={o.modelSales.length >= 100}
            onClick={() =>
              onChange({ modelSales: [...o.modelSales, newModelSale()] })
            }
          >
            <Plus size={15} />
            Dodaj datoteko ali paket
          </button>
          <div className="subtotal">
            <span>Prodaja modelov · ločeno od ur dela</span>
            <b>{eur(o.modelSales.reduce((n, row) => n + row.price, 0))}</b>
          </div>
          <p className="muted small">
            Cena paketa STL + STEP je enkratna. Prijateljski odstotek za delo ne
            zniža prodaje modela; skupni popust v EUR jo lahko zniža. Izvoz že
            izdelanega STEP in rekonstrukcija iz skena imata ločen obračun.
          </p>
        </>
      )}
    </Card>
  );
}
