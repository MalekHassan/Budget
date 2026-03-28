import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
  AreaChart, Area,
  LineChart, Line,
} from 'recharts';
import { useHousehold } from '../hooks/useHousehold';
import { getHouseholdMonths, getTransactionsInRange } from '../firebase/firestore';
import {
  aggregateByCategory,
  aggregateByMonth,
  aggregateByCategoryAndMonth,
  getDailyCumulative,
  monthKeyToLabel,
  generateMonthKeys,
} from '../utils/aggregation';
import { formatCurrency } from '../utils/currency';
import { DateRangePicker, type ViewMode } from '../components/DateRangePicker';
import type { Transaction, MonthBudget } from '../types';
import './AnalyticsPage.css';

const CHART_COLORS = [
  '#6C5CE7', '#00B894', '#FD79A8', '#FDCB6E',
  '#0984E3', '#E17055', '#00CEC9', '#A29BFE',
  '#FF7675', '#55EFC4', '#74B9FF', '#FAB1A0',
];

function aggregateByYear(txns: Transaction[], type: 'expense' | 'income'): Record<string, number> {
  const result: Record<string, number> = {};
  txns.filter((t) => t.type === type).forEach((t) => {
    const year = t.date.getFullYear().toString();
    result[year] = (result[year] || 0) + t.amount;
  });
  return result;
}

function aggregateByCategoryAndYear(txns: Transaction[], type: 'expense' | 'income'): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  txns.filter((t) => t.type === type).forEach((t) => {
    const year = t.date.getFullYear().toString();
    if (!result[t.category]) result[t.category] = {};
    result[t.category][year] = (result[t.category][year] || 0) + t.amount;
  });
  return result;
}

export function AnalyticsPage() {
  const { t, i18n } = useTranslation();
  const { household, loading: householdLoading } = useHousehold();
  const lang = i18n.language;
  const isAr = lang === 'ar';

  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [startYear, setStartYear] = useState(() => {
    let sy = now.getFullYear();
    const sm = now.getMonth() + 1 - 5;
    if (sm < 1) sy--;
    return sy;
  });
  const [startMonth, setStartMonth] = useState(() => {
    let sm = now.getMonth() + 1 - 5;
    if (sm < 1) sm += 12;
    return sm;
  });
  const [endYear, setEndYear] = useState(now.getFullYear());
  const [endMonth, setEndMonth] = useState(now.getMonth() + 1);

  const [months, setMonths] = useState<MonthBudget[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarIdx, setSelectedBarIdx] = useState(-1);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const handleDateChange = (sy: number, sm: number, ey: number, em: number) => {
    setStartYear(sy); setStartMonth(sm); setEndYear(ey); setEndMonth(em);
    setSelectedBarIdx(-1);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedBarIdx(-1);
    if (mode === 'yearly') {
      setStartMonth(1);
      setEndMonth(12);
    }
  };

  // Load data
  useEffect(() => {
    if (!household?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const startKey = `${startYear}_${String(startMonth).padStart(2, '0')}`;
        const endKey = `${endYear}_${String(endMonth).padStart(2, '0')}`;
        const [allMonths, txns] = await Promise.all([
          getHouseholdMonths(household.id),
          getTransactionsInRange(household.id, startKey, endKey),
        ]);
        setMonths(allMonths);
        setAllTransactions(txns);
        setSelectedBarIdx(-1);
      } catch (err) {
        console.error('Analytics load error:', err);
      }
      setLoading(false);
    };
    load();
  }, [household?.id, startYear, startMonth, endYear, endMonth]);

  // Filtered by category
  const transactions = useMemo(() => {
    if (!selectedCategory) return allTransactions;
    return allTransactions.filter((t) => t.category === selectedCategory);
  }, [allTransactions, selectedCategory]);

  // All unique expense categories
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    allTransactions.forEach((t) => { if (t.type === 'expense') cats.add(t.category); });
    return Array.from(cats).sort();
  }, [allTransactions]);

  // Keys
  const monthKeys = useMemo(() =>
    generateMonthKeys({ startYear, startMonth, endYear, endMonth }),
    [startYear, startMonth, endYear, endMonth]
  );

  const yearKeys = useMemo(() => {
    const keys: string[] = [];
    for (let y = startYear; y <= endYear; y++) keys.push(y.toString());
    return keys;
  }, [startYear, endYear]);

  // ===== MONTH COMPARISON (exactly 2 months) =====
  const isComparison = viewMode === 'monthly' && monthKeys.length === 2;
  const comparisonData = useMemo(() => {
    if (!isComparison) return null;
    const [keyA, keyB] = monthKeys;
    const txnA = allTransactions.filter((t) => t.monthKey === keyA);
    const txnB = allTransactions.filter((t) => t.monthKey === keyB);

    const incomeA = txnA.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const incomeB = txnB.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenseA = txnA.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const expenseB = txnB.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const catSet = new Set<string>();
    txnA.forEach((t) => { if (t.type === 'expense') catSet.add(t.category); });
    txnB.forEach((t) => { if (t.type === 'expense') catSet.add(t.category); });
    const categories = Array.from(catSet).sort();

    const catData = categories.map((cat) => {
      const amtA = txnA.filter((t) => t.category === cat && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const amtB = txnB.filter((t) => t.category === cat && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const maxAmt = Math.max(amtA, amtB, 1);
      return { cat, amtA, amtB, pctA: (amtA / maxAmt) * 100, pctB: (amtB / maxAmt) * 100 };
    });

    const maxIncome = Math.max(incomeA, incomeB, 1);
    const maxExpense = Math.max(expenseA, expenseB, 1);

    return {
      keyA, keyB,
      labelA: monthKeyToLabel(keyA, lang),
      labelB: monthKeyToLabel(keyB, lang),
      incomeA, incomeB, expenseA, expenseB,
      incomePctA: (incomeA / maxIncome) * 100,
      incomePctB: (incomeB / maxIncome) * 100,
      expensePctA: (expenseA / maxExpense) * 100,
      expensePctB: (expenseB / maxExpense) * 100,
      categories: catData,
    };
  }, [isComparison, monthKeys, allTransactions, lang]);

  if (householdLoading || loading) {
    return (
      <div className="page fade-in">
        <h1 className="page-title">{t('analytics.title')}</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>{t('common.loading')}</p>
      </div>
    );
  }

  // ===== BAR CHART DATA =====
  let barData: { label: string; key: string; expenses: number; income: number }[];

  if (viewMode === 'yearly') {
    const expByYear = aggregateByYear(transactions, 'expense');
    const incByYear = aggregateByYear(transactions, 'income');
    barData = yearKeys.map((y) => ({
      label: y,
      key: y,
      expenses: +(expByYear[y] || 0).toFixed(3),
      income: +(incByYear[y] || 0).toFixed(3),
    }));
  } else {
    const expByMonth = aggregateByMonth(transactions, 'expense');
    const incByMonth = aggregateByMonth(transactions, 'income');
    barData = monthKeys.map((key) => ({
      label: monthKeyToLabel(key, lang),
      key,
      expenses: +(expByMonth[key] || 0).toFixed(3),
      income: +(incByMonth[key] || 0).toFixed(3),
    }));
  }

  // ===== PIE CHART DATA =====
  const selectedKey = selectedBarIdx >= 0 ? barData[selectedBarIdx]?.key : null;
  let pieTxns: Transaction[];
  if (selectedKey) {
    pieTxns = viewMode === 'yearly'
      ? allTransactions.filter((t) => t.date.getFullYear().toString() === selectedKey && t.type === 'expense')
      : allTransactions.filter((t) => t.monthKey === selectedKey && t.type === 'expense');
  } else {
    pieTxns = allTransactions.filter((t) => t.type === 'expense');
  }
  if (selectedCategory) pieTxns = pieTxns.filter((t) => t.category === selectedCategory);

  const catBreakdown = aggregateByCategory(pieTxns, 'expense');
  const pieData = Object.entries(catBreakdown)
    .map(([name, value]) => ({ name, value: +value.toFixed(3) }))
    .sort((a, b) => b.value - a.value);
  const totalExpensePie = pieData.reduce((s, d) => s + d.value, 0);

  // ===== LINE CHART: CATEGORY TRENDS =====
  const trendCategories = selectedCategory ? [selectedCategory] : allCategories.slice(0, 6);
  let lineData: Record<string, string | number>[];

  if (viewMode === 'yearly') {
    const catByYear = aggregateByCategoryAndYear(
      allTransactions.filter((t) => t.type === 'expense'), 'expense'
    );
    lineData = yearKeys.map((y) => {
      const point: Record<string, string | number> = { period: y };
      trendCategories.forEach((cat) => { point[cat] = +((catByYear[cat]?.[y]) || 0).toFixed(3); });
      return point;
    });
  } else {
    const catByMonth = aggregateByCategoryAndMonth(
      allTransactions.filter((t) => t.type === 'expense'), 'expense'
    );
    lineData = monthKeys.map((key) => {
      const point: Record<string, string | number> = { period: monthKeyToLabel(key, lang) };
      trendCategories.forEach((cat) => { point[cat] = +((catByMonth[cat]?.[key]) || 0).toFixed(3); });
      return point;
    });
  }

  // ===== DAILY CUMULATIVE (monthly mode only) =====
  const cumulativeTxns = (viewMode === 'monthly' && selectedKey)
    ? transactions.filter((t) => t.monthKey === selectedKey)
    : [];
  const dailyCumulative = getDailyCumulative(cumulativeTxns, 'expense');
  const selectedBudget = (viewMode === 'monthly' && selectedKey) ? months.find((m) => {
    const key = `${m.year}_${String(m.month).padStart(2, '0')}`;
    return key === selectedKey;
  }) : null;
  const plannedTotal = selectedBudget
    ? selectedBudget.expenseCategories
        .filter((c) => !selectedCategory || c.name === selectedCategory)
        .reduce((s, c) => s + c.planned, 0)
    : 0;

  // ===== SUMMARY STATS =====
  const totalExpenses = barData.reduce((s, d) => s + d.expenses, 0);
  const totalIncome = barData.reduce((s, d) => s + d.income, 0);
  const periods = barData.filter((d) => d.expenses > 0).length || 1;
  const avgPeriod = totalExpenses / periods;
  const periodLabel = viewMode === 'yearly'
    ? (isAr ? 'المتوسط السنوي' : 'Avg. Yearly')
    : t('analytics.avgMonthly');

  const tooltipStyle = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: '8px',
    color: 'var(--color-text)',
    fontSize: '12px',
  };

  const barHint = viewMode === 'yearly'
    ? (isAr ? 'اضغط على سنة لعرض تفاصيلها' : 'Tap a year to see its breakdown')
    : (isAr ? 'اضغط على شهر لعرض تفاصيله' : 'Tap a month to drill down');

  return (
    <div className="page fade-in">
      <h1 className="page-title">{t('analytics.title')}</h1>

      {/* Date Range + View Mode */}
      <DateRangePicker
        startYear={startYear}
        startMonth={startMonth}
        endYear={endYear}
        endMonth={endMonth}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onChange={handleDateChange}
      />

      {/* Category Filter */}
      <div className="analytics-cat-filter glass-card">
        <label>{t('transaction.category')}</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">{isAr ? 'جميع الفئات' : 'All Categories'}</option>
          {allCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Summary Stats */}
      <div className="analytics-stats">
        <div className="analytics-stat glass-card">
          <span className="analytics-stat__label">{t('analytics.totalSpent')}</span>
          <span className="analytics-stat__value analytics-stat__value--expense">
            {formatCurrency(totalExpenses, lang)}
          </span>
        </div>
        <div className="analytics-stat glass-card">
          <span className="analytics-stat__label">{periodLabel}</span>
          <span className="analytics-stat__value">
            {formatCurrency(avgPeriod, lang)}
          </span>
        </div>
        <div className="analytics-stat glass-card">
          <span className="analytics-stat__label">{t('dashboard.savings')}</span>
          <span className={`analytics-stat__value ${totalIncome - totalExpenses >= 0 ? 'analytics-stat__value--income' : 'analytics-stat__value--expense'}`}>
            {formatCurrency(totalIncome - totalExpenses, lang)}
          </span>
        </div>
      </div>

      {/* Month Comparison (2 months) */}
      {comparisonData && (
        <section className="analytics-section compare-section">
          <h2>{isAr ? 'مقارنة الشهرين' : 'Month Comparison'}</h2>

          {/* Income comparison */}
          <div className="compare-card glass-card">
            <div className="compare-card__header">
              <span>{isAr ? 'الدخل' : 'Income'}</span>
            </div>
            <div className="compare-row">
              <div className="compare-col">
                <span className="compare-label">{comparisonData.labelA}</span>
                <span className="compare-amount compare-amount--income">{formatCurrency(comparisonData.incomeA, lang)}</span>
                <div className="compare-bar-track">
                  <div className="compare-bar-fill compare-bar-fill--a" style={{ width: `${comparisonData.incomePctA}%` }} />
                </div>
              </div>
              <div className="compare-col">
                <span className="compare-label">{comparisonData.labelB}</span>
                <span className="compare-amount compare-amount--income">{formatCurrency(comparisonData.incomeB, lang)}</span>
                <div className="compare-bar-track">
                  <div className="compare-bar-fill compare-bar-fill--b" style={{ width: `${comparisonData.incomePctB}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Expenses comparison */}
          <div className="compare-card glass-card">
            <div className="compare-card__header">
              <span>{isAr ? 'المصروفات' : 'Expenses'}</span>
            </div>
            <div className="compare-row">
              <div className="compare-col">
                <span className="compare-label">{comparisonData.labelA}</span>
                <span className="compare-amount compare-amount--expense">{formatCurrency(comparisonData.expenseA, lang)}</span>
                <div className="compare-bar-track">
                  <div className="compare-bar-fill compare-bar-fill--a" style={{ width: `${comparisonData.expensePctA}%` }} />
                </div>
              </div>
              <div className="compare-col">
                <span className="compare-label">{comparisonData.labelB}</span>
                <span className="compare-amount compare-amount--expense">{formatCurrency(comparisonData.expenseB, lang)}</span>
                <div className="compare-bar-track">
                  <div className="compare-bar-fill compare-bar-fill--b" style={{ width: `${comparisonData.expensePctB}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Per-category comparison */}
          <h3 className="compare-sub-title">{isAr ? 'التغيير في أسلوب الصرف' : 'Spending Pattern Change'}</h3>
          {comparisonData.categories.map(({ cat, amtA, amtB, pctA, pctB }) => (
            <div key={cat} className="compare-card glass-card">
              <div className="compare-card__header">
                <span>{cat}</span>
              </div>
              <div className="compare-row">
                <div className="compare-col">
                  <span className="compare-amount">{formatCurrency(amtA, lang)}</span>
                  <div className="compare-bar-track">
                    <div className="compare-bar-fill compare-bar-fill--a" style={{ width: `${pctA}%` }} />
                  </div>
                </div>
                <div className="compare-col">
                  <span className="compare-amount">{formatCurrency(amtB, lang)}</span>
                  <div className="compare-bar-track">
                    <div className="compare-bar-fill compare-bar-fill--b" style={{ width: `${pctB}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Bar Chart */}
      <section className="analytics-section">
        <h2>{t('analytics.comparison')}</h2>
        <div className="glass-card analytics-chart-container">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} onClick={(data) => {
              if (data?.activeTooltipIndex != null && typeof data.activeTooltipIndex === 'number') {
                setSelectedBarIdx(selectedBarIdx === data.activeTooltipIndex ? -1 : data.activeTooltipIndex);
              }
            }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {!selectedCategory && (
                <Bar dataKey="income" fill="#00B894" radius={[4, 4, 0, 0]} name={t('transaction.income')} />
              )}
              <Bar dataKey="expenses" fill="#FD79A8" radius={[4, 4, 0, 0]} name={t('transaction.expense')} />
            </BarChart>
          </ResponsiveContainer>
          <p className="analytics-chart-hint">{barHint}</p>
        </div>
      </section>

      {/* Category Trend Line Chart */}
      <section className="analytics-section">
        <h2>{t('analytics.trends')}</h2>
        <div className="glass-card analytics-chart-container">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              {trendCategories.map((cat, idx) => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={cat}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          {!selectedCategory && trendCategories.length < allCategories.length && (
            <p className="analytics-chart-hint">
              {isAr ? `يعرض أعلى ${trendCategories.length} فئات` : `Showing top ${trendCategories.length} categories`}
            </p>
          )}
        </div>
      </section>

      {/* Category Pie Chart */}
      <section className="analytics-section">
        <h2>
          {isAr ? 'توزيع المصاريف' : 'Expense Breakdown'}
          {selectedKey ? ` — ${viewMode === 'yearly' ? selectedKey : monthKeyToLabel(selectedKey, lang)}` : ''}
        </h2>
        <div className="glass-card analytics-chart-container">
          {pieData.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--spacing-lg)' }}>
              {t('common.noData')}
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value), lang)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="analytics-legend">
                {pieData.map((item, idx) => (
                  <div key={item.name} className="analytics-legend__item">
                    <span className="analytics-legend__dot" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                    <span className="analytics-legend__name">{item.name}</span>
                    <span className="analytics-legend__value">{formatCurrency(item.value, lang)}</span>
                    <span className="analytics-legend__pct">
                      {totalExpensePie > 0 ? Math.round((item.value / totalExpensePie) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Daily Cumulative (monthly mode only) */}
      {dailyCumulative.length > 0 && (
        <section className="analytics-section">
          <h2>
            {isAr ? 'الإنفاق التراكمي اليومي' : 'Daily Cumulative Spending'}
            {' — '}{monthKeyToLabel(selectedKey!, lang)}
          </h2>
          <div className="glass-card analytics-chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyCumulative}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(d: string) => d.slice(8)} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={50} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value), lang)} />
                <Area type="monotone" dataKey="total" stroke="#6C5CE7" fill="rgba(108,92,231,0.2)" strokeWidth={2} name={t('analytics.totalSpent')} />
                {plannedTotal > 0 && (
                  <Area type="monotone" dataKey={() => plannedTotal} stroke="#FD79A8" fill="none" strokeWidth={1} strokeDasharray="5 5" name={t('dashboard.planned')} />
                )}
              </AreaChart>
            </ResponsiveContainer>
            {plannedTotal > 0 && (
              <div className="analytics-budget-line-label">
                <span style={{ color: '#FD79A8' }}>- - -</span>{' '}
                {isAr ? 'الميزانية المخططة' : 'Planned Budget'}: {formatCurrency(plannedTotal, lang)}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
