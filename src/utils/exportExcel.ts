import ExcelJS from 'exceljs';
import type { CategorySummary, MonthBudget, Transaction } from '../types';

// ── Colors ──
const DARK_BLUE = 'FF1F3864';
const LIGHT_BLUE = 'FFD6E4F0';
const GREEN = 'FF548235';
const LIGHT_GREEN = 'FFE2EFDA';
const RED = 'FFC00000';
const YELLOW_HL = 'FFFFF2CC';
const WHITE = 'FFFFFFFF';
const LIGHT_GRAY = 'FFF5F5F5';
const BORDER_CLR = 'FFB4C6E7';
const GRAY_TEXT = 'FF808080';

const NUM_FMT = '#,##0.000';
const PCT_FMT = '+0%;-0%;0%';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Helpers ──
function border(): Partial<ExcelJS.Borders> {
  const b: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: BORDER_CLR } };
  return { top: b, bottom: b, left: b, right: b };
}

function solidFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

// ── Public API ──
export interface ExportData {
  budget: MonthBudget;
  expenseSummaries: CategorySummary[];
  incomeSummaries: CategorySummary[];
  transactions: Transaction[];
  year: number;
  month: number;
}

export async function exportMonthToExcel(data: ExportData): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Budget App';
  wb.created = new Date();

  buildBudgetSheet(wb, data);
  buildTransactionsSheet(wb, data);
  buildNotesSheet(wb, data);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Monthly_budget_${String(data.month).padStart(2, '0')}_${data.year}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
// Sheet 1 — Monthly Budget (matches Google Sheet layout)
// ══════════════════════════════════════════════════════════════
function buildBudgetSheet(wb: ExcelJS.Workbook, data: ExportData) {
  const { expenseSummaries, incomeSummaries, year, month } = data;
  const ws = wb.addWorksheet('Monthly Budget');

  // Column widths  A‑L (1‑12)
  [3, 30, 14, 14, 14, 14, 3, 24, 14, 14, 14, 14].forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const expCount = expenseSummaries.length;
  const incCount = incomeSummaries.length;
  const CAT_START = 28; // first category row
  const expLast = CAT_START + expCount - 1;
  const incLast = CAT_START + incCount - 1;
  // If no categories, make range safe (SUM of empty range = 0)
  const expRange = expCount > 0 ? `${CAT_START}:` : `${CAT_START}:`;
  void expRange; // ranges built inline below

  // ── Row 2‑5: Instructions ──
  ws.mergeCells('B2:F2');
  const instrTitle = ws.getCell('B2');
  instrTitle.value = 'GET STARTED';
  instrTitle.font = { bold: true, size: 12, color: { argb: DARK_BLUE } };

  ws.getCell('H2').value = 'NOTE';
  ws.getCell('H2').font = { bold: true, size: 12, color: { argb: DARK_BLUE } };

  ws.mergeCells('B3:G5');
  const instrBody = ws.getCell('B3');
  instrBody.value =
    'Set your starting balance in cell L8, then customize your categories ' +
    'and planned spending amounts in the tables below.';
  instrBody.font = { size: 10, color: { argb: GRAY_TEXT } };
  instrBody.alignment = { wrapText: true, vertical: 'top' };

  ws.mergeCells('H3:L4');
  ws.getCell('H3').value = 'Only edit highlighted cells. Try not to alter cells that contain a formula.';
  ws.getCell('H3').font = { size: 10, color: { argb: GRAY_TEXT } };
  ws.getCell('H3').alignment = { wrapText: true, vertical: 'top' };

  // ── Row 8: Title + Starting Balance ──
  ws.mergeCells('B8:F8');
  const title = ws.getCell('B8');
  title.value = 'Monthly Budget';
  title.font = { bold: true, size: 20, color: { argb: DARK_BLUE } };

  ws.mergeCells('J8:K8');
  const sbLabel = ws.getCell('J8');
  sbLabel.value = 'Starting balance:';
  sbLabel.font = { bold: true, size: 11 };
  sbLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  const sbCell = ws.getCell('L8');
  sbCell.value = 0;
  sbCell.numFmt = NUM_FMT;
  sbCell.font = { bold: true, size: 12 };
  sbCell.fill = solidFill(YELLOW_HL);
  sbCell.border = border();

  // ── Rows 13‑17: Savings Summary ──
  // Row 13: savings % = (income actual – expense actual) / starting balance
  const pctCell = ws.getCell('I13');
  pctCell.value = { formula: 'IFERROR((K26-E26)/L8,0)' };
  pctCell.numFmt = PCT_FMT;
  pctCell.font = { bold: true, size: 22, color: { argb: GREEN } };
  pctCell.alignment = { horizontal: 'center' };

  // Row 14: label
  ws.getCell('I14').value = 'Increase in total savings';
  ws.getCell('I14').font = { size: 10, color: { argb: GRAY_TEXT } };
  ws.getCell('I14').alignment = { horizontal: 'center' };

  // Row 15: saved amount
  const savedCell = ws.getCell('I15');
  savedCell.value = { formula: 'K26-E26' };
  savedCell.numFmt = NUM_FMT;
  savedCell.font = { bold: true, size: 14, color: { argb: GREEN } };
  savedCell.alignment = { horizontal: 'center' };

  // Row 16: balance labels
  ws.getCell('D16').value = 'START BALANCE';
  ws.getCell('D16').font = { bold: true, size: 9, color: { argb: GRAY_TEXT } };
  ws.getCell('D16').alignment = { horizontal: 'center' };
  ws.getCell('E16').value = 'END BALANCE';
  ws.getCell('E16').font = { bold: true, size: 9, color: { argb: GRAY_TEXT } };
  ws.getCell('E16').alignment = { horizontal: 'center' };
  ws.getCell('I16').value = 'Saved this month';
  ws.getCell('I16').font = { bold: true, size: 9, color: { argb: GRAY_TEXT } };
  ws.getCell('I16').alignment = { horizontal: 'center' };

  // Row 17: balance values
  ws.getCell('D17').value = { formula: 'L8' };
  ws.getCell('D17').numFmt = NUM_FMT;
  ws.getCell('D17').font = { bold: true, size: 14, color: { argb: DARK_BLUE } };
  ws.getCell('D17').alignment = { horizontal: 'center' };

  ws.getCell('E17').value = { formula: 'L8+K26-E26' };
  ws.getCell('E17').numFmt = NUM_FMT;
  ws.getCell('E17').font = { bold: true, size: 14, color: { argb: DARK_BLUE } };
  ws.getCell('E17').alignment = { horizontal: 'center' };

  // ── Rows 20‑22: Quick Summary ──
  ws.getCell('B20').value = 'Expenses';
  ws.getCell('B20').font = { bold: true, size: 14, color: { argb: RED } };
  ws.getCell('H20').value = 'Income';
  ws.getCell('H20').font = { bold: true, size: 14, color: { argb: GREEN } };

  // Planned
  ws.getCell('B21').value = 'Planned';
  ws.getCell('B21').font = { bold: true, size: 11 };
  ws.getCell('C21').value = { formula: 'D26' };
  ws.getCell('C21').numFmt = NUM_FMT;
  ws.getCell('C21').font = { bold: true };
  ws.getCell('H21').value = 'Planned';
  ws.getCell('H21').font = { bold: true, size: 11 };
  ws.getCell('I21').value = { formula: 'J26' };
  ws.getCell('I21').numFmt = NUM_FMT;
  ws.getCell('I21').font = { bold: true };

  // Actual
  ws.getCell('B22').value = 'Actual';
  ws.getCell('B22').font = { bold: true, size: 11 };
  ws.getCell('C22').value = { formula: 'E26' };
  ws.getCell('C22').numFmt = NUM_FMT;
  ws.getCell('C22').font = { bold: true };
  ws.getCell('H22').value = 'Actual';
  ws.getCell('H22').font = { bold: true, size: 11 };
  ws.getCell('I22').value = { formula: 'K26' };
  ws.getCell('I22').numFmt = NUM_FMT;
  ws.getCell('I22').font = { bold: true };

  // ── Row 24: Detail Section Headers ──
  for (const col of ['B', 'C', 'D', 'E', 'F']) {
    const c = ws.getCell(`${col}24`);
    c.fill = solidFill(DARK_BLUE);
    if (col === 'B') { c.value = 'Expenses'; c.font = { bold: true, size: 12, color: { argb: WHITE } }; }
    else { c.font = { color: { argb: WHITE } }; }
  }
  for (const col of ['H', 'I', 'J', 'K', 'L']) {
    const c = ws.getCell(`${col}24`);
    c.fill = solidFill(DARK_BLUE);
    if (col === 'H') { c.value = 'Income'; c.font = { bold: true, size: 12, color: { argb: WHITE } }; }
    else { c.font = { color: { argb: WHITE } }; }
  }

  // ── Row 25: Column Headers ──
  const hdrs = [
    { col: 'D', label: 'Planned' }, { col: 'E', label: 'Actual' }, { col: 'F', label: 'Diff.' },
    { col: 'J', label: 'Planned' }, { col: 'K', label: 'Actual' }, { col: 'L', label: 'Diff.' },
  ];
  hdrs.forEach(({ col, label }) => {
    const c = ws.getCell(`${col}25`);
    c.value = label;
    c.font = { bold: true, size: 10, color: { argb: DARK_BLUE } };
    const isIncome = col >= 'J';
    c.fill = solidFill(isIncome ? LIGHT_GREEN : LIGHT_BLUE);
    c.alignment = { horizontal: 'center' };
    c.border = border();
  });

  // ── Row 26: Totals (SUM formulas) ──
  // Expense totals
  const setTotalCell = (col: string, formula: string, bg: string) => {
    const c = ws.getCell(`${col}26`);
    c.value = { formula };
    c.numFmt = NUM_FMT;
    c.font = { bold: true, size: 11 };
    c.fill = solidFill(bg);
    c.border = border();
  };

  ws.getCell('B26').value = 'Totals';
  ws.getCell('B26').font = { bold: true, size: 11 };
  ws.getCell('B26').fill = solidFill(LIGHT_BLUE);
  ws.getCell('B26').border = border();

  const eSafe = expCount > 0 ? expLast : CAT_START;
  setTotalCell('D', `SUM(D${CAT_START}:D${eSafe})`, LIGHT_BLUE);
  setTotalCell('E', `SUM(E${CAT_START}:E${eSafe})`, LIGHT_BLUE);
  setTotalCell('F', `SUM(F${CAT_START}:F${eSafe})`, LIGHT_BLUE);

  ws.getCell('H26').value = 'Totals';
  ws.getCell('H26').font = { bold: true, size: 11 };
  ws.getCell('H26').fill = solidFill(LIGHT_GREEN);
  ws.getCell('H26').border = border();

  const iSafe = incCount > 0 ? incLast : CAT_START;
  setTotalCell('J', `SUM(J${CAT_START}:J${iSafe})`, LIGHT_GREEN);
  setTotalCell('K', `SUM(K${CAT_START}:K${iSafe})`, LIGHT_GREEN);
  setTotalCell('L', `SUM(L${CAT_START}:L${iSafe})`, LIGHT_GREEN);

  // ── Rows 28+: Category Data ──
  expenseSummaries.forEach((cat, i) => {
    const r = CAT_START + i;
    const bg = i % 2 === 0 ? WHITE : LIGHT_GRAY;

    const nameCell = ws.getCell(`B${r}`);
    nameCell.value = cat.name;
    nameCell.font = { size: 11 };
    nameCell.alignment = { horizontal: 'right' };
    nameCell.fill = solidFill(bg);
    nameCell.border = border();

    const dCell = ws.getCell(`D${r}`);
    dCell.value = cat.planned;
    dCell.numFmt = NUM_FMT;
    dCell.fill = solidFill(bg);
    dCell.border = border();

    const eCell = ws.getCell(`E${r}`);
    eCell.value = cat.actual;
    eCell.numFmt = NUM_FMT;
    eCell.fill = solidFill(bg);
    eCell.border = border();

    const fCell = ws.getCell(`F${r}`);
    fCell.value = { formula: `D${r}-E${r}` };
    fCell.numFmt = NUM_FMT;
    fCell.fill = solidFill(bg);
    fCell.border = border();
  });

  incomeSummaries.forEach((cat, i) => {
    const r = CAT_START + i;
    const bg = i % 2 === 0 ? WHITE : LIGHT_GRAY;

    const nameCell = ws.getCell(`H${r}`);
    nameCell.value = cat.name;
    nameCell.font = { size: 11 };
    nameCell.alignment = { horizontal: 'right' };
    nameCell.fill = solidFill(bg);
    nameCell.border = border();

    const jCell = ws.getCell(`J${r}`);
    jCell.value = cat.planned;
    jCell.numFmt = NUM_FMT;
    jCell.fill = solidFill(bg);
    jCell.border = border();

    const kCell = ws.getCell(`K${r}`);
    kCell.value = cat.actual;
    kCell.numFmt = NUM_FMT;
    kCell.fill = solidFill(bg);
    kCell.border = border();

    const lCell = ws.getCell(`L${r}`);
    lCell.value = { formula: `J${r}-K${r}` };
    lCell.numFmt = NUM_FMT;
    lCell.fill = solidFill(bg);
    lCell.border = border();
  });

  // Freeze panes below headers
  ws.views = [{ state: 'frozen', ySplit: 27, xSplit: 0 }];

  // Month subtitle
  ws.getCell('B9').value = `${MONTH_NAMES[month - 1]} ${year}`;
  ws.getCell('B9').font = { size: 12, color: { argb: GRAY_TEXT } };
}

// ══════════════════════════════════════════════════════════════
// Sheet 2 — Transactions
// ══════════════════════════════════════════════════════════════
function buildTransactionsSheet(wb: ExcelJS.Workbook, data: ExportData) {
  const { transactions, year, month } = data;
  const ws = wb.addWorksheet('Transactions');

  [3, 14, 24, 28, 14, 14].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Title
  ws.mergeCells('B1:F1');
  ws.getCell('B1').value = `Transactions — ${MONTH_NAMES[month - 1]} ${year}`;
  ws.getCell('B1').font = { bold: true, size: 14, color: { argb: DARK_BLUE } };

  // Column headers (row 3)
  const cols = [
    { col: 'B', label: 'Date' },
    { col: 'C', label: 'Category' },
    { col: 'D', label: 'Description' },
    { col: 'E', label: 'Type' },
    { col: 'F', label: 'Amount' },
  ];
  cols.forEach(({ col, label }) => {
    const c = ws.getCell(`${col}3`);
    c.value = label;
    c.font = { bold: true, size: 11, color: { argb: WHITE } };
    c.fill = solidFill(DARK_BLUE);
    c.border = border();
    c.alignment = { horizontal: 'center' };
  });

  // Data rows sorted by date
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  sorted.forEach((txn, i) => {
    const r = 4 + i;
    const bg = i % 2 === 0 ? WHITE : LIGHT_GRAY;

    ws.getCell(`B${r}`).value = txn.date;
    ws.getCell(`B${r}`).numFmt = 'YYYY-MM-DD';
    ws.getCell(`B${r}`).fill = solidFill(bg);
    ws.getCell(`B${r}`).border = border();

    ws.getCell(`C${r}`).value = txn.category;
    ws.getCell(`C${r}`).alignment = { horizontal: 'right' };
    ws.getCell(`C${r}`).fill = solidFill(bg);
    ws.getCell(`C${r}`).border = border();

    ws.getCell(`D${r}`).value = txn.description;
    ws.getCell(`D${r}`).fill = solidFill(bg);
    ws.getCell(`D${r}`).border = border();

    const typeCell = ws.getCell(`E${r}`);
    typeCell.value = txn.type === 'expense' ? 'Expense' : 'Income';
    typeCell.font = { color: { argb: txn.type === 'expense' ? RED : GREEN } };
    typeCell.fill = solidFill(bg);
    typeCell.border = border();
    typeCell.alignment = { horizontal: 'center' };

    ws.getCell(`F${r}`).value = txn.amount;
    ws.getCell(`F${r}`).numFmt = NUM_FMT;
    ws.getCell(`F${r}`).fill = solidFill(bg);
    ws.getCell(`F${r}`).border = border();
  });

  // Totals row
  if (sorted.length > 0) {
    const totRow = 4 + sorted.length + 1;
    ws.getCell(`E${totRow}`).value = 'Total';
    ws.getCell(`E${totRow}`).font = { bold: true };
    ws.getCell(`E${totRow}`).alignment = { horizontal: 'center' };
    ws.getCell(`F${totRow}`).value = { formula: `SUM(F4:F${4 + sorted.length - 1})` };
    ws.getCell(`F${totRow}`).numFmt = NUM_FMT;
    ws.getCell(`F${totRow}`).font = { bold: true };
    ws.getCell(`F${totRow}`).border = border();
  }

  ws.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];
}

// ══════════════════════════════════════════════════════════════
// Sheet 3 — Notes
// ══════════════════════════════════════════════════════════════
function buildNotesSheet(wb: ExcelJS.Workbook, data: ExportData) {
  const { budget, year, month } = data;
  const ws = wb.addWorksheet('Notes');

  [3, 24, 14, 50].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Title
  ws.mergeCells('B1:D1');
  ws.getCell('B1').value = `Notes — ${MONTH_NAMES[month - 1]} ${year}`;
  ws.getCell('B1').font = { bold: true, size: 14, color: { argb: DARK_BLUE } };

  // Month note
  ws.getCell('B3').value = 'Month Note';
  ws.getCell('B3').font = { bold: true, size: 12, color: { argb: DARK_BLUE } };

  ws.mergeCells('B4:D4');
  ws.getCell('B4').value = budget.monthNote || '(no note)';
  ws.getCell('B4').font = { size: 11, color: { argb: budget.monthNote ? 'FF000000' : GRAY_TEXT } };
  ws.getCell('B4').alignment = { wrapText: true };
  ws.getRow(4).height = 40;

  // Category notes header
  ws.getCell('B6').value = 'Category Notes';
  ws.getCell('B6').font = { bold: true, size: 12, color: { argb: DARK_BLUE } };

  const noteHeaders = [
    { col: 'B', label: 'Category' },
    { col: 'C', label: 'Type' },
    { col: 'D', label: 'Note' },
  ];
  noteHeaders.forEach(({ col, label }) => {
    const c = ws.getCell(`${col}7`);
    c.value = label;
    c.font = { bold: true, size: 11, color: { argb: WHITE } };
    c.fill = solidFill(DARK_BLUE);
    c.border = border();
  });

  let row = 8;
  const writeNotes = (categories: typeof budget.expenseCategories, type: string) => {
    categories.forEach((cat) => {
      if (!cat.note) return;
      const bg = (row - 8) % 2 === 0 ? WHITE : LIGHT_GRAY;
      ws.getCell(`B${row}`).value = cat.name;
      ws.getCell(`B${row}`).alignment = { horizontal: 'right' };
      ws.getCell(`B${row}`).fill = solidFill(bg);
      ws.getCell(`B${row}`).border = border();

      ws.getCell(`C${row}`).value = type;
      ws.getCell(`C${row}`).fill = solidFill(bg);
      ws.getCell(`C${row}`).border = border();
      ws.getCell(`C${row}`).alignment = { horizontal: 'center' };

      ws.getCell(`D${row}`).value = cat.note;
      ws.getCell(`D${row}`).fill = solidFill(bg);
      ws.getCell(`D${row}`).border = border();
      ws.getCell(`D${row}`).alignment = { wrapText: true };

      row++;
    });
  };

  writeNotes(budget.expenseCategories, 'Expense');
  writeNotes(budget.incomeCategories, 'Income');

  if (row === 8) {
    ws.getCell('B8').value = '(no category notes)';
    ws.getCell('B8').font = { color: { argb: GRAY_TEXT } };
  }
}
