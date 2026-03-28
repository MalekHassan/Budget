import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Copy, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHousehold } from '../hooks/useHousehold';
import { useAuth } from '../hooks/useAuth';
import {
  getMonthBudget,
  createMonthBudget,
  updateMonthBudget,
  getHouseholdMonths,
} from '../firebase/firestore';
import type { CategoryPlan, MonthBudget } from '../types';
import './BudgetSetupPage.css';

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const DEFAULT_EXPENSE_CATEGORIES: CategoryPlan[] = [
  { name: 'اجار البيت', nameEn: 'Rent', planned: 0 },
  { name: 'بنزين', nameEn: 'Fuel', planned: 0 },
  { name: 'اكل برا', nameEn: 'Eating Out', planned: 0 },
  { name: 'حاجات البيت الشهرية', nameEn: 'Monthly Groceries', planned: 0 },
  { name: 'حاجات البيت اليومية', nameEn: 'Daily Groceries', planned: 0 },
  { name: 'خضروات و فواكه', nameEn: 'Fruits & Vegs', planned: 0 },
  { name: 'دجاج و لحمه', nameEn: 'Meat & Chicken', planned: 0 },
  { name: 'صيدلية', nameEn: 'Pharmacy', planned: 0 },
  { name: 'فاتورة كهرباء', nameEn: 'Electricity', planned: 0 },
  { name: 'فاتورة مي', nameEn: 'Water Bill', planned: 0 },
  { name: 'قسط الزواج', nameEn: 'Wedding Installment', planned: 0 },
  { name: 'شخصي مالك', nameEn: 'Personal Malek', planned: 0 },
  { name: 'شخصي آية', nameEn: 'Personal Aya', planned: 0 },
  { name: 'شخصي لين', nameEn: 'Personal Leen', planned: 0 },
];

const DEFAULT_INCOME_CATEGORIES: CategoryPlan[] = [
  { name: 'الراتب', nameEn: 'Salary', planned: 0 },
  { name: 'Cash', nameEn: 'Cash', planned: 0 },
];

export function BudgetSetupPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { household, loading: householdLoading, error: householdError } = useHousehold();
  const isAr = i18n.language === 'ar';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expenseCategories, setExpenseCategories] = useState<CategoryPlan[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryPlan[]>([]);
  const [existingBudget, setExistingBudget] = useState<MonthBudget | null>(null);
  const [historicalAvgs, setHistoricalAvgs] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [budgetLoading, setBudgetLoading] = useState(false);

  // Load existing budget for selected month
  useEffect(() => {
    if (!household) return;
    setBudgetLoading(true);
    getMonthBudget(household.id, year, month).then((budget) => {
      if (budget) {
        setExistingBudget(budget);
        setExpenseCategories(budget.expenseCategories);
        setIncomeCategories(budget.incomeCategories);
      } else {
        setExistingBudget(null);
        setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
        setIncomeCategories(DEFAULT_INCOME_CATEGORIES);
      }
      setBudgetLoading(false);
    });
  }, [household, year, month]);

  // Load historical averages for suggestions
  useEffect(() => {
    if (!household) return;
    getHouseholdMonths(household.id).then((months) => {
      const last3 = months.slice(0, 3);
      if (last3.length === 0) return;
      const avgMap: Record<string, number[]> = {};
      last3.forEach((m) => {
        m.expenseCategories.forEach((cat) => {
          if (!avgMap[cat.name]) avgMap[cat.name] = [];
          avgMap[cat.name].push(cat.planned);
        });
      });
      const avgs: Record<string, number> = {};
      Object.entries(avgMap).forEach(([name, values]) => {
        avgs[name] = values.reduce((a, b) => a + b, 0) / values.length;
      });
      setHistoricalAvgs(avgs);
    });
  }, [household]);

  const handleCopyPrevious = async () => {
    if (!household) return;
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prev = await getMonthBudget(household.id, prevYear, prevMonth);
    if (prev) {
      setExpenseCategories(prev.expenseCategories);
      setIncomeCategories(prev.incomeCategories);
      setMessage(isAr ? 'تم النسخ من الشهر السابق' : 'Copied from previous month');
      setTimeout(() => setMessage(null), 2000);
    } else {
      setMessage(isAr ? 'لا يوجد ميزانية للشهر السابق' : 'No budget found for previous month');
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleSave = async () => {
    if (!household || !user) return;
    setSaving(true);
    try {
      const isNew = !existingBudget;
      if (existingBudget) {
        await updateMonthBudget(household.id, year, month, {
          expenseCategories,
          incomeCategories,
        });
      } else {
        await createMonthBudget(household.id, year, month, expenseCategories, incomeCategories, user.uid);
      }
      const saved = await getMonthBudget(household.id, year, month);
      setExistingBudget(saved);
      setMessageType('success');
      const monthLabel = isAr ? MONTH_NAMES_AR[month - 1] : MONTH_NAMES_EN[month - 1];
      setMessage(
        isNew
          ? (isAr ? `تم إنشاء ميزانية ${monthLabel} ${year} بنجاح ✓` : `${monthLabel} ${year} budget created successfully ✓`)
          : (isAr ? `تم تحديث ميزانية ${monthLabel} ${year} بنجاح ✓` : `${monthLabel} ${year} budget updated successfully ✓`)
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error('Budget save error:', err);
      setMessageType('error');
      setMessage(isAr ? 'خطأ في الحفظ — حاول مرة أخرى' : 'Save failed — please try again');
      setTimeout(() => setMessage(null), 5000);
    }
    setSaving(false);
  };

  const updateExpenseCat = (index: number, field: keyof CategoryPlan, value: string | number) => {
    setExpenseCategories((prev) =>
      prev.map((cat, i) => (i === index ? { ...cat, [field]: value } : cat))
    );
  };

  const updateIncomeCat = (index: number, field: keyof CategoryPlan, value: string | number) => {
    setIncomeCategories((prev) =>
      prev.map((cat, i) => (i === index ? { ...cat, [field]: value } : cat))
    );
  };

  const addExpenseCategory = () => {
    setExpenseCategories((prev) => [...prev, { name: '', nameEn: '', planned: 0 }]);
  };

  const addIncomeCategory = () => {
    setIncomeCategories((prev) => [...prev, { name: '', nameEn: '', planned: 0 }]);
  };

  const removeExpenseCategory = (index: number) => {
    setExpenseCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const removeIncomeCategory = (index: number) => {
    setIncomeCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const navigateMonth = (dir: number) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const monthName = isAr ? MONTH_NAMES_AR[month - 1] : MONTH_NAMES_EN[month - 1];
  const totalExpensePlanned = expenseCategories.reduce((s, c) => s + c.planned, 0);
  const totalIncomePlanned = incomeCategories.reduce((s, c) => s + c.planned, 0);

  if (householdLoading || budgetLoading) {
    return (
      <div className="page fade-in">
        <h1 className="page-title">{t('budget.title')}</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>{t('common.loading')}</p>
        {householdError && <p style={{ color: 'var(--color-danger)', marginTop: '1rem' }}>{householdError}</p>}
      </div>
    );
  }

  if (!household) {
    return (
      <div className="page fade-in">
        <h1 className="page-title">{t('budget.title')}</h1>
        <p style={{ color: 'var(--color-danger)' }}>{householdError || 'Failed to load household. Please sign out and sign in again.'}</p>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <h1 className="page-title">{t('budget.title')}</h1>

      {/* Month Navigator */}
      <div className="month-nav glass-card">
        <button onClick={() => navigateMonth(-1)} className="month-nav__btn">
          {isAr ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
        <div className="month-nav__label">
          <span className="month-nav__month">{monthName}</span>
          <span className="month-nav__year">{year}</span>
        </div>
        <button onClick={() => navigateMonth(1)} className="month-nav__btn">
          {isAr ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Actions */}
      <div className="budget-actions">
        <button className="btn-secondary" onClick={handleCopyPrevious}>
          <Copy size={16} />
          {t('budget.copyPrevious')}
        </button>
      </div>

      {/* Message */}
      {message && <div className={`budget-message ${messageType === 'error' ? 'budget-message--error' : 'budget-message--success'}`}>{message}</div>}

      {/* Expenses Section */}
      <section className="budget-section">
        <div className="budget-section__header">
          <h2>{t('budget.expenses')}</h2>
          <span className="budget-section__total">{totalExpensePlanned.toFixed(3)} JD</span>
        </div>

        {expenseCategories.map((cat, i) => (
          <div key={i} className="category-row glass-card">
            <div className="category-row__fields">
              <input
                className="category-row__name"
                value={cat.name}
                onChange={(e) => updateExpenseCat(i, 'name', e.target.value)}
                placeholder={t('budget.categoryName')}
                dir="rtl"
              />
              <input
                className="category-row__name-en"
                value={cat.nameEn}
                onChange={(e) => updateExpenseCat(i, 'nameEn', e.target.value)}
                placeholder={t('budget.categoryNameEn')}
              />
              <div className="category-row__amount-row">
                <input
                  className="category-row__amount"
                  type="number"
                  step="0.001"
                  min="0"
                  value={cat.planned}
                  onChange={(e) => updateExpenseCat(i, 'planned', e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0))}
                  placeholder={t('budget.plannedAmount')}
                />
                {historicalAvgs[cat.name] !== undefined && (
                  <button
                    className="category-row__suggestion"
                    onClick={() => updateExpenseCat(i, 'planned', Math.round(historicalAvgs[cat.name] * 1000) / 1000)}
                    title={t('budget.suggestion')}
                  >
                    ~{historicalAvgs[cat.name].toFixed(0)}
                  </button>
                )}
              </div>
            </div>
            <button className="category-row__delete" onClick={() => removeExpenseCategory(i)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <button className="btn-add-category" onClick={addExpenseCategory}>
          <Plus size={16} />
          {t('budget.addCategory')}
        </button>
      </section>

      {/* Income Section */}
      <section className="budget-section">
        <div className="budget-section__header">
          <h2>{t('budget.income')}</h2>
          <span className="budget-section__total">{totalIncomePlanned.toFixed(3)} JD</span>
        </div>

        {incomeCategories.map((cat, i) => (
          <div key={i} className="category-row glass-card">
            <div className="category-row__fields">
              <input
                className="category-row__name"
                value={cat.name}
                onChange={(e) => updateIncomeCat(i, 'name', e.target.value)}
                placeholder={t('budget.categoryName')}
                dir="rtl"
              />
              <input
                className="category-row__name-en"
                value={cat.nameEn}
                onChange={(e) => updateIncomeCat(i, 'nameEn', e.target.value)}
                placeholder={t('budget.categoryNameEn')}
              />
              <input
                className="category-row__amount"
                type="number"
                step="0.001"
                min="0"
                value={cat.planned}
                onChange={(e) => updateIncomeCat(i, 'planned', e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0))}
                placeholder={t('budget.plannedAmount')}
              />
            </div>
            <button className="category-row__delete" onClick={() => removeIncomeCategory(i)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <button className="btn-add-category" onClick={addIncomeCategory}>
          <Plus size={16} />
          {t('budget.addCategory')}
        </button>
      </section>

      {/* Save Button */}
      <button className="btn-primary budget-save" onClick={handleSave} disabled={saving}>
        <Save size={18} />
        {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : t('budget.save')}
      </button>
    </div>
  );
}
