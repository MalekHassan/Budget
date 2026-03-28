import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import './MonthPicker.css';

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

interface MonthPickerProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  locked?: boolean;
}

export function MonthPicker({ year, month, onChange, locked = false }: MonthPickerProps) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const monthName = isAr ? MONTH_NAMES_AR[month - 1] : MONTH_NAMES_EN[month - 1];

  const navigate = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    onChange(y, m);
  };

  return (
    <div className="month-picker glass-card">
      <button onClick={() => navigate(-1)} className="month-picker__btn">
        {isAr ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
      <div className="month-picker__label">
        <span className="month-picker__month">{monthName}</span>
        <span className="month-picker__year">{year}</span>
        {locked && <Lock size={12} className="month-picker__lock-icon" />}
      </div>
      <button onClick={() => navigate(1)} className="month-picker__btn">
        {isAr ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>
    </div>
  );
}
