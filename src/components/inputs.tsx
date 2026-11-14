"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { optionsOf, parseDate, type Answer, type Answers, type Entry, type Field, type FieldValue, type Opt, type Question } from "@/lib/intake";
import { tr, type Language } from "@/lib/survey";
import { BodyMap } from "./bodymap";
import { Icon } from "./icons";

type Change = (value: Answer | undefined) => void;
type Props = { question: Question; value: Answer | undefined; onChange: Change; answers: Answers; lang: Language; invalid: boolean; labelledBy: string; describedBy?: string };
const ui = (lang: Language) => (en: string, fi: string) => lang === "fi" ? fi : en;

/* ----------------------------------------------------------------- choices */

function Choice({ name, options, value, onChange, lang, layout, labelledBy, describedBy, invalid }: {
  name: string; options: Opt[]; value: string | undefined; onChange: (id: string) => void; lang: Language;
  layout: "cards" | "list" | "pills" | "yesno"; labelledBy: string; describedBy?: string; invalid?: boolean;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={`options options--${layout}`}>
      {options.map(option => (
        <label key={option.id} className="option">
          <input type="radio" name={name} value={option.id} checked={value === option.id} onChange={() => onChange(option.id)} />
          <span className="option__mark" aria-hidden="true" />
          <span className="option__body">
            {option.icon && <span className="option__icon"><Icon name={option.icon} size={22} /></span>}
            <span className="option__text">
              <span className="option__label">{tr(lang, option.label)}</span>
              {option.hint && <span className="option__hint">{tr(lang, option.hint)}</span>}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function Multi({ name, options, value, onChange, lang, layout, max, labelledBy, describedBy }: {
  name: string; options: Opt[]; value: string[]; onChange: (next: string[]) => void; lang: Language;
  layout: "cards" | "list" | "pills"; max?: number; labelledBy: string; describedBy?: string;
}) {
  const t = ui(lang);
  const atMax = max !== undefined && value.length >= max;
  const toggle = (option: Opt) => {
    if (value.includes(option.id)) return onChange(value.filter(id => id !== option.id));
    if (option.exclusive) return onChange([option.id]);
    onChange([...value.filter(id => !options.find(candidate => candidate.id === id)?.exclusive), option.id]);
  };
  return (
    <>
      <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy} className={`options options--${layout}`}>
        {options.map(option => (
          <label key={option.id} className="option option--multi">
            <input type="checkbox" name={name} value={option.id} checked={value.includes(option.id)} disabled={atMax && !value.includes(option.id) && !option.exclusive} onChange={() => toggle(option)} />
            <span className="option__mark option__mark--box" aria-hidden="true" />
            <span className="option__body">
              {option.icon && <span className="option__icon"><Icon name={option.icon} size={22} /></span>}
              <span className="option__text">
                <span className="option__label">{tr(lang, option.label)}</span>
                {option.hint && <span className="option__hint">{tr(lang, option.hint)}</span>}
              </span>
            </span>
          </label>
        ))}
      </div>
      {max !== undefined && <p className="hint" aria-live="polite">{t(`${value.length} of ${max} chosen`, `${value.length}/${max} valittu`)}</p>}
    </>
  );
}

/* ----------------------------------------------------------------- numbers */

function NumberBox({ id, value, onChange, min, max, decimals = 0, step, start, soft, unit, label, invalid, lang, stepper = true, describedBy, placeholder, labelledBy }: {
  id: string; value: number | undefined; onChange: (value: number | undefined) => void; min: number; max: number; decimals?: number; step?: number;
  start?: number; soft?: [number, number]; unit?: string; label?: string; invalid?: boolean; lang: Language; stepper?: boolean; describedBy?: string; placeholder?: string; labelledBy?: string;
}) {
  const t = ui(lang);
  const [text, setText] = useState(value === undefined ? "" : String(value));
  const increment = step ?? (decimals > 0 ? 1 / 10 ** decimals : 1);
  const parse = (raw: string) => { const parsed = Number(raw.replace(",", ".").trim()); return raw.trim() === "" || Number.isNaN(parsed) ? undefined : parsed; };
  const set = (next: number | undefined, raw?: string) => { setText(raw ?? (next === undefined ? "" : String(next))); onChange(next); };
  const adjust = (direction: 1 | -1) => {
    const current = parse(text);
    if (current === undefined) return set(start ?? min);
    const next = Math.min(max, Math.max(min, Number((current + direction * increment).toFixed(decimals))));
    set(next);
  };
  const outOfSoft = value !== undefined && soft !== undefined && (value < soft[0] || value > soft[1]) && value >= min && value <= max;
  const bad = invalid && (value === undefined || value < min || value > max);
  return (
    <div className="numberbox">
      <div className="numberbox__row">
        {stepper && <button type="button" className="step-btn" onClick={() => adjust(-1)} aria-label={t("Decrease", "Vähennä")}><Minus size={20} aria-hidden="true" /></button>}
        <input
          id={id} className="input input--number" inputMode={decimals > 0 ? "decimal" : "numeric"} autoComplete="off" value={text}
          aria-label={label} aria-labelledby={label ? undefined : labelledBy} aria-invalid={bad || undefined} aria-describedby={describedBy} placeholder={placeholder}
          onChange={event => set(parse(event.target.value), event.target.value)}
        />
        {stepper && <button type="button" className="step-btn" onClick={() => adjust(1)} aria-label={t("Increase", "Lisää")}><Plus size={20} aria-hidden="true" /></button>}
        {unit && <span className="numberbox__unit">{unit}</span>}
      </div>
      {outOfSoft && <p className="soft-warn" role="status">{t("That looks unusual. Please double-check it.", "Tämä vaikuttaa epätavalliselta. Tarkista luku.")}</p>}
      {bad && value !== undefined && <p className="error-text" role="alert">{t(`Please enter a number between ${min} and ${max}.`, `Anna luku väliltä ${min}–${max}.`)}</p>}
    </div>
  );
}

function YearBox({ id, value, onChange, lang, label, invalid, labelledBy }: { id: string; value: number | undefined; onChange: (value: number | undefined) => void; lang: Language; label?: string; invalid?: boolean; labelledBy?: string }) {
  const thisYear = new Date().getFullYear();
  return <NumberBox id={id} value={value} onChange={onChange} min={1900} max={thisYear} stepper={false} lang={lang} invalid={invalid} label={label} labelledBy={labelledBy} placeholder="YYYY" />;
}

function DateBox({ value, onChange, lang, invalid, labelledBy, describedBy }: { value: string | undefined; onChange: (value: string | undefined) => void; lang: Language; invalid: boolean; labelledBy: string; describedBy?: string }) {
  const t = ui(lang);
  const [year, month, day] = typeof value === "string" ? value.split("-") : ["", "", ""];
  const [d, setD] = useState(day ? String(Number(day)) : "");
  const [m, setM] = useState(month ? String(Number(month)) : "");
  const [y, setY] = useState(year ?? "");
  const emit = (nd: string, nm: string, ny: string) => {
    const iso = ny.length === 4 && nm && nd ? `${ny}-${nm.padStart(2, "0")}-${nd.padStart(2, "0")}` : undefined;
    onChange(iso && parseDate(iso) ? iso : undefined);
  };
  const names = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat(lang === "fi" ? "fi-FI" : "en-GB", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2001, index, 1))));
  const bad = invalid && value === undefined;
  return (
    <div className="datebox" role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      <label className="field field--day">
        <span className="field__label">{t("Day", "Päivä")}</span>
        <input className="input" inputMode="numeric" autoComplete="bday-day" maxLength={2} placeholder="DD" value={d} aria-invalid={bad || undefined}
          onChange={event => { const next = event.target.value.replace(/\D/g, ""); setD(next); emit(next, m, y); }} />
      </label>
      <label className="field field--month">
        <span className="field__label">{t("Month", "Kuukausi")}</span>
        <select className="input" autoComplete="bday-month" value={m} aria-invalid={bad || undefined} onChange={event => { setM(event.target.value); emit(d, event.target.value, y); }}>
          <option value="">{t("Choose", "Valitse")}</option>
          {names.map((name, index) => <option key={name} value={String(index + 1)}>{name}</option>)}
        </select>
      </label>
      <label className="field field--year">
        <span className="field__label">{t("Year", "Vuosi")}</span>
        <input className="input" inputMode="numeric" autoComplete="bday-year" maxLength={4} placeholder="YYYY" value={y} aria-invalid={bad || undefined}
          onChange={event => { const next = event.target.value.replace(/\D/g, ""); setY(next); emit(d, m, next); }} />
      </label>
    </div>
  );
}

const bands: [number, [string, string]][] = [[0, ["None", "Ei lainkaan"]], [3, ["Mild", "Lievä"]], [6, ["Moderate", "Kohtalainen"]], [8, ["Severe", "Voimakas"]], [10, ["Very severe", "Erittäin voimakas"]]];
function Scale({ name, value, onChange, low, high, lang, labelledBy, describedBy }: { name: string; value: number | undefined; onChange: (value: number) => void; low: string; high: string; lang: Language; labelledBy: string; describedBy?: string }) {
  const t = ui(lang);
  const band = value === undefined ? undefined : bands.find(([limit]) => value <= limit)![1];
  return (
    <div className="scale">
      <div role="radiogroup" aria-labelledby={labelledBy} aria-describedby={describedBy} className="scale__row">
        {Array.from({ length: 11 }, (_, index) => (
          <label key={index} className="scale__item" style={{ "--level": index } as CSSProperties}>
            <input type="radio" name={name} value={index} checked={value === index} onChange={() => onChange(index)} />
            <span>{index}</span>
          </label>
        ))}
      </div>
      <div className="scale__ends" aria-hidden="true"><span>{low}</span><span>{high}</span></div>
      <p className="scale__read" aria-live="polite">{value === undefined ? t("Tap a number", "Valitse luku") : <><strong>{value}</strong> / 10 · {tr(lang, band!)}</>}</p>
    </div>
  );
}

/* -------------------------------------------------------------------- text */

function TextBox({ id, value, onChange, max, short, placeholder, labelledBy, describedBy, invalid, lang }: { id: string; value: string; onChange: (value: string) => void; max: number; short?: boolean; placeholder?: string; labelledBy: string; describedBy?: string; invalid?: boolean; lang: Language }) {
  const t = ui(lang);
  return (
    <div className="textbox">
      {short
        ? <input id={id} className="input" maxLength={max} value={value} placeholder={placeholder} aria-labelledby={labelledBy} aria-describedby={describedBy} aria-invalid={invalid || undefined} autoComplete="off" onChange={event => onChange(event.target.value)} />
        : <textarea id={id} className="input input--area" rows={5} maxLength={max} value={value} placeholder={placeholder} aria-labelledby={labelledBy} aria-describedby={describedBy} aria-invalid={invalid || undefined} onChange={event => onChange(event.target.value)} />}
      {!short && <p className="hint textbox__count" aria-hidden="true">{t(`${value.length} of ${max} characters`, `${value.length}/${max} merkkiä`)}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ fields */

function FieldBox({ field, value, onChange, lang, invalid, idPrefix }: { field: Field; value: FieldValue | undefined; onChange: (value: FieldValue | undefined) => void; lang: Language; invalid: boolean; idPrefix: string }) {
  const t = ui(lang);
  const id = `${idPrefix}-${field.id}`;
  const empty = value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
  const bad = invalid && empty && !field.optional;
  const label = tr(lang, field.label);
  const caption = <span className="field__label" id={`${id}-label`}>{label}{field.optional && <span className="field__opt"> · {t("optional", "valinnainen")}</span>}</span>;
  if (field.type === "text") {
    return <div className="field">{caption}<input id={id} className="input" maxLength={field.max ?? 200} value={typeof value === "string" ? value : ""} placeholder={field.placeholder ? tr(lang, field.placeholder) : undefined} aria-labelledby={`${id}-label`} aria-invalid={bad || undefined} autoComplete="off" onChange={event => onChange(event.target.value || undefined)} /></div>;
  }
  if (field.type === "number") {
    return <div className="field">{caption}<NumberBox id={id} value={typeof value === "number" ? value : undefined} onChange={onChange} min={field.min} max={field.max} decimals={field.decimals} start={field.start} soft={field.soft} unit={field.unit ? tr(lang, field.unit) : undefined} labelledBy={`${id}-label`} invalid={invalid && !field.optional || (invalid && value !== undefined)} lang={lang} /></div>;
  }
  if (field.type === "year") {
    return <div className="field">{caption}<YearBox id={id} value={typeof value === "number" ? value : undefined} onChange={onChange} lang={lang} labelledBy={`${id}-label`} invalid={invalid && !field.optional || (invalid && value !== undefined)} /></div>;
  }
  if (field.type === "choice") {
    if (field.options.length > 4) {
      return (
        <div className="field">{caption}
          <select id={id} className="input" value={typeof value === "string" ? value : ""} aria-labelledby={`${id}-label`} aria-invalid={bad || undefined} onChange={event => onChange(event.target.value || undefined)}>
            <option value="">{t("Choose…", "Valitse…")}</option>
            {field.options.map(option => <option key={option.id} value={option.id}>{tr(lang, option.label)}</option>)}
          </select>
        </div>
      );
    }
    return <div className="field">{caption}<Choice name={id} options={field.options} value={typeof value === "string" ? value : undefined} onChange={onChange} lang={lang} layout="pills" labelledBy={`${id}-label`} invalid={bad} /></div>;
  }
  const selected = Array.isArray(value) ? value : [];
  return <div className="field">{caption}<Multi name={id} options={field.options} value={selected} onChange={next => onChange(next.length ? next : undefined)} lang={lang} layout="pills" labelledBy={`${id}-label`} /></div>;
}

function Fields({ fields, entry, onChange, lang, invalid, idPrefix }: { fields: Field[]; entry: Entry; onChange: (entry: Entry) => void; lang: Language; invalid: boolean; idPrefix: string }) {
  return (
    <div className="fields">
      {fields.map(field => (
        <FieldBox key={field.id} field={field} idPrefix={idPrefix} lang={lang} invalid={invalid} value={entry[field.id]}
          onChange={next => { const copy: Entry = { ...entry }; if (next === undefined) delete copy[field.id]; else copy[field.id] = next; onChange(copy); }} />
      ))}
    </div>
  );
}

function Entries({ question, value, onChange, lang, invalid }: { question: Extract<Question, { type: "list" }>; value: Entry[]; onChange: (entries: Entry[]) => void; lang: Language; invalid: boolean }) {
  const t = ui(lang);
  const entries = value.length ? value : [{}];
  const previous = useRef(entries.length);
  const last = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    if (entries.length > previous.current) last.current?.querySelector<HTMLElement>("input, select")?.focus();
    previous.current = entries.length;
  }, [entries.length]);
  const noun = tr(lang, question.item);
  return (
    <div className="entries">
      {entries.map((entry, index) => (
        <fieldset key={index} className="entry" ref={index === entries.length - 1 ? last : undefined}>
          <legend>{noun} {index + 1}</legend>
          <Fields fields={question.fields} entry={entry} lang={lang} invalid={invalid} idPrefix={`${question.id}-${index}`} onChange={next => onChange(entries.map((item, at) => at === index ? next : item))} />
          {entries.length > 1 && <button type="button" className="btn btn--ghost btn--sm entry__remove" onClick={() => onChange(entries.filter((_, at) => at !== index))}><Trash2 size={16} aria-hidden="true" />{t("Remove", "Poista")}<span className="sr-only"> {noun} {index + 1}</span></button>}
        </fieldset>
      ))}
      {entries.length < question.max && <button type="button" className="btn btn--secondary" onClick={() => onChange([...entries, {}])}><Plus size={18} aria-hidden="true" />{t("Add another", "Lisää toinen")} · {noun.toLowerCase()}</button>}
    </div>
  );
}

/* ------------------------------------------------------------------ router */

/** Draws the right control for a question. The answer shape it reports is the one the engine validates. */
export function QuestionInput({ question, value, onChange, answers, lang, invalid, labelledBy, describedBy }: Props) {
  const placeholder = "placeholder" in question && question.placeholder ? tr(lang, question.placeholder) : undefined;
  switch (question.type) {
    case "choice":
      return <Choice name={question.id} options={question.options} value={typeof value === "string" ? value : undefined} onChange={onChange} lang={lang} layout={question.layout ?? "list"} labelledBy={labelledBy} describedBy={describedBy} invalid={invalid && value === undefined} />;
    case "multi": {
      const options = optionsOf(question, answers);
      return <Multi name={question.id} options={options} value={Array.isArray(value) ? value as string[] : []} onChange={next => onChange(next.length ? next : undefined)} lang={lang} layout={options.some(option => option.icon) ? "cards" : "list"} max={question.max} labelledBy={labelledBy} describedBy={describedBy} />;
    }
    case "number":
      return <NumberBox id={question.id} value={typeof value === "number" ? value : undefined} onChange={onChange} min={question.min} max={question.max} decimals={question.decimals} step={question.step} start={question.start} soft={question.soft} unit={tr(lang, question.unit)} labelledBy={labelledBy} describedBy={describedBy} invalid={invalid} lang={lang} />;
    case "year":
      return <YearBox id={question.id} value={typeof value === "number" ? value : undefined} onChange={onChange} lang={lang} labelledBy={labelledBy} invalid={invalid} />;
    case "date":
      return <DateBox value={typeof value === "string" ? value : undefined} onChange={onChange} lang={lang} invalid={invalid} labelledBy={labelledBy} describedBy={describedBy} />;
    case "scale":
      return <Scale name={question.id} value={typeof value === "number" ? value : undefined} onChange={onChange} low={tr(lang, question.low)} high={tr(lang, question.high)} lang={lang} labelledBy={labelledBy} describedBy={describedBy} />;
    case "text":
      return <TextBox id={question.id} value={typeof value === "string" ? value : ""} onChange={next => onChange(next || undefined)} max={question.max ?? 500} short={question.short} placeholder={placeholder} labelledBy={labelledBy} describedBy={describedBy} invalid={invalid && !question.optional && !value} lang={lang} />;
    case "body":
      return <BodyMap value={Array.isArray(value) ? value as string[] : []} onChange={next => onChange(next.length ? next : undefined)} lang={lang} labelledBy={labelledBy} />;
    case "form":
      return <Fields fields={question.fields} entry={value && typeof value === "object" && !Array.isArray(value) ? value as Entry : {}} lang={lang} invalid={invalid} idPrefix={question.id}
        onChange={entry => onChange(Object.keys(entry).length ? entry : undefined)} />;
    case "list":
      return <Entries question={question} value={Array.isArray(value) ? value as Entry[] : []} onChange={onChange} lang={lang} invalid={invalid} />;
  }
}
