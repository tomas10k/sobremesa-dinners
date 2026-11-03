import { cellText, type Col } from "@/lib/admin/columns";

type Sheet<T> = { name: string; columns: Col<T>[]; rows: T[] };

/** Downloads an .xlsx with one sheet per table, using the same labels as the dashboard. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exportSheets(fileName: string, sheets: Sheet<any>[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const data = s.rows.map((r) => Object.fromEntries(s.columns.map((c) => [c.label, cellText(c, r)])));
    const ws = XLSX.utils.json_to_sheet(data, { header: s.columns.map((c) => c.label) });
    ws["!cols"] = s.columns.map((c) => ({ wch: Math.min(60, Math.max(12, Math.round((c.width ?? 120) / 7))) }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${fileName}-${date}.xlsx`);
}
