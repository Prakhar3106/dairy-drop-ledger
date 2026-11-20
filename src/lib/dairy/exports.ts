export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
  width?: number | undefined;
  numeric?: boolean | undefined;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportExcel<T>(opts: { filename: string; sheet: string; title: string; subtitle?: string | undefined; columns: ExportColumn<T>[]; rows: T[] }) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DairySetu';
  const ws = wb.addWorksheet(opts.sheet.slice(0, 31));
  ws.addRow([opts.title]).font = { bold: true, size: 14 };
  if (opts.subtitle) ws.addRow([opts.subtitle]).font = { italic: true, size: 10 };
  ws.addRow([]);
  const header = ws.addRow(opts.columns.map((c) => c.header));
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE5D5' } };
  });
  for (const row of opts.rows) ws.addRow(opts.columns.map((c) => c.value(row) ?? ''));
  opts.columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width ?? Math.max(12, c.header.length + 4);
  });
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${opts.filename}.xlsx`);
}

export async function exportPdf<T>(opts: {
  filename: string;
  title: string;
  subtitle?: string | undefined;
  columns: ExportColumn<T>[];
  rows: T[];
  summary?: [string, string][] | undefined;
  landscape?: boolean | undefined;
}) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: opts.landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  // jsPDF's built-in fonts cannot draw ₹ or Hindi, so amounts use "Rs." in PDFs.
  const clean = (v: unknown) => String(v ?? '').replace(/₹/g, 'Rs. ');
  doc.setFontSize(15);
  doc.text(clean(opts.title), 40, 44);
  doc.setFontSize(9);
  doc.setTextColor(110);
  if (opts.subtitle) doc.text(clean(opts.subtitle), 40, 60);
  doc.text(`Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · DairySetu`, 40, opts.subtitle ? 73 : 60);
  let startY = opts.subtitle ? 88 : 76;
  if (opts.summary?.length) {
    autoTable(doc, {
      startY,
      body: opts.summary.map(([k, v]) => [clean(k), clean(v)]),
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 160 } },
    });
    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }
  autoTable(doc, {
    startY,
    head: [opts.columns.map((c) => c.header)],
    body: opts.rows.map((r) => opts.columns.map((c) => clean(c.value(r)))),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [36, 91, 64], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 245, 235] },
    columnStyles: Object.fromEntries(opts.columns.map((c, i) => [i, c.numeric ? { halign: 'right' as const } : {}])),
  });
  doc.save(`${opts.filename}.pdf`);
}
