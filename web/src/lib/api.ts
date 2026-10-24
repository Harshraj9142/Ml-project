// Talks to the Python API (../api.py). next.config.ts forwards /api/* to it.
// Both pages use the same calls with a different base path:
//   Part 1 (diagnosis)    "/api"         -> /api/meta,        /api/predict
//   Part 2 (future risk)  "/api/future"  -> /api/future/meta, /api/future/predict

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
  about: string; // e.g. "tested on 80 patients it never saw during training."
  stats: { label: string; value: string }[]; // test scores, already formatted
  stats_note: string;
  labels: { positive: string; negative: string; probability: string; start: string };
  groups: { name: string; fields: Field[] }[];
  examples: Record<string, Record<string, number | string>>;
};

export type Prediction = {
  prediction: string;
  positive: boolean; // true = "Likely CKD" / "Higher risk"
  probability_ckd: number;
  missing_features: string[];
};

// What the user types is kept as text; it becomes numbers only when sent to the API.
export type FormValues = Record<string, string>;

async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.detail === "string" ? body.detail : `The API answered ${res.status}`;
}

export async function fetchMeta(base: string): Promise<Meta> {
  const res = await fetch(`${base}/meta`, { cache: "no-store" });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function predict(base: string, values: FormValues, meta: Meta): Promise<Prediction> {
  const res = await fetch(`${base}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record: toRecord(values, meta) }),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
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
