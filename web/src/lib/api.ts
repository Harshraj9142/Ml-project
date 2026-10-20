// Talks to the Python API (../api.py). next.config.ts forwards /api/* to it.

export type ChoiceOption = { value: string; label: string };

export type Field =
  | {
      kind: "number";
      key: string;
      label: string;
      unit: string;
      default: number;
      step: number;
      decimals: number;
    }
  | {
      kind: "choice";
      key: string;
      label: string;
      unit: string;
      default: string;
      options: ChoiceOption[];
    };

export type Meta = {
  model_name: string;
  metrics: { accuracy: number; precision: number; recall: number; roc_auc: number; n_test: number };
  groups: { name: string; fields: Field[] }[];
  examples: Record<string, Record<string, number | string>>;
};

export type Prediction = {
  prediction: "CKD" | "Not CKD";
  probability_ckd: number;
  missing_features: string[];
};

// What the user types is kept as text; it becomes numbers only when sent to the API.
export type FormValues = Record<string, string>;

export async function fetchMeta(): Promise<Meta> {
  const res = await fetch("/api/meta", { cache: "no-store" });
  if (!res.ok) throw new Error(`The API answered ${res.status}`);
  return res.json();
}

export async function predict(values: FormValues, meta: Meta): Promise<Prediction> {
  const res = await fetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record: toRecord(values, meta) }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : `The API answered ${res.status}`;
    throw new Error(detail);
  }
  return res.json();
}

function allFields(meta: Meta): Field[] {
  return meta.groups.flatMap((group) => group.fields);
}

/** Form text -> what the API expects: numbers as numbers, empty boxes as null ("not measured"). */
function toRecord(values: FormValues, meta: Meta): Record<string, number | string | null> {
  const record: Record<string, number | string | null> = {};
  for (const field of allFields(meta)) {
    const text = (values[field.key] ?? "").trim();
    if (field.kind === "choice") {
      record[field.key] = text || null;
    } else {
      record[field.key] = text === "" || Number.isNaN(Number(text)) ? null : Number(text);
    }
  }
  return record;
}

/** Starting values (no record) or an example patient -> form text. */
export function toFormValues(meta: Meta, record?: Record<string, number | string>): FormValues {
  const values: FormValues = {};
  for (const field of allFields(meta)) {
    const value = record?.[field.key] ?? field.default;
    values[field.key] =
      field.kind === "number" && typeof value === "number"
        ? value.toFixed(field.decimals)
        : String(value);
  }
  return values;
}

export function fieldLabel(meta: Meta, key: string): string {
  return allFields(meta).find((field) => field.key === key)?.label ?? key;
}
