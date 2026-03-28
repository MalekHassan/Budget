import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/currency';
import type { CategorySummary } from '../types';
import './CategoryBar.css';

interface CategoryBarProps {
  category: CategorySummary;
}

export function CategoryBar({ category }: CategoryBarProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const isAr = lang === 'ar';
  const { name, nameEn, planned, actual, percentage } = category;

  const isExact = planned > 0 && Math.abs(actual - planned) < 0.01;

  const status =
    isExact ? 'exact' :
    percentage >= 100 ? 'over' :
    percentage >= 80 ? 'warning' :
    'ok';

  const statusClass =
    status === 'exact' ? 'category-bar--exact' :
    status === 'over' ? 'category-bar--over' :
    status === 'warning' ? 'category-bar--warning' :
    'category-bar--ok';

  return (
    <div className={`category-bar ${statusClass}`}>
      <div className="category-bar__header">
        <span className="category-bar__name">{isAr ? name : (nameEn || name)}</span>
        <span className="category-bar__amounts">
          {formatCurrency(actual, lang)} / {formatCurrency(planned, lang)}
        </span>
      </div>
      <div className="category-bar__track">
        <div
          className="category-bar__fill"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
