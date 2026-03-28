import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import './DateRangePicker.css';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export type ViewMode = 'monthly' | 'yearly';

interface DateRangePickerProps {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onChange: (startYear: number, startMonth: number, endYear: number, endMonth: number) => void;
}

type PickerTarget = 'start' | 'end' | null;

export function DateRangePicker({
  startYear, startMonth, endYear, endMonth,
  viewMode, onViewModeChange, onChange,
}: DateRangePickerProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const monthNames = isAr ? MONTHS_AR : MONTHS_EN;

  const [openPicker, setOpenPicker] = useState<PickerTarget>(null);
  const [pickerYear, setPickerYear] = useState(startYear);

  const openFor = (target: PickerTarget) => {
    setPickerYear(target === 'start' ? startYear : endYear);
    setOpenPicker(openPicker === target ? null : target);
  };

  const selectMonth = (month: number) => {
    if (openPicker === 'start') {
      onChange(pickerYear, month, endYear, endMonth);
    } else {
      onChange(startYear, startMonth, pickerYear, month);
    }
    setOpenPicker(null);
  };

  const selectYear = (year: number) => {
    if (openPicker === 'start') {
      onChange(year, 1, endYear, endMonth);
    } else {
      onChange(startYear, startMonth, year, 12);
    }
    setOpenPicker(null);
  };

  const formatLabel = (y: number, m: number) => {
    if (viewMode === 'yearly') return `${y}`;
    return `${monthNames[m - 1]} ${y}`;
  };

  return (
    <div className="drp">
      {/* View Mode Toggle */}
      <div className="drp__mode-toggle">
        <button
          className={`drp__mode-btn ${viewMode === 'monthly' ? 'drp__mode-btn--active' : ''}`}
          onClick={() => onViewModeChange('monthly')}
        >
          {isAr ? 'شهري' : 'Monthly'}
        </button>
        <button
          className={`drp__mode-btn ${viewMode === 'yearly' ? 'drp__mode-btn--active' : ''}`}
          onClick={() => onViewModeChange('yearly')}
        >
          {isAr ? 'سنوي' : 'Yearly'}
        </button>
      </div>

      {/* Date Range Buttons */}
      <div className="drp__range">
        <button className={`drp__date-btn ${openPicker === 'start' ? 'drp__date-btn--active' : ''}`} onClick={() => openFor('start')}>
          <Calendar size={14} />
          <span className="drp__date-label">{t('analytics.from')}</span>
          <span className="drp__date-value">{formatLabel(startYear, startMonth)}</span>
        </button>
        <span className="drp__arrow">→</span>
        <button className={`drp__date-btn ${openPicker === 'end' ? 'drp__date-btn--active' : ''}`} onClick={() => openFor('end')}>
          <Calendar size={14} />
          <span className="drp__date-label">{t('analytics.to')}</span>
          <span className="drp__date-value">{formatLabel(endYear, endMonth)}</span>
        </button>
      </div>

      {/* Picker Dropdown */}
      {openPicker && (
        <div className="drp__dropdown">
          {/* Year Navigation */}
          <div className="drp__year-nav">
            {viewMode === 'yearly' ? (
              <>
                <button onClick={() => setPickerYear(pickerYear - 5)}><ChevronLeft size={16} /></button>
                <span className="drp__year-label">{pickerYear - 2} — {pickerYear + 2}</span>
                <button onClick={() => setPickerYear(pickerYear + 5)}><ChevronRight size={16} /></button>
              </>
            ) : (
              <>
                <button onClick={() => setPickerYear(pickerYear - 1)}><ChevronLeft size={16} /></button>
                <span className="drp__year-label">{pickerYear}</span>
                <button onClick={() => setPickerYear(pickerYear + 1)}><ChevronRight size={16} /></button>
              </>
            )}
          </div>

          {/* Month or Year Grid */}
          {viewMode === 'monthly' ? (
            <div className="drp__month-grid">
              {monthNames.map((name, idx) => {
                const m = idx + 1;
                const isSelected =
                  (openPicker === 'start' && pickerYear === startYear && m === startMonth) ||
                  (openPicker === 'end' && pickerYear === endYear && m === endMonth);
                const isInRange =
                  `${pickerYear}_${String(m).padStart(2, '0')}` >= `${startYear}_${String(startMonth).padStart(2, '0')}` &&
                  `${pickerYear}_${String(m).padStart(2, '0')}` <= `${endYear}_${String(endMonth).padStart(2, '0')}`;
                return (
                  <button
                    key={m}
                    className={`drp__month-btn ${isSelected ? 'drp__month-btn--selected' : ''} ${isInRange ? 'drp__month-btn--in-range' : ''}`}
                    onClick={() => selectMonth(m)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="drp__year-grid">
              {Array.from({ length: 5 }, (_, i) => pickerYear - 2 + i).map((y) => {
                const isSelected =
                  (openPicker === 'start' && y === startYear) ||
                  (openPicker === 'end' && y === endYear);
                const isInRange = y >= startYear && y <= endYear;
                return (
                  <button
                    key={y}
                    className={`drp__year-btn ${isSelected ? 'drp__year-btn--selected' : ''} ${isInRange ? 'drp__year-btn--in-range' : ''}`}
                    onClick={() => selectYear(y)}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
