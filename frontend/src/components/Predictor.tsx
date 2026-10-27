"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import GfrStages from "@/components/GfrStages";
import { Icon } from "@/components/Icons";
import PatientForm from "@/components/PatientForm";
import ResultPanel from "@/components/ResultPanel";
import { fetchMeta, predict, toFormValues, type FormValues, type Meta, type Prediction } from "@/lib/api";
import { pause } from "@/lib/motion";

// The model answers in a few milliseconds; keep the "analysing" animation on screen at least
// this long so the step is visible during a demo. Set to 0 to show results immediately.
const ANALYSIS_MS = 800;

/**
 * Loads the form definition from the Python API, then shows the risk checker.
 * `api` is "/api" for Part 1 (diagnosis) or "/api/future" for Part 2 (future risk).
 */
export default function Predictor({ api }: { api: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0); // bumped by "Try again" to reload

  useEffect(() => {
    let cancelled = false;
    fetchMeta(api)
      .then((m) => {
        if (!cancelled) setMeta(m);
      })
      .catch((err) => {
        if (!cancelled) setFailure(err instanceof Error ? err.message : "Unknown error");
      });
    return () => {
      cancelled = true;
    };
  }, [api, attempt]);

  if (failure) {
    return (
      <ApiUnavailable
        message={failure}
        onRetry={() => {
          setFailure(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (!meta) return <Loading />;
  return <RiskChecker api={api} meta={meta} />;
}

function RiskChecker({ api, meta }: { api: string; meta: Meta }) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(meta));
  const [result, setResult] = useState<Prediction | null>(null);
  const [stale, setStale] = useState(false); // form edited since the last prediction
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadId, setLoadId] = useState(0); // bumped when a sample case or reset fills the form
  const resultRef = useRef<HTMLDivElement>(null);
  // Part 2 has an eGFR box: show where its value sits on the kidney-function stages
  const egfrField = meta.groups.flatMap((group) => group.fields).find((field) => /egfr/i.test(field.key));

  function edit(next: FormValues) {
    setValues(next);
    if (result) setStale(true);
  }

  function load(next: FormValues) {
    edit(next);
    setLoadId((n) => n + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    // on phones the result sits below the long form - bring it into view to watch the analysis
    if (window.matchMedia("(max-width: 1023px)").matches) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    try {
      const [prediction] = await Promise.all([predict(api, values, meta), pause(ANALYSIS_MS)]);
      setResult(prediction);
      setStale(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The prediction failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
      <div className="rise">
        <PatientForm
          meta={meta}
          values={values}
          busy={busy}
          loadId={loadId}
          onChange={(key, value) => edit({ ...values, [key]: value })}
          onExample={(name) => load(toFormValues(meta, meta.examples[name]))}
          onReset={() => load(toFormValues(meta))}
          onSubmit={handleSubmit}
        />
      </div>
      <div ref={resultRef} className="rise scroll-mt-4 lg:sticky lg:top-6" style={{ animationDelay: "120ms" }}>
        <ResultPanel meta={meta} result={result} stale={stale} busy={busy} error={error}>
          {egfrField && <GfrStages value={values[egfrField.key] ?? ""} unit={egfrField.unit} />}
        </ResultPanel>
      </div>
    </div>
  );
}

function ApiUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="max-w-2xl rounded-md border border-border bg-surface p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <Icon name="warning" className="size-5 text-risk-high" />
        Can&apos;t reach the prediction API
      </h2>
      <p className="mt-1 text-sm text-muted">{message}</p>
      <p className="mt-3 text-sm text-muted">
        The models run in Python. Open a second terminal in the project folder and start the API
        with:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-muted px-4 py-3 font-mono text-sm">
        {"source .venv/bin/activate\nuvicorn backend.api:app --reload --port 8000"}
      </pre>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Try again
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading the form" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer h-48 rounded-md border border-border bg-surface" />
        ))}
      </div>
      <div className="shimmer h-64 rounded-md border border-border bg-surface" />
    </div>
  );
}
