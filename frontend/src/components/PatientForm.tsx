import type { FormEvent } from "react";
import type { Field, FormValues, Meta } from "@/lib/api";

type Props = {
  meta: Meta;
  values: FormValues;
  busy: boolean;
  onChange: (key: string, value: string) => void;
  onExample: (name: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/** The patient form: one card per group of tests (vitals, urine, blood, history). */
export default function PatientForm({ meta, values, busy, onChange, onExample, onSubmit }: Props) {
  return (
    // noValidate: let people type any value (e.g. 1.012) without the browser's step checks
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Fill in an example patient:</span>
        {Object.keys(meta.examples).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onExample(name)}
            className="rounded-full border border-border bg-surface px-3 py-1 font-medium hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>

      {meta.groups.map((group) => (
        <fieldset key={group.name} className="rounded-xl border border-border bg-surface p-5">
          <legend className="float-left mb-4 w-full text-base font-semibold">{group.name}</legend>
          {/* items-end: inputs in a row line up even when one label wraps onto two lines */}
          <div className="clear-both grid items-end gap-x-4 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            {group.fields.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={values[field.key] ?? ""}
                onChange={onChange}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-6 py-2.5 font-medium text-on-accent hover:bg-accent-hover disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {busy ? "Predicting..." : "Predict"}
        </button>
        <p className="text-sm text-muted">
          Leave a box empty if that test wasn&apos;t done - the model fills it in.
        </p>
      </div>
    </form>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  const id = `field-${field.key}`;

  // yes/no-style fields: a two-button switch (radio buttons underneath, for keyboards and screen readers)
  if (field.kind === "choice") {
    return (
      <fieldset>
        <legend className="text-sm font-medium">{field.label}</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1">
          {field.options.map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-md px-3 py-1.5 text-center text-sm text-muted has-checked:bg-raised has-checked:font-medium has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent"
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
      </fieldset>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {field.label}
        {field.unit && <span className="ml-1.5 font-normal text-muted">{field.unit}</span>}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step={field.step}
        value={value}
        placeholder="not measured"
        onChange={(event) => onChange(field.key, event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 tabular-nums placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
    </div>
  );
}
