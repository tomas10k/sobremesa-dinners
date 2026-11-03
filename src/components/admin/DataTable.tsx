"use client";

import { useMemo, useState } from "react";
import { cellText, weekLabel, type Col } from "@/lib/admin/columns";
import { CellEditor } from "./CellEditor";
import { exportSheets } from "./excel";

type Row = { id: string };

export function DataTable<T extends Row>({ title, rows, columns, onSave, actions, exportName, onOpen }: {
  title: string;
  rows: T[];
  columns: Col<T>[];
  onSave: (row: T, key: keyof T & string, value: unknown) => Promise<void>;
  /** Buttons shown when rows are selected. */
  actions?: (selected: T[], clear: () => void) => React.ReactNode;
  exportName: string;
  /** If set, each row gets an "Abrir" button. */
  onOpen?: (row: T) => void;
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string; key: string } | null>(null);

  const filterCols = columns.filter((c) => c.filter);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter((r) => {
      for (const [key, value] of Object.entries(filters)) {
        if (!value) continue;
        const col = columns.find((c) => c.key === key)!;
        const v = r[col.key] as unknown;
        if (col.type === "multi" || col.type === "weeks") {
          if (!(v as string[]).includes(value)) return false;
        } else if (col.type === "bool") {
          if (String(Boolean(v)) !== value) return false;
        } else if (String(v ?? "") !== value) return false;
      }
      return !q || columns.some((c) => cellText(c, r).toLowerCase().includes(q));
    });
    if (sort) {
      const col = columns.find((c) => c.label === sort.key)!;
      out = [...out].sort((a, b) => {
        const av = col.get ? col.get(a) : (a[col.key] as unknown);
        const bv = col.get ? col.get(b) : (b[col.key] as unknown);
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * sort.dir;
        return String(av ?? "").localeCompare(String(bv ?? ""), "es") * sort.dir;
      });
    }
    return out;
  }, [rows, columns, filters, search, sort]);

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));
  const clear = () => setSelected(new Set());

  function filterOptions(col: Col<T>): { value: string; label: string }[] {
    if (col.type === "bool") return [{ value: "true", label: "Sí" }, { value: "false", label: "No" }];
    if (col.type === "weeks") {
      const weeks = [...new Set(rows.flatMap((r) => r[col.key] as string[]))].sort();
      return weeks.map((w) => ({ value: w, label: weekLabel(w) }));
    }
    if (col.options) return col.options;
    const values = [...new Set(rows.map((r) => String(r[col.key] ?? "")).filter(Boolean))].sort();
    return values.map((v) => ({ value: v, label: v }));
  }

  return (
    <section className="dt">
      <div className="dt-bar">
        <h2 className="dt-title">{title} <span className="dt-count">{visible.length}{visible.length !== rows.length ? ` de ${rows.length}` : ""}</span></h2>
        <input className="dt-search" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button
          className="a-btn"
          onClick={() => exportSheets(exportName, [{ name: title, columns, rows: visible }])}
          disabled={visible.length === 0}
        >
          Exportar a Excel
        </button>
      </div>

      {filterCols.length > 0 && (
        <div className="dt-filters">
          {filterCols.map((c) => (
            <label key={c.label} className="dt-filter">
              <span>{c.label}</span>
              <select value={filters[c.key] ?? ""} onChange={(e) => setFilters({ ...filters, [c.key]: e.target.value })}>
                <option value="">Todos</option>
                {filterOptions(c).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          ))}
          {Object.values(filters).some(Boolean) && (
            <button className="a-link" onClick={() => setFilters({})}>Quitar filtros</button>
          )}
        </div>
      )}

      {selectedRows.length > 0 && actions && (
        <div className="dt-actions">
          <span>{selectedRows.length} seleccionados</span>
          {actions(selectedRows, clear)}
          <button className="a-link" onClick={clear}>Deseleccionar</button>
        </div>
      )}

      <div className="dt-scroll">
        <table>
          <thead>
            <tr>
              <th className="dt-check">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos"
                  checked={allVisibleSelected}
                  onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((r) => r.id)))}
                />
              </th>
              {onOpen && <th />}
              {columns.map((c) => (
                <th key={c.label} style={{ minWidth: c.width ?? 120 }}>
                  <button
                    className="dt-sort"
                    onClick={() => setSort(sort?.key === c.label ? { key: c.label, dir: sort.dir === 1 ? -1 : 1 } : { key: c.label, dir: 1 })}
                  >
                    {c.label}{sort?.key === c.label ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td className="dt-empty" colSpan={columns.length + 2}>Nada por aquí todavía.</td></tr>
            )}
            {visible.map((r) => (
              <tr key={r.id} className={selected.has(r.id) ? "sel" : ""}>
                <td className="dt-check">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar"
                    checked={selected.has(r.id)}
                    onChange={() => {
                      const next = new Set(selected);
                      if (next.has(r.id)) next.delete(r.id);
                      else next.add(r.id);
                      setSelected(next);
                    }}
                  />
                </td>
                {onOpen && <td><button className="a-link" onClick={() => onOpen(r)}>Abrir</button></td>}
                {columns.map((c) => {
                  const isEditing = editing?.id === r.id && editing.key === c.label;
                  const editable = !c.readOnly && !c.get;
                  return (
                    <td
                      key={c.label}
                      className={`${editable ? "editable" : ""} ${c.type === "long" ? "long" : ""}`}
                      onClick={() => {
                        if (!editable || isEditing) return;
                        if (c.type === "bool") onSave(r, c.key, !r[c.key]);
                        else setEditing({ id: r.id, key: c.label });
                      }}
                    >
                      {isEditing ? (
                        <CellEditor
                          col={c}
                          value={r[c.key]}
                          onCancel={() => setEditing(null)}
                          onSave={async (v) => {
                            setEditing(null);
                            await onSave(r, c.key, v);
                          }}
                        />
                      ) : (
                        <Cell col={c} row={r} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Cell<T>({ col, row }: { col: Col<T>; row: T }) {
  const text = cellText(col, row);
  if (col.type === "url" && text) {
    return (
      <a href={text} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        {text.replace(/^https?:\/\/(www\.)?/, "").slice(0, 32)} ↗
      </a>
    );
  }
  if (col.type === "long" && text.length > 90) return <span title={text}>{text.slice(0, 90)}…</span>;
  return <>{text || <span className="dt-blank">—</span>}</>;
}
