"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import PatientForm from "@/components/PatientForm";
import ResultPanel from "@/components/ResultPanel";
import { fetchMeta, predict, toFormValues, type FormValues, type Meta, type Prediction } from "@/lib/api";

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
  const resultRef = useRef<HTMLDivElement>(null);

  function edit(next: FormValues) {
    setValues(next);
    if (result) setStale(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await predict(api, values, meta));
      setStale(false);
      // on phones the result sits below the long form - bring it into view
      if (window.matchMedia("(max-width: 1023px)").matches) {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The prediction failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <PatientForm
        meta={meta}
        values={values}
        busy={busy}
        onChange={(key, value) => edit({ ...values, [key]: value })}
        onExample={(name) => edit(toFormValues(meta, meta.examples[name]))}
        onSubmit={handleSubmit}
      />
      <div ref={resultRef} className="scroll-mt-4 lg:sticky lg:top-6">
        <ResultPanel meta={meta} result={result} stale={stale} busy={busy} error={error} />
      </div>
    </div>
  );
}

function ApiUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="max-w-2xl rounded-xl border border-border bg-surface p-6">
      <h2 className="font-semibold">Can&apos;t reach the prediction API</h2>
      <p className="mt-1 text-sm text-muted">{message}</p>
      <p className="mt-3 text-sm text-muted">
        The models run in Python. Open a second terminal in the project folder and start the API
        with:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-muted px-4 py-3 font-mono text-sm">
        {"source .venv/bin/activate\nuvicorn api:app --reload --port 8000"}
      </pre>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Try again
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading the form" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-surface" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
    </div>
  );
}
