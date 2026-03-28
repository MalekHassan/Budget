import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHousehold } from '../hooks/useHousehold';
import { useAuth } from '../hooks/useAuth';
import { useMonthData } from '../hooks/useMonthData';
import { useTransactions } from '../hooks/useTransactions';
import { useHouseholdMonths } from '../hooks/useHouseholdMonths';
import { SummaryCard } from '../components/SummaryCard';
import { CategoryBar } from '../components/CategoryBar';
import { TransactionItem } from '../components/TransactionItem';
import { TransactionForm } from '../components/TransactionForm';
import { formatPercentage } from '../utils/currency';
import { getDefaultMonth } from '../utils/monthUtils';
import type { Transaction } from '../types';
import './DashboardPage.css';

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const isAr = i18n.language === 'ar';

  const { months: householdMonths } = useHouseholdMonths(household?.id);
  const defaultMonth = getDefaultMonth(householdMonths);
  const [year, setYear] = useState(defaultMonth.year);
  const [month, setMonth] = useState(defaultMonth.month);

  const { addTransaction: addTxn, updateTransaction: updateTxn, deleteTransaction: deleteTxn } = useTransactions(household?.id);

  const navigateMonth = (dir: number) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const {
    budget,
    transactions,
    expenseSummaries,
    monthSummary,
    loading: dataLoading,
  } = useMonthData(household?.id, year, month);


  const [showForm, setShowForm] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);

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
      console.error('Delete transaction error:', err);
    }
  };

  if (householdLoading || dataLoading) {
    return (
      <div className="page fade-in">
        <h1 className="page-title">{t('dashboard.title')}</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>{t('common.loading')}</p>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="page fade-in">
        <h1 className="page-title">{t('dashboard.title')}</h1>
        <div className="dashboard-empty glass-card">
          <p>{isAr ? 'لا توجد ميزانية لهذا الشهر' : 'No budget set up for this month'}</p>
          <a href="/budget-setup" className="btn-primary" style={{ marginTop: 'var(--spacing-md)', textDecoration: 'none' }}>
            {t('budget.title')}
          </a>
        </div>
      </div>
    );
  }

  const { totalPlannedExpenses, totalActualExpenses, totalPlannedIncome, totalActualIncome, savings, savingsPercentage } = monthSummary;
  const recentTransactions = transactions.slice(0, 8);

  const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthLabel = isAr ? MONTHS_AR[month - 1] : MONTHS_EN[month - 1];

  return (
    <div className="page fade-in">
      {/* Month Navigator */}
      <div className="dashboard-month-nav">
        <button className="dashboard-month-nav__btn" onClick={() => navigateMonth(-1)}>
          {isAr ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
        <h1 className="page-title">{monthLabel} {year}</h1>
        <button className="dashboard-month-nav__btn" onClick={() => navigateMonth(1)}>
          {isAr ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <div className="dashboard-header">
        <div />
        <div className={`dashboard-savings-badge ${savings >= 0 ? 'positive' : 'negative'}`}>
          {formatPercentage(savingsPercentage)}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-cards">
        <SummaryCard
          label={t('dashboard.totalIncome')}
          planned={totalPlannedIncome}
          actual={totalActualIncome}
          variant="income"
        />
        <SummaryCard
          label={t('dashboard.totalExpenses')}
          planned={totalPlannedExpenses}
          actual={totalActualExpenses}
          variant="expense"
        />
        <SummaryCard
          label={t('dashboard.savings')}
          planned={totalPlannedIncome - totalPlannedExpenses}
          actual={savings}
          variant="savings"
        />
      </div>

      {/* Category Breakdown */}
      <section className="dashboard-section">
        <h2 className="dashboard-section__title">{t('budget.expenses')}</h2>
        <div className="glass-card">
          {expenseSummaries.map((cat) => (
            <CategoryBar key={cat.name} category={cat} />
          ))}
        </div>
        <div className="dashboard-color-legend">
          <div className="dashboard-color-legend__item">
            <span className="dashboard-color-dot dashboard-color-dot--green" />
            <span>{isAr ? 'أقل من 80%' : '< 80%'}</span>
          </div>
          <div className="dashboard-color-legend__item">
            <span className="dashboard-color-dot dashboard-color-dot--yellow" />
            <span>{isAr ? '80–99%' : '80–99%'}</span>
          </div>
          <div className="dashboard-color-legend__item">
            <span className="dashboard-color-dot dashboard-color-dot--purple" />
            <span>{isAr ? '100% — في الهدف' : '100% — On Target'}</span>
          </div>
          <div className="dashboard-color-legend__item">
            <span className="dashboard-color-dot dashboard-color-dot--red" />
            <span>{isAr ? 'تجاوز الميزانية' : 'Over Budget'}</span>
          </div>
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="dashboard-section">
        <h2 className="dashboard-section__title">{t('dashboard.recentTransactions')}</h2>
        <div className="glass-card">
          {recentTransactions.length === 0 ? (
            <p className="dashboard-empty-text">{t('dashboard.noTransactions')}</p>
          ) : (
            recentTransactions.map((txn) => (
              <TransactionItem
                key={txn.id}
                transaction={txn}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </section>

      {/* FAB */}
      <button className="fab" onClick={() => { setEditTxn(null); setShowForm(true); }}>
        <Plus size={24} />
      </button>

      {/* Transaction Form Modal */}
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
    </div>
  );
}
