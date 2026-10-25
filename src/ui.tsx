import { useState, useEffect, type ReactNode } from 'react';
export function Num({
  label,
  value,
  onChange,
  suffix,
  max = 1e9,
  min = 0,
  integer = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  max?: number;
  min?: number;
  integer?: boolean;
}) {
  const [text, setText] = useState(String(value).replace('.', ','));
  useEffect(() => setText(String(value).replace('.', ',')), [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="number-input">
        <input
          type="text"
          inputMode={integer ? 'numeric' : 'decimal'}
          value={text}
          onChange={(e) => {
            const t = e.target.value;
            if (!/^\d*([.,]\d*)?$/.test(t)) return;
            setText(t);
            const n = Number(t.replace(',', '.'));
            if (
              Number.isFinite(n) &&
              n >= min &&
              n <= max &&
              (!integer || Number.isInteger(n))
            )
              onChange(n);
          }}
          onBlur={() => setText(String(value).replace('.', ','))}
          aria-label={label}
        />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  );
}
export function Text({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        maxLength={type === 'text' ? 200 : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((x) => (
          <option key={x.value} value={x.value}>
            {x.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export const options = (a: readonly string[]) =>
  a.map((x) => ({ value: x, label: x }));
export function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}
export function Card({
  title,
  icon,
  children,
  aside,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-heading">
        <h2>
          {icon}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
