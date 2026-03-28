import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/currency';
import './SummaryCard.css';

interface SummaryCardProps {
  label: string;
  planned: number;
  actual: number;
  variant: 'income' | 'expense' | 'savings';
}

export function SummaryCard({ label, planned, actual, variant }: SummaryCardProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const diff = planned - actual;
  const percentage = planned > 0 ? (actual / planned) * 100 : 0;

  const variantClass =
    variant === 'income' ? 'summary-card--income' :
    variant === 'savings' ? 'summary-card--savings' :
    'summary-card--expense';

  return (
    <div className={`summary-card glass-card ${variantClass}`}>
      <div className="summary-card__label">{label}</div>
      <div className="summary-card__actual">{formatCurrency(actual, lang)}</div>
      {variant !== 'savings' && (
        <>
          <div className="summary-card__progress-track">
            <div
              className="summary-card__progress-fill"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <div className="summary-card__footer">
            <span className="summary-card__planned">
              / {formatCurrency(planned, lang)}
            </span>
            <span className={`summary-card__diff ${diff >= 0 ? 'positive' : 'negative'}`}>
              {diff >= 0 ? '+' : ''}{formatCurrency(diff, lang)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
