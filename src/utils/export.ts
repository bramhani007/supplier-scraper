import { Supplier } from '../types';

// ── CSV helpers ───────────────────────────────────────────────────────────────

// Prevent CSV formula injection: Excel/Calc treat cells starting with
// =, +, -, @, | as formulas. Prefix with a tab to force text interpretation.
const FORMULA_CHARS = /^[=+\-@|]/;

function sanitiseCSVCell(value: string): string {
  const s = value.replace(/[\r\n]+/g, ' ').trim();
  return FORMULA_CHARS.test(s) ? `\t${s}` : s;
}

function escapeCSV(value: string): string {
  const cell = sanitiseCSVCell(value);
  // Wrap in double-quotes if the cell contains commas, quotes, or newlines
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\t')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

// ── Column definitions ────────────────────────────────────────────────────────

type SupplierRow = [string, ...string[]];

function buildHeaders(): string[] {
  return [
    'Name', 'Location', 'GST Number', 'Phone', 'Email', 'Website',
    'Products', 'Nature of Business', 'Total Employees', 'Annual Turnover',
    'IEC', 'CIN No', 'IndiaMART URL', 'External URL', 'Source Type', 'Created At',
  ];
}

function buildRow(s: Supplier): SupplierRow {
  return [
    s.name,
    s.location        || '',
    s.gst_number      || '',
    s.phone           || '',
    s.email           || '',
    s.website         || '',
    s.products        || '',
    s.nature_of_business || '',
    s.total_employees || '',
    s.annual_turnover || '',
    s.iec             || '',
    s.cin_no          || '',
    s.indiamart_url   || '',
    s.external_url    || '',
    s.source_type,
    s.created_at,
  ];
}

// ── Public exports ────────────────────────────────────────────────────────────

export function exportToCSV(data: Supplier[], filename = 'suppliers'): void {
  const headers = buildHeaders();
  const rows = data.map(buildRow);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\r\n');

  // BOM for Excel to recognise UTF-8
  downloadFile('\uFEFF' + csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function exportToJSON(data: Supplier[], filename = 'suppliers'): void {
  downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json');
}

// ── Download helper ───────────────────────────────────────────────────────────

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  // Sanitise filename to prevent path traversal in the download prompt
  link.download = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke after a tick to ensure the download has started
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
