import type { CategoryPlan } from '../types';

// ===== CSV Parsing =====
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuote = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuote = true;
        } else if (ch === ',') {
          cells.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }
  return rows;
}

// ===== Fetch Google Sheet as CSV =====
export async function fetchSheetCSV(sheetUrl: string, sheetName?: string): Promise<string> {
  // Extract spreadsheet ID from URL
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error('Invalid Google Sheets URL');
  const spreadsheetId = match[1];

  let csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
  if (sheetName) csvUrl += `&sheet=${encodeURIComponent(sheetName)}`;

  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error(`Failed to fetch sheet: ${response.status}`);
  return response.text();
}

// ===== Parse Amount: handles "£1.234", "1,234.5", "1.234", etc =====
function parseAmount(raw: string): number {
  if (!raw) return 0;
  // Remove currency symbols and whitespace
  let cleaned = raw.replace(/[£$€]/g, '').replace(/د\.أ/g, '').replace(/JD/gi, '').trim();
  // Handle comma as thousands or decimal separator
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // "1,234.5" or "1.234,5" — determine which is decimal
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Comma is decimal: "1.234,50" → "1234.50"
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal: "1,234.50" → "1234.50"
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Single comma: always treat as decimal separator for JD (3 decimal places)
    // "375,000" = 375.000 JD, "2,530" = 2.530 JD
    cleaned = cleaned.replace(',', '.');
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

// ===== Parse Date: handles DD/MM/YYYY, YYYY-MM-DD =====
function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // DD/MM/YYYY
  const dmy = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
  // YYYY-MM-DD
  const ymd = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) return new Date(+ymd[1], +ymd[2] - 1, +ymd[3]);
  return null;
}

// ===== Parse Summary Sheet =====
export interface SheetBudgetData {
  year: number;
  month: number;
  expenseCategories: CategoryPlan[];
  incomeCategories: CategoryPlan[];
}

function isHeaderLike(cell: string, ...keywords: string[]): boolean {
  const lower = cell.toLowerCase().trim();
  return keywords.some((kw) => lower.includes(kw));
}

export function parseSummarySheet(csv: string, year: number, month: number): SheetBudgetData {
  const rows = parseCSV(csv);
  const expenseCategories: CategoryPlan[] = [];
  const incomeCategories: CategoryPlan[] = [];

  // Strategy: Find "Totals" row — category data rows follow right after it.
  // Detect column positions from the Totals row (it has amounts we can identify).
  let totalsRowIdx = -1;
  let expNameCol = -1;
  let expPlannedCol = -1;
  let incNameCol = -1;
  let incPlannedCol = -1;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (isHeaderLike(row[c], 'totals', 'الإجمالي', 'إجمالي')) {
        if (totalsRowIdx === -1) {
          totalsRowIdx = r;
          // Totals row found — detect column layout
          // The "Totals" label is in the name column for that section
          // Find the first "Totals" → expense section, second → income section
          let foundFirst = false;
          for (let cc = 0; cc < row.length; cc++) {
            if (isHeaderLike(row[cc], 'totals', 'الإجمالي', 'إجمالي')) {
              if (!foundFirst) {
                foundFirst = true;
                expNameCol = cc;
                // Find planned col: first cell after name with an amount
                for (let ac = cc + 1; ac < row.length; ac++) {
                  if (parseAmount(row[ac]) > 0) { expPlannedCol = ac; break; }
                }
              } else {
                incNameCol = cc;
                for (let ac = cc + 1; ac < row.length; ac++) {
                  if (parseAmount(row[ac]) > 0) { incPlannedCol = ac; break; }
                }
                break;
              }
            }
          }
        }
        break;
      }
    }
    if (totalsRowIdx >= 0) break;
  }

  if (totalsRowIdx < 0 || expNameCol < 0) {
    return { year, month, expenseCategories, incomeCategories };
  }

  // Parse category rows after Totals
  for (let r = totalsRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];

    // Expense category
    const expName = (row[expNameCol] || '').trim();
    if (expName && expName.length > 1 && !isHeaderLike(expName, 'total', 'إجمالي', 'planned', 'actual')) {
      const planned = parseAmount(row[expPlannedCol] || '');
      expenseCategories.push({ name: expName, nameEn: '', planned });
    }

    // Income category
    if (incNameCol >= 0 && incPlannedCol >= 0) {
      const incName = (row[incNameCol] || '').trim();
      if (incName && incName.length > 1 && !isHeaderLike(incName, 'total', 'إجمالي', 'planned', 'actual')) {
        const planned = parseAmount(row[incPlannedCol] || '');
        incomeCategories.push({ name: incName, nameEn: '', planned });
      }
    }
  }

  return { year, month, expenseCategories, incomeCategories };
}

// ===== Parse Transactions Sheet =====
export interface ParsedTransaction {
  date: Date;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  description: string;
  monthKey: string;
}

interface ColumnMap {
  date: number;
  amount: number;
  description: number;
  category: number;
}

function detectColumnGroups(rows: string[][]): { dataStartRow: number; expense: ColumnMap | null; income: ColumnMap | null } {
  // Find the first row that contains a valid date — that's where data starts.
  // Then detect column positions from that row.
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    // Find all columns with dates and amounts
    const dateCols: number[] = [];
    const amountCols: number[] = [];

    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] || '').trim();
      if (parseDate(cell)) dateCols.push(c);
      else if (cell.includes('£') || (parseAmount(cell) > 0 && /[\d]/.test(cell))) amountCols.push(c);
    }

    if (dateCols.length >= 1 && amountCols.length >= 1) {
      // Found a data row — build column maps
      // Expense group: first date col, then amount, description, category follow
      const expDate = dateCols[0];
      const expAmount = amountCols.find((c) => c > expDate) || expDate + 1;
      const expDesc = expAmount + 1;
      const expCat = expAmount + 2;

      const expMap: ColumnMap = { date: expDate, amount: expAmount, description: expDesc, category: expCat };

      // Income group: second date col (if exists)
      let incMap: ColumnMap | null = null;
      if (dateCols.length >= 2) {
        const incDate = dateCols[1];
        const incAmount = amountCols.find((c) => c > incDate) || incDate + 1;
        incMap = { date: incDate, amount: incAmount, description: incAmount + 1, category: incAmount + 2 };
      }

      return { dataStartRow: r, expense: expMap, income: incMap };
    }
  }

  return { dataStartRow: 0, expense: null, income: null };
}

export function parseTransactionsSheet(csv: string): ParsedTransaction[] {
  const rows = parseCSV(csv);
  const transactions: ParsedTransaction[] = [];

  const { dataStartRow, expense: expMap, income: incMap } = detectColumnGroups(rows);

  if (!expMap) {
    return transactions;
  }

  for (let r = dataStartRow; r < rows.length; r++) {
    const row = rows[r];

    // Parse expense transaction
    const expDateStr = (row[expMap.date] || '').trim();
    const expDate = parseDate(expDateStr);
    const expAmount = parseAmount(row[expMap.amount] || '');
    const expDesc = (row[expMap.description] || '').trim();
    const expCat = (row[expMap.category] || '').trim();

    if (expDate && expAmount > 0) {
      const monthKey = `${expDate.getFullYear()}_${String(expDate.getMonth() + 1).padStart(2, '0')}`;
      transactions.push({
        date: expDate,
        amount: expAmount,
        type: 'expense',
        category: expCat || expDesc || 'Other',
        description: expDesc || expCat || '',
        monthKey,
      });
    }

    // Parse income transaction
    if (incMap) {
      const incDateStr = (row[incMap.date] || '').trim();
      const incDate = parseDate(incDateStr);
      const incAmount = parseAmount(row[incMap.amount] || '');
      const incDesc = (row[incMap.description] || '').trim();
      const incCat = (row[incMap.category] || '').trim();

      if (incDate && incAmount > 0) {
        const monthKey = `${incDate.getFullYear()}_${String(incDate.getMonth() + 1).padStart(2, '0')}`;
        transactions.push({
          date: incDate,
          amount: incAmount,
          type: 'income',
          category: incCat || incDesc || 'Income',
          description: incDesc || incCat || '',
          monthKey,
        });
      }
    }
  }

  return transactions;
}

// ===== Parse Notes Sheet =====
export function parseNotesSheet(csv: string): Map<string, string> {
  const rows = parseCSV(csv);
  const notes = new Map<string, string>();

  // Expected: col 0 = category name (البند), col 1 = note (الملاحظة)
  // Skip header row
  for (let r = 0; r < rows.length; r++) {
    const name = (rows[r][0] || '').trim();
    const note = (rows[r][1] || '').trim();

    // Skip header-like rows
    if (!name || !note) continue;
    if (isHeaderLike(name, 'البند', 'category', 'الفئة', 'item')) continue;

    notes.set(name, note);
  }

  return notes;
}

// ===== Detect Income Transactions =====
// If a transaction's category matches any income category name, mark it as income
export function classifyTransactions(
  transactions: ParsedTransaction[],
  incomeCategories: string[]
): ParsedTransaction[] {
  const incomeSet = new Set(incomeCategories.map((c) => c.toLowerCase()));
  return transactions.map((t) => ({
    ...t,
    type: t.type === 'income' || incomeSet.has(t.category.toLowerCase()) ? 'income' : 'expense',
  }));
}
