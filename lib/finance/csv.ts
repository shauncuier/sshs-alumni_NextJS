/**
 * CSV for the accounts' exports. Starts with a UTF-8 byte-order mark so Excel opens
 * Bangla text correctly, quotes every cell, and neutralises cells that a spreadsheet
 * would run as a formula (=, +, -, @ at the start).
 */

function cell(value: string | number | null | undefined): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
