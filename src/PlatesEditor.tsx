import { Copy, Plus, Trash2, Layers } from 'lucide-react';
import { Num, Text, Select, Toggle } from './ui';
import {
  uid,
  dec,
  calculate,
  type Order,
  type Settings,
  type Plate,
} from './model';
export function newPlate(o: Order, seed = false): Plate {
  const time = seed
    ? o.batch
      ? o.batchHours
      : (o.hours + o.minutes / 60) * o.quantity
    : 0;
  const totalMinutes = Number((time * 60).toFixed(6));
  return {
    id: uid(),
    name: seed ? 'Plošča 1' : 'Nova plošča',
    printerId: o.printerId,
    materialId: o.materialId,
    pieces: seed ? o.quantity : 1,
    runs: 1,
    grams: seed ? o.grams * o.quantity + o.extraGrams : 0,
    hours: Math.floor(totalMinutes / 60),
    minutes: Number((totalMinutes % 60).toFixed(6)),
    notes: '',
  };
}
export function PlatesEditor({
  order: o,
  settings: s,
  onChange,
}: {
  order: Order;
  settings: Settings;
  onChange: (patch: Partial<Order>) => void;
}) {
  const result = calculate(o, s);
  const edit = (id: string, patch: Partial<Plate>) =>
    onChange({
      plates: o.plates.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  return (
    <div className="plate-editor">
      <Toggle
        checked={o.platesEnabled}
        onChange={(platesEnabled) =>
          onChange({
            platesEnabled,
            ...(platesEnabled && !o.plates.length
              ? { plates: [newPlate(o, true)] }
              : {}),
          })
        }
      >
        Shranjuj in računaj po ploščah iz slicerja
      </Toggle>
      {o.platesEnabled && (
        <>
          <p className="muted small">
            Prepiši skupni čas in grame vsake plošče iz Bambu Studio,
            PrusaSlicerja ali drugega slicerja. Poraba vključuje modele,
            podpore, purge in odpad. Število kosov služi ceni na kos; ne množi
            časa ali materiala. Ponovitve pomenijo ponovni tisk cele plošče.
          </p>
          {o.plates.map((p, i) => (
            <div className="order-option-item" key={p.id}>
              <div className="option-heading">
                <b>
                  <Layers size={15} />
                  Plošča {i + 1}
                </b>
                <div>
                  <button
                    className="icon-button"
                    aria-label={`Kopiraj ploščo ${i + 1}`}
                    disabled={o.plates.length >= 200}
                    onClick={() =>
                      onChange({
                        plates: [
                          ...o.plates,
                          { ...p, id: uid(), name: p.name + ' – kopija' },
                        ],
                      })
                    }
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Odstrani ploščo ${i + 1}`}
                    onClick={() =>
                      onChange({
                        plates: o.plates.filter((x) => x.id !== p.id),
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <Text
                label={`Ime plošče ${i + 1}`}
                value={p.name}
                onChange={(name) => edit(p.id, { name })}
              />
              <div className="fields two plate-fields">
                <Select
                  label={`Tiskalnik plošče ${i + 1}`}
                  value={p.printerId || o.printerId}
                  options={s.printers.map((x) => ({
                    value: x.id,
                    label: x.name,
                  }))}
                  onChange={(printerId) => edit(p.id, { printerId })}
                />
                <Select
                  label={`Material plošče ${i + 1}`}
                  value={p.materialId || o.materialId}
                  options={s.materials.map((x) => ({
                    value: x.id,
                    label: x.name,
                  }))}
                  onChange={(materialId) => edit(p.id, { materialId })}
                />
                <Num
                  label={`Kosi na plošči ${i + 1}`}
                  value={p.pieces}
                  min={1}
                  max={100000}
                  integer
                  onChange={(pieces) => edit(p.id, { pieces })}
                  suffix="kos"
                />
                <Num
                  label={`Ponovitve plošče ${i + 1}`}
                  value={p.runs}
                  min={1}
                  max={100000}
                  integer
                  onChange={(runs) => edit(p.id, { runs })}
                  suffix="×"
                />
                <Num
                  label={`Skupna poraba plošče ${i + 1}`}
                  value={p.grams}
                  onChange={(grams) => edit(p.id, { grams })}
                  suffix="g"
                />
                <Num
                  label={`Ure cele plošče ${i + 1}`}
                  value={p.hours}
                  onChange={(hours) => edit(p.id, { hours })}
                  suffix="h"
                />
                <Num
                  label={`Minute cele plošče ${i + 1}`}
                  value={p.minutes}
                  max={59.999999}
                  onChange={(minutes) => edit(p.id, { minutes })}
                  suffix="min"
                />
              </div>
              <label className="field">
                <span>Opomba / profil slicerja – plošča {i + 1}</span>
                <textarea
                  value={p.notes}
                  maxLength={2000}
                  onChange={(e) => edit(p.id, { notes: e.target.value })}
                  placeholder="Npr. levi nosilci, ASA, višina sloja …"
                />
              </label>
              {result.plateDetails[i]?.power === 0 && (
                <p className="warning">
                  Za ta tiskalnik in material še ni podane moči. Elektrika
                  trenutno ni vračunana.
                </p>
              )}
              <div className="plate-summary">
                {dec(p.pieces * p.runs)} kos · {dec(p.grams * p.runs)} g ·{' '}
                {dec((p.hours + p.minutes / 60) * p.runs)} h skupaj
              </div>
            </div>
          ))}
          {!o.plates.length && (
            <p className="warning">
              Dodaj vsaj eno ploščo. Tisk trenutno nima materiala ali časa.
            </p>
          )}
          <button
            className="button ghost"
            disabled={o.plates.length >= 200}
            onClick={() => onChange({ plates: [...o.plates, newPlate(o)] })}
          >
            <Plus size={15} />
            Dodaj ploščo
          </button>
          <p className="muted small plate-footer">
            Plošče se shranijo skupaj s projektom in njegovim cenikom. Lepilo,
            rezerva in drugi neposredni stroški se dodajo enkrat za celoten
            projekt. Vsaka plošča uporablja en material; večmaterialne plošče za
            zdaj vnesi kot ločene postavke s pravilno razporejenim časom.
          </p>
        </>
      )}
    </div>
  );
}
