import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useHousehold } from '../hooks/useHousehold';
import { createMonthBudget, addTransaction, deleteMonthTransactions } from '../firebase/firestore';
import {
  fetchSheetCSV,
  parseSummarySheet,
  parseTransactionsSheet,
  parseNotesSheet,
  classifyTransactions,
  type SheetBudgetData,
  type ParsedTransaction,
} from '../utils/sheetImport';
import './ImportPage.css';

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

type ImportStep = 'input' | 'preview' | 'importing' | 'done' | 'error';

export function ImportPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { household } = useHousehold();
  const isAr = i18n.language === 'ar';

  const [sheetUrl, setSheetUrl] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [summaryTab, setSummaryTab] = useState('Summary');
  const [transactionsTab, setTransactionsTab] = useState('Transactions');
  const [notesTab, setNotesTab] = useState('Notes');

  const [step, setStep] = useState<ImportStep>('input');
  const [budgetData, setBudgetData] = useState<SheetBudgetData | null>(null);
  const [txnData, setTxnData] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const monthNames = isAr ? MONTHS_AR : MONTHS_EN;

  const handleFetch = async () => {
    if (!sheetUrl.trim()) return;
    setError('');
    setStep('importing');

    try {
      // Fetch summary
      const summaryCSV = await fetchSheetCSV(sheetUrl, summaryTab);
      const budget = parseSummarySheet(summaryCSV, year, month);
      setBudgetData(budget);

      // Fetch transactions
      let txns: ParsedTransaction[] = [];
      try {
        const txnCSV = await fetchSheetCSV(sheetUrl, transactionsTab);
        txns = parseTransactionsSheet(txnCSV);
        // Classify income vs expense
        const incomeNames = budget.incomeCategories.map((c) => c.name);
        txns = classifyTransactions(txns, incomeNames);
        // Override monthKey to selected month so all transactions go to the right budget
        const targetMonthKey = `${year}_${String(month).padStart(2, '0')}`;
        txns = txns.map((t) => ({ ...t, monthKey: targetMonthKey }));
      } catch {
        // Transactions sheet may not exist — that's ok
        console.warn('No transactions sheet found');
      }
      // Fetch notes
      try {
        const notesCSV = await fetchSheetCSV(sheetUrl, notesTab);
        const notesMap = parseNotesSheet(notesCSV);
        // Apply notes to budget categories
        if (notesMap.size > 0) {
          budget.expenseCategories = budget.expenseCategories.map((c) => ({
            ...c,
            note: notesMap.get(c.name) || c.note || '',
          }));
          budget.incomeCategories = budget.incomeCategories.map((c) => ({
            ...c,
            note: notesMap.get(c.name) || c.note || '',
          }));
          setBudgetData({ ...budget });
        }
      } catch {
        console.warn('No notes sheet found');
      }

      setTxnData(txns);
      setStep('preview');
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sheet');
      setStep('error');
    }
  };

  const handleImport = async () => {
    if (!household || !user || !budgetData) return;
    setStep('importing');
    const total = 1 + txnData.length;
    setProgress({ done: 0, total });

    try {
      // Clear existing transactions for this month first
      const targetMonthKey = `${budgetData.year}_${String(budgetData.month).padStart(2, '0')}`;
      await deleteMonthTransactions(household.id, targetMonthKey);

      // Save budget
      await createMonthBudget(
        household.id,
        budgetData.year,
        budgetData.month,
        budgetData.expenseCategories,
        budgetData.incomeCategories,
        user.uid
      );
      setProgress({ done: 1, total });

      // Save transactions in batches
      for (let i = 0; i < txnData.length; i++) {
        const txn = txnData[i];
        await addTransaction(household.id, {
          date: txn.date,
          amount: txn.amount,
          type: txn.type,
          category: txn.category,
          description: txn.description,
          monthKey: txn.monthKey,
          createdBy: user.uid,
        });
        setProgress({ done: 2 + i, total });
      }

      setStep('done');
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('error');
    }
  };

  return (
    <div className="page fade-in">
      <h1 className="page-title">
        <FileSpreadsheet size={24} />
        {isAr ? 'استيراد من Google Sheets' : 'Import from Google Sheets'}
      </h1>

      {step === 'input' && (
        <div className="import-form">
          <div className="import-field glass-card">
            <label>{isAr ? 'رابط Google Sheet' : 'Google Sheet URL'}</label>
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              dir="ltr"
            />
          </div>

          <div className="import-row">
            <div className="import-field glass-card">
              <label>{isAr ? 'السنة' : 'Year'}</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(+e.target.value)}
                min={2020}
                max={2030}
              />
            </div>
            <div className="import-field glass-card">
              <label>{isAr ? 'الشهر' : 'Month'}</label>
              <select value={month} onChange={(e) => setMonth(+e.target.value)}>
                {monthNames.map((name, i) => (
                  <option key={i} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="import-row">
            <div className="import-field glass-card">
              <label>{isAr ? 'تبويب الملخص' : 'Summary Tab'}</label>
              <input
                type="text"
                value={summaryTab}
                onChange={(e) => setSummaryTab(e.target.value)}
                dir="auto"
              />
            </div>
            <div className="import-field glass-card">
              <label>{isAr ? 'تبويب المعاملات' : 'Transactions Tab'}</label>
              <input
                type="text"
                value={transactionsTab}
                onChange={(e) => setTransactionsTab(e.target.value)}
                dir="auto"
              />
            </div>
          </div>

          <div className="import-field glass-card">
            <label>{isAr ? 'تبويب الملاحظات' : 'Notes Tab'}</label>
            <input
              type="text"
              value={notesTab}
              onChange={(e) => setNotesTab(e.target.value)}
              dir="auto"
            />
          </div>

          <button className="btn-primary import-btn" onClick={handleFetch} disabled={!sheetUrl.trim()}>
            <Upload size={18} />
            {isAr ? 'جلب البيانات' : 'Fetch Data'}
          </button>
        </div>
      )}

      {step === 'preview' && budgetData && (
        <div className="import-preview">
          <h2>{monthNames[budgetData.month - 1]} {budgetData.year}</h2>

          <div className="import-preview-section glass-card">
            <h3>{t('budget.expenses')} ({budgetData.expenseCategories.length})</h3>
            <div className="import-preview-list">
              {budgetData.expenseCategories.map((cat, i) => (
                <div key={i} className="import-preview-row">
                  <span>{cat.name}</span>
                  <span>{cat.planned.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="import-preview-section glass-card">
            <h3>{t('budget.income')} ({budgetData.incomeCategories.length})</h3>
            <div className="import-preview-list">
              {budgetData.incomeCategories.map((cat, i) => (
                <div key={i} className="import-preview-row">
                  <span>{cat.name}</span>
                  <span>{cat.planned.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>

          {txnData.length > 0 && (
            <div className="import-preview-section glass-card">
              <h3>{isAr ? 'المعاملات' : 'Transactions'} ({txnData.length})</h3>
              <div className="import-preview-list import-preview-list--scroll">
                {txnData.slice(0, 20).map((txn, i) => (
                  <div key={i} className="import-preview-row import-preview-row--txn">
                    <div>
                      <span className={txn.type === 'income' ? 'text-success' : ''}>
                        {txn.category}
                      </span>
                      {txn.description && txn.description !== txn.category && (
                        <span className="import-preview-desc">{txn.description}</span>
                      )}
                    </div>
                    <span className={txn.type === 'income' ? 'text-success' : ''}>
                      {txn.type === 'income' ? '+' : '-'}{txn.amount.toFixed(3)}
                    </span>
                  </div>
                ))}
                {txnData.length > 20 && (
                  <p className="import-more">+{txnData.length - 20} more...</p>
                )}
              </div>
            </div>
          )}

          <div className="import-actions">
            <button className="btn-secondary" onClick={() => setStep('input')}>
              {t('common.back')}
            </button>
            <button className="btn-primary" onClick={handleImport}>
              <Upload size={18} />
              {isAr ? `استيراد (${1 + txnData.length} عنصر)` : `Import (${1 + txnData.length} items)`}
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="import-status glass-card">
          <Loader size={32} className="import-spinner" />
          <p>{isAr ? 'جاري الاستيراد...' : 'Importing...'}</p>
          {progress.total > 0 && (
            <div className="import-progress">
              <div className="import-progress-track">
                <div
                  className="import-progress-fill"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
              <span>{progress.done} / {progress.total}</span>
            </div>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="import-status glass-card import-status--success">
          <CheckCircle size={48} />
          <h2>{isAr ? 'تم الاستيراد بنجاح!' : 'Import Complete!'}</h2>
          <p>{isAr ? 'تم استيراد الميزانية والمعاملات' : 'Budget and transactions imported successfully'}</p>
          <button className="btn-primary" onClick={() => { setStep('input'); setSheetUrl(''); }}>
            {isAr ? 'استيراد شهر آخر' : 'Import Another Month'}
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="import-status glass-card import-status--error">
          <AlertCircle size={48} />
          <h2>{t('common.error')}</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => setStep('input')}>
            {t('common.retry')}
          </button>
        </div>
      )}
    </div>
  );
}
