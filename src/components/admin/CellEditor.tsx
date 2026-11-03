"use client";

import { useRef, useState } from "react";
import type { Col } from "@/lib/admin/columns";
import { isoToPacificInput, pacificInputToISO } from "@/lib/tz";

/** Inline editor for one cell. Enter or blur saves; Escape cancels. */
export function CellEditor<T>({ col, value, onSave, onCancel }: {
  col: Col<T>;
  value: unknown;
  onSave: (value: unknown) => void;
  onCancel: () => void;
}) {
  const initial =
    col.type === "datetime" ? isoToPacificInput(value as string | null)
    : col.type === "weeks" ? (value as string[]).join(", ")
    : col.type === "multi" ? ""
    : String(value ?? "");
  const [draft, setDraft] = useState(initial);
  const [multi, setMulti] = useState<string[]>(col.type === "multi" ? (value as string[]) : []);

  // Enter saves and unmounts the input, which can also fire blur; only save once.
  const done = useRef(false);

  function commit(raw = draft) {
    if (done.current) return;
    done.current = true;
    if (raw === initial && col.type !== "multi") return onCancel();
    switch (col.type) {
      case "int": {
        const n = Number.parseInt(raw, 10);
        return Number.isNaN(n) ? onCancel() : onSave(n);
      }
      case "datetime": return onSave(raw ? pacificInputToISO(raw) : null);
      case "weeks": return onSave(raw.split(/[\s,]+/).filter(Boolean));
      case "select": return onSave(raw || null);
      default: return onSave(raw.trim() === "" ? null : raw);
    }
  }

  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter" && col.type !== "long") commit();
  };

  if (col.type === "select") {
    return (
      <select autoFocus className="ce" value={draft} onChange={(e) => commit(e.target.value)} onBlur={onCancel} onKeyDown={keys}>
        <option value="">—</option>
        {col.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  if (col.type === "multi") {
    return (
      <div className="ce-pop" onClick={(e) => e.stopPropagation()}>
        {col.options?.map((o) => (
          <label key={o.value} className="ce-check">
            <input
              type="checkbox"
              checked={multi.includes(o.value)}
              onChange={() => setMulti(multi.includes(o.value) ? multi.filter((x) => x !== o.value) : [...multi, o.value])}
            />
            {o.label}
          </label>
        ))}
        <div className="ce-row">
          <button className="a-btn primary" onClick={() => onSave(multi)}>Guardar</button>
          <button className="a-link" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    );
  }

  if (col.type === "long") {
    return (
      <div className="ce-pop wide" onClick={(e) => e.stopPropagation()}>
        <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={keys} rows={8} />
        <div className="ce-row">
          <button className="a-btn primary" onClick={() => commit()}>Guardar</button>
          <button className="a-link" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <input
      autoFocus
      className="ce"
      type={col.type === "int" ? "number" : col.type === "datetime" ? "datetime-local" : "text"}
      value={draft}
      placeholder={col.type === "weeks" ? "2026-11-09, 2026-11-16" : undefined}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => commit()}
      onKeyDown={keys}
    />
  );
}
