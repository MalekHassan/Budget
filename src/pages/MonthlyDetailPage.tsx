import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ClipboardEdit, Plus, StickyNote, ChevronDown, ChevronUp, Check, Pencil, Download, Lock, Unlock } from 'lucide-react';
import { useHousehold } from '../hooks/useHousehold';
import { useAuth } from '../hooks/useAuth';
import { useMonthData } from '../hooks/useMonthData';
import { useTransactions } from '../hooks/useTransactions';
import { useHouseholdMonths } from '../hooks/useHouseholdMonths';
import { updateMonthNote, updateCategoryNote, setMonthLocked } from '../firebase/firestore';
import { MonthPicker } from '../components/MonthPicker';
import { TransactionItem } from '../components/TransactionItem';
import { TransactionForm } from '../components/TransactionForm';
import { formatCurrency } from '../utils/currency';
import { getDefaultMonth } from '../utils/monthUtils';
import type { Transaction } from '../types';
import { exportMonthToExcel } from '../utils/exportExcel';
import './MonthlyDetailPage.css';

export function MonthlyDetailPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const isAr = i18n.language === 'ar';
  const lang = i18n.language;

  const { months: householdMonths } = useHouseholdMonths(household?.id);
  const defaultMonth = getDefaultMonth(householdMonths);
  const [year, setYear] = useState(defaultMonth.year);
  const [month, setMonth] = useState(defaultMonth.month);

  const {
    budget,
    transactions,
    expenseSummaries,
    incomeSummaries,
    monthSummary,
    loading: dataLoading,
  } = useMonthData(household?.id, year, month);

  const { addTransaction: addTxn, updateTransaction: updateTxn, deleteTransaction: deleteTxn } = useTransactions(household?.id);
  const [showForm, setShowForm] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');

  // Notes state
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [editingNote, setEditingNote] = useState<string | null>(null); // category name or '__month__'
  const [noteText, setNoteText] = useState('');
  const [editingMonthNote, setEditingMonthNote] = useState(false);
  const [monthNoteText, setMonthNoteText] = useState('');

  const toggleNoteExpand = (catName: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  const startEditNote = (catName: string, currentNote: string) => {
    setEditingNote(catName);
    setNoteText(currentNote);
  };

  const saveNote = async (catName: string, type: 'expense' | 'income') => {
    if (!household) return;
    await updateCategoryNote(household.id, year, month, type, catName, noteText);
    setEditingNote(null);
  };

  const startEditMonthNote = () => {
    setMonthNoteText(budget?.monthNote || '');
    setEditingMonthNote(true);
  };

  const saveMonthNote = async () => {
    if (!household) return;
    await updateMonthNote(household.id, year, month, monthNoteText);
    setEditingMonthNote(false);
  };

  const handleSave = async (dataArr: Array<Parameters<typeof addTxn>[0]>) => {
    try {
      if (editTxn && dataArr.length === 1) {
        await updateTxn(editTxn.id, dataArr[0]);
      } else {
        for (const data of dataArr) {
          await addTxn(data);
        }
      }
      setShowForm(false);
      setEditTxn(null);
    } catch (err) {
      console.error('Save transaction error:', err);
    }
  };

  const handleEdit = (txn: Transaction) => {
    setEditTxn(txn);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTxn(id);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const isLocked = budget?.locked || false;

  const toggleLock = async () => {
    if (!household || !budget) return;
    await setMonthLocked(household.id, year, month, !isLocked);
  };

  if (householdLoading || dataLoading) {
    return (
      <div className="page fade-in">
        <h1 className="page-title">{t('nav.monthly')}</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>{t('common.loading')}</p>
      </div>
    );
  }

  const filteredTransactions = filterCategory
    ? transactions.filter((t) => t.category === filterCategory)
    : transactions;

  return (
    <div className="page fade-in">
      <h1 className="page-title">{t('nav.monthly')}</h1>

      <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} locked={isLocked} />

      {!budget ? (
        <div className="monthly-empty glass-card">
          <p>{isAr ? 'لا توجد ميزانية لهذا الشهر' : 'No budget for this month'}</p>
          <Link to="/budget-setup" className="btn-primary" style={{ marginTop: 'var(--spacing-md)', textDecoration: 'none' }}>
            <ClipboardEdit size={16} />
            {t('budget.title')}
          </Link>
        </div>
      ) : (
        <>
          {/* Top Actions: Lock + Export */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
            <button
              className={isLocked ? 'monthly-lock-btn monthly-lock-btn--locked' : 'monthly-lock-btn'}
              onClick={toggleLock}
            >
              {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
              {isLocked
                ? (isAr ? 'مقفل' : 'Locked')
                : (isAr ? 'قفل الشهر' : 'Lock Month')}
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: 'var(--font-size-xs)', padding: '6px 12px', gap: '4px' }}
              onClick={() => exportMonthToExcel({
                budget,
                expenseSummaries,
                incomeSummaries,
                transactions,
                year,
                month,
              })}
            >
              <Download size={14} />
              {isAr ? 'تصدير Excel' : 'Export Excel'}
            </button>
          </div>

          {/* Summary Row */}
          <div className="monthly-summary glass-card">
            <div className="monthly-summary__item">
              <span className="monthly-summary__label">{t('dashboard.totalIncome')}</span>
              <span className="monthly-summary__value monthly-summary__value--income">
                {formatCurrency(monthSummary.totalActualIncome, lang)}
              </span>
            </div>
            <div className="monthly-summary__item">
              <span className="monthly-summary__label">{t('dashboard.totalExpenses')}</span>
              <span className="monthly-summary__value monthly-summary__value--expense">
                {formatCurrency(monthSummary.totalActualExpenses, lang)}
              </span>
            </div>
            <div className="monthly-summary__item">
              <span className="monthly-summary__label">{t('dashboard.savings')}</span>
              <span className={`monthly-summary__value ${monthSummary.savings >= 0 ? 'monthly-summary__value--income' : 'monthly-summary__value--expense'}`}>
                {formatCurrency(monthSummary.savings, lang)}
              </span>
            </div>
          </div>

          {/* Month Note */}
          <section className="monthly-note-section glass-card">
            <div className="monthly-note-header" onClick={() => !isLocked && !editingMonthNote && startEditMonthNote()}>
              <StickyNote size={16} />
              <span>{isAr ? 'ملاحظات الشهر' : 'Month Notes'}</span>
              {!editingMonthNote && !isLocked && <Pencil size={12} className="monthly-note-edit-icon" />}
            </div>
            {editingMonthNote ? (
              <div className="monthly-note-edit">
                <textarea
                  value={monthNoteText}
                  onChange={(e) => setMonthNoteText(e.target.value)}
                  placeholder={isAr ? 'اكتب ملاحظاتك عن هذا الشهر...' : 'Write notes about this month...'}
                  autoFocus
                  dir="auto"
                  rows={3}
                />
                <div className="monthly-note-actions">
                  <button className="btn-sm btn-primary" onClick={saveMonthNote}><Check size={14} /> {t('transaction.save')}</button>
                  <button className="btn-sm btn-secondary" onClick={() => setEditingMonthNote(false)}>{t('transaction.cancel')}</button>
                </div>
              </div>
            ) : (
              budget?.monthNote ? (
                <p className="monthly-note-text">{budget.monthNote}</p>
              ) : (
                <p className="monthly-note-placeholder">{isAr ? 'اضغط لإضافة ملاحظة...' : 'Tap to add a note...'}</p>
              )
            )}
          </section>

          {/* Expense Table */}
          <section className="monthly-table-section">
            <h2>{t('budget.expenses')}</h2>
            <div className="monthly-table glass-card">
              <div className="monthly-table__header">
                <span>{isAr ? 'الفئة' : 'Category'}</span>
                <span>{t('dashboard.planned')}</span>
                <span>{t('dashboard.actual')}</span>
                <span>{isAr ? 'الفرق' : 'Diff'}</span>
              </div>
              {expenseSummaries.map((cat) => {
                const catPlan = budget?.expenseCategories.find((c) => c.name === cat.name);
                const hasNote = !!(catPlan?.note);
                const isExpanded = expandedNotes.has('exp_' + cat.name);
                const isEditing = editingNote === 'exp_' + cat.name;
                return (
                  <div key={cat.name}>
                    <div
                      className={`monthly-table__row ${filterCategory === cat.name ? 'monthly-table__row--active' : ''}`}
                      onClick={() => setFilterCategory(filterCategory === cat.name ? '' : cat.name)}
                    >
                      <span className="monthly-table__cat">
                        {isAr ? cat.name : (cat.nameEn || cat.name)}
                        {hasNote && <StickyNote size={10} className="monthly-cat-note-icon" />}
                      </span>
                      <span>{cat.planned.toFixed(3)}</span>
                      <span>{cat.actual.toFixed(3)}</span>
                      <span className={cat.diff >= 0 ? 'text-success' : 'text-danger'}>
                        {cat.diff >= 0 ? '+' : ''}{cat.diff.toFixed(3)}
                      </span>
                      <button
                        className="monthly-note-toggle"
                        onClick={(e) => { e.stopPropagation(); toggleNoteExpand('exp_' + cat.name); }}
                      >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="monthly-cat-note">
                        {isEditing ? (
                          <div className="monthly-note-edit">
                            <textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder={isAr ? 'اكتب ملاحظة...' : 'Write a note...'}
                              autoFocus
                              dir="auto"
                              rows={2}
                            />
                            <div className="monthly-note-actions">
                              <button className="btn-sm btn-primary" onClick={() => saveNote(cat.name, 'expense')}><Check size={14} /></button>
                              <button className="btn-sm btn-secondary" onClick={() => setEditingNote(null)}>✕</button>
                            </div>
                          </div>
                        ) : (
                          <div className="monthly-cat-note-view" onClick={() => !isLocked && startEditNote('exp_' + cat.name, catPlan?.note || '')}>
                            {catPlan?.note ? (
                              <p>{catPlan.note}</p>
                            ) : (
                              <p className="monthly-note-placeholder">{isAr ? 'اضغط لإضافة ملاحظة...' : 'Tap to add note...'}</p>
                            )}
                            {!isLocked && <Pencil size={10} />}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="monthly-table__row monthly-table__row--total">
                <span>{isAr ? 'المجموع' : 'Total'}</span>
                <span>{monthSummary.totalPlannedExpenses.toFixed(3)}</span>
                <span>{monthSummary.totalActualExpenses.toFixed(3)}</span>
                <span className={monthSummary.totalPlannedExpenses - monthSummary.totalActualExpenses >= 0 ? 'text-success' : 'text-danger'}>
                  {(monthSummary.totalPlannedExpenses - monthSummary.totalActualExpenses).toFixed(3)}
                </span>
              </div>
            </div>
          </section>

          {/* Income Table */}
          <section className="monthly-table-section">
            <h2>{t('budget.income')}</h2>
            <div className="monthly-table glass-card">
              <div className="monthly-table__header">
                <span>{isAr ? 'الفئة' : 'Category'}</span>
                <span>{t('dashboard.planned')}</span>
                <span>{t('dashboard.actual')}</span>
                <span>{isAr ? 'الفرق' : 'Diff'}</span>
              </div>
              {incomeSummaries.map((cat) => {
                const catPlan = budget?.incomeCategories.find((c) => c.name === cat.name);
                const hasNote = !!(catPlan?.note);
                const isExpanded = expandedNotes.has('inc_' + cat.name);
                const isEditing = editingNote === 'inc_' + cat.name;
                return (
                  <div key={cat.name}>
                    <div className="monthly-table__row">
                      <span className="monthly-table__cat">
                        {isAr ? cat.name : (cat.nameEn || cat.name)}
                        {hasNote && <StickyNote size={10} className="monthly-cat-note-icon" />}
                      </span>
                      <span>{cat.planned.toFixed(3)}</span>
                      <span>{cat.actual.toFixed(3)}</span>
                      <span className={cat.diff >= 0 ? 'text-success' : 'text-danger'}>
                        {cat.diff >= 0 ? '+' : ''}{cat.diff.toFixed(3)}
                      </span>
                      <button
                        className="monthly-note-toggle"
                        onClick={(e) => { e.stopPropagation(); toggleNoteExpand('inc_' + cat.name); }}
                      >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="monthly-cat-note">
                        {isEditing ? (
                          <div className="monthly-note-edit">
                            <textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder={isAr ? 'اكتب ملاحظة...' : 'Write a note...'}
                              autoFocus
                              dir="auto"
                              rows={2}
                            />
                            <div className="monthly-note-actions">
                              <button className="btn-sm btn-primary" onClick={() => saveNote(cat.name, 'income')}><Check size={14} /></button>
                              <button className="btn-sm btn-secondary" onClick={() => setEditingNote(null)}>✕</button>
                            </div>
                          </div>
                        ) : (
                          <div className="monthly-cat-note-view" onClick={() => !isLocked && startEditNote('inc_' + cat.name, catPlan?.note || '')}>
                            {catPlan?.note ? (
                              <p>{catPlan.note}</p>
                            ) : (
                              <p className="monthly-note-placeholder">{isAr ? 'اضغط لإضافة ملاحظة...' : 'Tap to add note...'}</p>
                            )}
                            {!isLocked && <Pencil size={10} />}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Transaction List */}
          <section className="monthly-table-section">
            <div className="monthly-txn-header">
              <h2>{isAr ? 'المعاملات' : 'Transactions'} ({filteredTransactions.length})</h2>
              {filterCategory && (
                <button className="btn-secondary" onClick={() => setFilterCategory('')} style={{ fontSize: 'var(--font-size-xs)', padding: '4px 8px' }}>
                  {isAr ? 'إظهار الكل' : 'Show All'}
                </button>
              )}
            </div>
            <div className="glass-card">
              {filteredTransactions.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                  {t('dashboard.noTransactions')}
                </p>
              ) : (
                filteredTransactions.map((txn) => (
                  <TransactionItem
                    key={txn.id}
                    transaction={txn}
                    onEdit={isLocked ? undefined : handleEdit}
                    onDelete={isLocked ? undefined : handleDelete}
                  />
                ))
              )}
            </div>
          </section>

          {/* Edit Budget Link */}
          <div style={{ textAlign: 'center', marginTop: 'var(--spacing-md)' }}>
            <Link to="/budget-setup" className="btn-secondary" style={{ textDecoration: 'none' }}>
              <ClipboardEdit size={16} />
              {t('budget.title')}
            </Link>
          </div>

          {/* FAB */}
          {!isLocked && (
            <button className="fab" onClick={() => { setEditTxn(null); setShowForm(true); }}>
              <Plus size={24} />
            </button>
          )}

          {showForm && (
            <TransactionForm
              expenseCategories={budget.expenseCategories}
              incomeCategories={budget.incomeCategories}
              editTransaction={editTxn}
              onSave={handleSave}
              onClose={() => { setShowForm(false); setEditTxn(null); }}
              userId={user!.uid}
              householdId={household!.id}
              householdMonths={householdMonths}
            />
          )}
        </>
      )}
    </div>
  );
}
