import type { FormEvent } from "react";
import { Icon } from "@/components/Icons";
import InfoTip from "@/components/InfoTip";
import type { Field, FormValues, Meta } from "@/lib/api";
import { aboutText } from "@/lib/glossary";
import { flagFor, referenceText, type Flag } from "@/lib/ranges";

type Props = {
  meta: Meta;
  values: FormValues;
  busy: boolean;
  loadId: number; // changes whenever a sample case or reset fills the form -> boxes flash in turn
  onChange: (key: string, value: string) => void;
  onExample: (name: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

// Columns of the lab-report table: test | result | reference | flag.
// On phones each row stacks: test + flag, then the result box, then the reference.
const COLUMNS =
  "grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_12rem_6.5rem_3.5rem] lg:grid-cols-[minmax(0,1fr)_14rem_7rem_3.5rem]";

/** The patient form, laid out like a lab report: sample cases, then one section per group of tests. */
export default function PatientForm({ meta, values, busy, loadId, onChange, onExample, onReset, onSubmit }: Props) {
  const labFields = meta.groups.flatMap((group) => group.fields).filter((f) => referenceText(f.key));
  const flagged = labFields.filter((f) => flagFor(f.key, values[f.key] ?? "")).length;

  return (
    // noValidate: let people type any value (e.g. 1.012) without the browser's step checks
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <section className="rounded-md border border-border bg-surface shadow-sheet">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-2.5">
          <h2 className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Sample cases</h2>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-sm font-mono text-xs tracking-wide text-muted uppercase hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Icon name="reset" className="size-3.5" />
            Reset form
          </button>
        </div>
        {/* the API lists the cases mildest first (ml/predict.py, ml/future_ckd.py); the hairlines
            between them are the border colour showing through the 1px gaps */}
        <div className="grid gap-px overflow-hidden rounded-b-md bg-border sm:grid-cols-2">
          {Object.keys(meta.examples).map((name, i, names) => (
            <button
              key={name}
              type="button"
              onClick={() => onExample(name)}
              className="group flex items-center gap-4 bg-surface px-5 py-4 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:last:odd:col-span-2"
            >
              <span className="font-mono text-xs text-muted">Case {String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-sm font-medium">{name.charAt(0).toUpperCase() + name.slice(1)}</span>
              <Level value={i + 1} of={names.length} />
              <Icon
                name="arrow"
                className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </button>
          ))}
        </div>
      </section>

      <p className="font-mono text-xs leading-relaxed text-muted">
        Leave a box empty if that test wasn&apos;t done - the model fills it in. Reference ranges
        are typical adult values (labs differ slightly) and are only a reading aid: the model
        never sees them.
      </p>

      {meta.groups.map((group, i) => (
        <Section
          key={group.name}
          letter={String.fromCharCode(65 + i)}
          name={group.name}
          fields={group.fields}
          firstRow={meta.groups.slice(0, i).reduce((n, g) => n + g.fields.length, 0)}
          values={values}
          loadId={loadId}
          onChange={onChange}
        />
      ))}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border-strong bg-surface/95 px-4 py-3 backdrop-blur sm:bottom-4 sm:mx-0 sm:rounded-md sm:border sm:shadow-[0_10px_30px_-12px_rgb(0_0_0/0.3)]">
        <div className="flex items-center gap-x-5 gap-y-2">
          <button
            type="submit"
            disabled={busy}
            className="group inline-flex flex-1 items-center justify-center gap-2 rounded bg-accent px-6 py-2.5 font-medium text-on-accent transition hover:bg-accent-hover active:scale-[0.97] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-none"
          >
            {busy && <Icon name="spinner" className="size-4 animate-spin" />}
            {busy ? "Analysing..." : "Predict"}
            {!busy && <Icon name="arrow" className="size-4 transition-transform group-hover:translate-x-1" />}
          </button>
          <p className="font-mono text-xs text-muted" aria-live="polite">
            <span className={flagged ? "font-semibold text-risk-high" : ""}>{flagged}</span>
            <span className="sm:hidden"> flagged</span>
            <span className="hidden sm:inline">
              {" "}of {labFields.length} results outside the reference range
            </span>
          </p>
        </div>
      </div>
    </form>
  );
}

/** How far along a sample case is, from mildest to most severe: rising bars, like a signal meter. */
function Level({ value, of }: { value: number; of: number }) {
  return (
    <span aria-hidden className="flex h-3.5 shrink-0 items-end gap-0.5">
      {Array.from({ length: of }, (_, i) => (
        <span
          key={i}
          className={`w-1 rounded-[1px] ${i < value ? "bg-brand" : "bg-border-strong"}`}
          style={{ height: `${((i + 1) / of) * 100}%` }}
        />
      ))}
    </span>
  );
}

function Section({
  letter,
  name,
  fields,
  firstRow,
  values,
  loadId,
  onChange,
}: {
  letter: string;
  name: string;
  fields: Field[];
  firstRow: number; // position of this section's first row in the whole form, for the flash cascade
  values: FormValues;
  loadId: number;
  onChange: (key: string, value: string) => void;
}) {
  const labTests = fields.filter((f) => referenceText(f.key));
  const flagged = labTests.filter((f) => flagFor(f.key, values[f.key] ?? "")).length;
  return (
    <fieldset className="rounded-md border border-border bg-surface shadow-sheet">
      <legend className="float-left flex w-full items-baseline gap-3 border-b border-border px-5 py-3.5">
        <span className="font-mono text-sm font-semibold text-brand">{letter}</span>
        <span className="font-serif text-xl font-semibold tracking-tight">{name}</span>
        <span className="ml-auto shrink-0 font-mono text-xs whitespace-nowrap text-muted">
          {fields.length} {labTests.length === fields.length ? "tests" : "items"}
          {labTests.length > 0 &&
            (flagged ? (
              <span className="text-risk-high"> · {flagged} flagged</span>
            ) : (
              <span> · in range</span>
            ))}
        </span>
      </legend>
      <div className="clear-both">
        <div
          aria-hidden
          className={`${COLUMNS} hidden border-b border-border px-5 py-2 font-mono text-[0.6875rem] tracking-[0.12em] text-muted uppercase sm:grid`}
        >
          <span>{labTests.length ? "Test" : "Item"}</span>
          <span>{labTests.length ? "Result" : "Answer"}</span>
          <span>{labTests.length ? "Reference" : ""}</span>
          <span className="text-right">{labTests.length ? "Flag" : ""}</span>
        </div>
        <div className="divide-y divide-border">
          {fields.map((field, i) => (
            <Row
              key={field.key}
              field={field}
              value={values[field.key] ?? ""}
              row={firstRow + i}
              loadId={loadId}
              onChange={onChange}
            />
          ))}
        </div>
      </div>
    </fieldset>
  );
}

function Row({
  field,
  value,
  row,
  loadId,
  onChange,
}: {
  field: Field;
  value: string;
  row: number;
  loadId: number;
  onChange: (key: string, value: string) => void;
}) {
  const id = `field-${field.key}`;
  const reference = referenceText(field.key);
  const about = aboutText(field.key);
  const flag = flagFor(field.key, value);
  const describedBy = [reference && `${id}-ref`, flag && `${id}-flag`].filter(Boolean).join(" ") || undefined;
  // after a sample case loads, each box flashes in turn, top to bottom (key={loadId} re-runs it)
  const flashClass = loadId ? "ink-fill" : "";
  const flashStyle = loadId ? { animationDelay: `${row * 35}ms` } : undefined;

  return (
    // focus-within: a reading-ruler mark on the row being edited
    <div
      className={`grid ${COLUMNS} px-5 py-3 transition-colors focus-within:shadow-[inset_3px_0_0_var(--brand)] ${
        flag ? "bg-risk-high-soft/60" : "hover:bg-surface-muted/50"
      }`}
    >
      <div className="relative flex min-w-0 items-center gap-1">
        {field.kind === "choice" ? (
          <span id={`${id}-label`} className="text-sm font-medium">
            {field.label}
          </span>
        ) : (
          <label htmlFor={id} className="text-sm font-medium">
            {field.label}
          </label>
        )}
        {about && (
          <InfoTip label={field.label}>
            <TestNote field={field} about={about} reference={reference} value={value} flag={flag} />
          </InfoTip>
        )}
      </div>

      <div className="col-span-2 sm:col-span-1">
        {field.kind === "choice" ? (
          // a two-button switch (radio buttons underneath, for keyboards and screen readers)
          <div
            key={loadId}
            role="radiogroup"
            aria-labelledby={`${id}-label`}
            aria-describedby={describedBy}
            style={flashStyle}
            className={`grid grid-cols-2 gap-0.5 rounded border bg-surface-muted p-0.5 ${flashClass} ${
              flag ? "border-risk-high/50" : "border-border-strong/70"
            }`}
          >
            {field.options.map((option) => (
              <label
                key={option.value}
                className="cursor-pointer rounded-sm px-2 py-1 text-center text-sm whitespace-nowrap text-muted transition-colors hover:text-foreground has-checked:bg-raised has-checked:font-medium has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent"
              >
                <input
                  type="radio"
                  name={field.key}
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => onChange(field.key, option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        ) : (
          // the unit sits inside the box, on the right
          <div
            key={loadId}
            style={flashStyle}
            className={`flex items-center rounded border bg-surface transition-shadow focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 ${flashClass} ${
              flag ? "border-risk-high/50" : "border-border-strong/70"
            }`}
          >
            <input
              id={id}
              type="number"
              inputMode="decimal"
              min={0}
              step={field.step}
              value={value}
              placeholder="not measured"
              aria-describedby={describedBy}
              onChange={(event) => onChange(field.key, event.target.value)}
              className={`w-full min-w-0 flex-1 bg-transparent px-2.5 py-1.5 font-mono tabular-nums outline-none placeholder:font-sans placeholder:text-sm placeholder:text-muted/70 ${
                flag ? "font-semibold text-risk-high" : ""
              }`}
            />
            {field.unit && <span className="shrink-0 pr-2.5 font-mono text-xs whitespace-nowrap text-muted">{field.unit}</span>}
          </div>
        )}
      </div>

      <span
        id={reference ? `${id}-ref` : undefined}
        className={`col-span-2 font-mono text-xs text-muted sm:col-span-1 ${reference ? "" : "hidden sm:block"}`}
      >
        <span className="sm:hidden">Reference </span>
        {reference ?? ""}
      </span>

      <span className="col-start-2 row-start-1 text-right sm:col-start-auto sm:row-start-auto">
        {/* key: a changed flag (e.g. H -> L) pops in again */}
        {flag && <FlagMark key={flag} id={`${id}-flag`} flag={flag} />}
      </span>
    </div>
  );
}

const FLAGS: Record<Exclude<Flag, null>, { mark: string; text: string; word: string }> = {
  high: { mark: "▲", text: "H", word: "high" },
  low: { mark: "▼", text: "L", word: "low" },
  abnormal: { mark: "●", text: "ABN", word: "abnormal" },
};

/** The (i) note for one row: what the item is, its reference range, and this patient's value. */
function TestNote({
  field,
  about,
  reference,
  value,
  flag,
}: {
  field: Field;
  about: string;
  reference: string | null;
  value: string;
  flag: Flag;
}) {
  // the urine dipstick grades (unit "0-5") read better as a bare number
  const unit = /^\d/.test(field.unit) ? "" : field.unit;
  const answer =
    field.kind === "choice"
      ? field.options.find((option) => option.value === value)?.label
      : value.trim() && `${value.trim()} ${unit}`.trim();
  return (
    <>
      <p className="flex items-baseline justify-between gap-3 border-b border-border px-3.5 py-2 font-mono text-[0.6875rem] tracking-[0.12em] text-foreground uppercase">
        {field.label}
        {field.unit && <span className="shrink-0 tracking-normal text-muted normal-case">{field.unit}</span>}
      </p>
      <p className="px-3.5 py-2.5 text-sm leading-relaxed text-foreground">{about}</p>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 border-t border-border bg-surface-muted/60 px-3.5 py-2 font-mono text-xs">
        {reference && (
          <>
            <dt className="text-muted">Reference</dt>
            <dd>{reference}</dd>
          </>
        )}
        <dt className="text-muted">This patient</dt>
        <dd>
          {answer || <span className="text-muted">not measured</span>}
          {flag ? (
            <span className="font-semibold text-risk-high">
              {" "}
              <span aria-hidden className="text-[0.5rem]">
                {FLAGS[flag].mark}
              </span>{" "}
              {FLAGS[flag].word}
            </span>
          ) : (
            reference && answer && <span className="text-risk-low"> · in range</span>
          )}
        </dd>
      </dl>
    </>
  );
}

/** H / L / ABN tag, like the flag column of a printed lab report. */
function FlagMark({ id, flag }: { id: string; flag: Exclude<Flag, null> }) {
  const { mark, text, word } = FLAGS[flag];
  return (
    <span
      id={id}
      className="pop inline-flex items-center gap-1 rounded-sm bg-risk-high px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold text-on-risk"
    >
      <span aria-hidden className="text-[0.5rem]">
        {mark}
      </span>
      <span aria-hidden>{text}</span>
      <span className="sr-only">Flag: {word}</span>
    </span>
  );
}
