import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Camera, ImageUp, Loader2, Receipt, Trash2, Plus, ListChecks, Hash } from 'lucide-react';
import { scanReceipt, type ReceiptResult } from '../utils/receiptScanner';
import { CameraCapture } from './CameraCapture';
import { uploadReceiptImage } from '../firebase/storage';
import type { Transaction, CategoryPlan, ReceiptItem, MonthBudget } from '../types';
import './TransactionForm.css';

interface TransactionFormProps {
  expenseCategories: CategoryPlan[];
  incomeCategories: CategoryPlan[];
  editTransaction?: Transaction | null;
  onSave: (data: Array<{
    date: Date;
    amount: number;
    type: 'expense' | 'income';
    category: string;
    description: string;
    monthKey: string;
    createdBy: string;
    receiptUrl?: string;
  }>) => void;
  onClose: () => void;
  userId: string;
  householdId: string;
  householdMonths?: MonthBudget[];
}

export function TransactionForm({
  expenseCategories,
  incomeCategories,
  editTransaction,
  onSave,
  onClose,
  userId,
  householdId,
  householdMonths = [],
}: TransactionFormProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [type, setType] = useState<'expense' | 'income'>(editTransaction?.type || 'expense');
  const [amount, setAmount] = useState(editTransaction?.amount?.toString() || '');
  const [category, setCategory] = useState(editTransaction?.category || '');
  const [description, setDescription] = useState(editTransaction?.description || '');
  const [dateStr, setDateStr] = useState(() => {
    const d = editTransaction?.date instanceof Date ? editTransaction.date : new Date();
    return d.toISOString().split('T')[0];
  });
  const [budgetMonthKey, setBudgetMonthKey] = useState(() => {
    if (editTransaction?.date instanceof Date) {
      const d = editTransaction.date;
      return `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    
    // For new transactions, default to first unlocked month
    const unlockedMonths = householdMonths.filter(m => !m.locked);
    if (unlockedMonths.length > 0) {
      const firstUnlocked = unlockedMonths[unlockedMonths.length - 1]; // oldest unlocked
      return `${firstUnlocked.year}_${String(firstUnlocked.month).padStart(2, '0')}`;
    }
    
    // Fallback to current month
    const d = new Date();
    return `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Receipt scanning state
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptMode, setReceiptMode] = useState<'items' | 'total'>('items');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = type === 'expense' ? expenseCategories : incomeCategories;

  useEffect(() => {
    if (!editTransaction) {
      setCategory(categories[0]?.name || '');
    }
  }, [type]);

  const handleReceiptUpload = async (file: File) => {
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setScanError('');
    setScanning(true);

    try {
      const result: ReceiptResult = await scanReceipt(file);
      if (result.total > 0) {
        setAmount(result.total.toFixed(3));
      }
      if (result.items.length > 0) {
        setReceiptItems(result.items);
      }
      if (result.storeName && !description) {
        setDescription(result.storeName);
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Failed to scan receipt');
    } finally {
      setScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleReceiptUpload(file);
  };

  const handleCameraCapture = (file: File) => {
    setShowCamera(false);
    handleReceiptUpload(file);
  };

  const clearReceipt = () => {
    setReceiptPreview(null);
    setReceiptFile(null);
    setReceiptItems([]);
    setReceiptMode('items');
    setScanError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    setSaving(true);

    const date = new Date(dateStr);
    const monthKey = budgetMonthKey;

    // Upload receipt image if present (falls back to base64 if Storage fails)
    let receiptUrl: string | undefined;
    if (receiptFile) {
      receiptUrl = await uploadReceiptImage(householdId, receiptFile);
    }

    // If receipt items exist and mode is 'items', save each item separately
    if (receiptItems.length > 0 && receiptMode === 'items') {
      const validItems = receiptItems.filter((item) => item.price > 0);
      if (validItems.length === 0) { setSaving(false); return; }

      const transactions = validItems.map((item) => ({
        date,
        amount: item.price,
        type,
        category,
        description: item.name || description,
        monthKey,
        createdBy: userId,
        receiptUrl,
      }));
      onSave(transactions);
    } else {
      const parsedAmount = parseFloat(amount);
      if (!parsedAmount) { setSaving(false); return; }

      onSave([{
        date,
        amount: parsedAmount,
        type,
        category,
        description,
        monthKey,
        createdBy: userId,
        receiptUrl,
      }]);
    }
  };

  return (
    <div className="txn-form-overlay" onClick={onClose}>
      <div className="txn-form slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="txn-form__header">
          <h2>{editTransaction ? t('transaction.edit') : t('transaction.addNew')}</h2>
          <button className="txn-form__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type Toggle */}
          <div className="txn-form__toggle">
            <button
              type="button"
              className={`txn-form__toggle-btn ${type === 'expense' ? 'txn-form__toggle-btn--active txn-form__toggle-btn--expense' : ''}`}
              onClick={() => setType('expense')}
            >
              {t('transaction.expense')}
            </button>
            <button
              type="button"
              className={`txn-form__toggle-btn ${type === 'income' ? 'txn-form__toggle-btn--active txn-form__toggle-btn--income' : ''}`}
              onClick={() => setType('income')}
            >
              {t('transaction.income')}
            </button>
          </div>

          {/* Receipt Scanner */}
          {type === 'expense' && !editTransaction && (
            <div className="txn-form__receipt">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              {showCamera && (
                <CameraCapture
                  onCapture={handleCameraCapture}
                  onClose={() => setShowCamera(false)}
                />
              )}
              {!receiptPreview ? (
                <div className="txn-form__receipt-buttons">
                  <button
                    type="button"
                    className="txn-form__receipt-btn"
                    onClick={() => setShowCamera(true)}
                  >
                    <Camera size={20} />
                    {isAr ? 'التقاط صورة' : 'Take Photo'}
                  </button>
                  <button
                    type="button"
                    className="txn-form__receipt-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageUp size={20} />
                    {isAr ? 'رفع صورة' : 'Upload Image'}
                  </button>
                </div>
              ) : (
                <div className="txn-form__receipt-preview">
                  <img src={receiptPreview} alt="Receipt" className="txn-form__receipt-img" />
                  <button type="button" className="txn-form__receipt-remove" onClick={clearReceipt}>
                    <Trash2 size={16} />
                  </button>
                  {scanning && (
                    <div className="txn-form__receipt-scanning">
                      <Loader2 size={20} className="spin" />
                      <span>{isAr ? 'جاري القراءة...' : 'Scanning...'}</span>
                    </div>
                  )}
                </div>
              )}
              {scanError && <p className="txn-form__receipt-error">{scanError}</p>}
            </div>
          )}

          {/* Amount */}
          <div className="txn-form__field">
            <label>{t('transaction.amount')}</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.000"
              className="txn-form__amount-input"
              autoFocus
              required
            />
          </div>

          {/* Receipt Line Items */}
          {receiptItems.length > 0 && (
            <div className="txn-form__items">
              <div className="txn-form__items-header">
                <Receipt size={14} />
                <span>{isAr ? 'عناصر الإيصال' : 'Receipt Items'}</span>
              </div>
              <div className="txn-form__items-list">
                {receiptItems.map((item, i) => (
                  <div key={i} className="txn-form__item-row">
                    <input
                      type="text"
                      className="txn-form__item-name-input"
                      value={item.name}
                      dir="auto"
                      onChange={(e) => {
                        const updated = [...receiptItems];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setReceiptItems(updated);
                      }}
                    />
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      className="txn-form__item-price-input"
                      value={item.price}
                      onChange={(e) => {
                        const newPrice = parseFloat(e.target.value) || 0;
                        const updated = [...receiptItems];
                        updated[i] = { ...updated[i], price: newPrice };
                        setReceiptItems(updated);
                        const newTotal = updated.reduce((sum, it) => sum + it.price, 0);
                        setAmount(newTotal.toFixed(3));
                      }}
                    />
                    <button
                      type="button"
                      className="txn-form__item-delete"
                      onClick={() => {
                        const updated = receiptItems.filter((_, idx) => idx !== i);
                        setReceiptItems(updated);
                        const newTotal = updated.reduce((sum, it) => sum + it.price, 0);
                        setAmount(newTotal.toFixed(3));
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="txn-form__item-add"
                onClick={() => {
                  setReceiptItems([...receiptItems, { name: '', price: 0 }]);
                }}
              >
                <Plus size={14} />
                {isAr ? 'إضافة عنصر' : 'Add Item'}
              </button>

              {/* Items vs Total toggle */}
              <div className="txn-form__receipt-mode">
                <button
                  type="button"
                  className={`txn-form__receipt-mode-btn ${receiptMode === 'items' ? 'txn-form__receipt-mode-btn--active' : ''}`}
                  onClick={() => setReceiptMode('items')}
                >
                  <ListChecks size={14} />
                  {isAr ? 'حفظ كعناصر' : 'Save as Items'}
                </button>
                <button
                  type="button"
                  className={`txn-form__receipt-mode-btn ${receiptMode === 'total' ? 'txn-form__receipt-mode-btn--active' : ''}`}
                  onClick={() => setReceiptMode('total')}
                >
                  <Hash size={14} />
                  {isAr ? 'حفظ كمجموع' : 'Save as Total'}
                </button>
              </div>
            </div>
          )}

          {/* Category */}
          <div className="txn-form__field">
            <label>{t('transaction.category')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="" disabled>{isAr ? 'اختر الفئة' : 'Select category'}</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {isAr ? cat.name : (cat.nameEn || cat.name)}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="txn-form__field">
            <label>{t('transaction.description')}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isAr ? 'وصف المعاملة...' : 'Transaction description...'}
              dir="auto"
            />
          </div>

          {/* Date */}
          <div className="txn-form__field">
            <label>{t('transaction.date')}</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => {
                setDateStr(e.target.value);
              }}
              required
            />
          </div>

          {/* Budget Month */}
          <div className="txn-form__field">
            <label>{isAr ? 'شهر الميزانية' : 'Budget Month'}</label>
            <select
              className="budget-month-select"
              value={budgetMonthKey}
              onChange={(e) => setBudgetMonthKey(e.target.value)}
              required
            >
              {householdMonths
                .filter(month => !month.locked)
                .sort((a, b) => b.year - a.year || b.month - a.month) // newest first
                .map(month => {
                  const monthName = isAr 
                    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][month.month - 1]
                    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month.month - 1];
                  return (
                    <option key={month.id} value={`${month.year}_${String(month.month).padStart(2, '0')}`}>
                      {monthName} {month.year}
                    </option>
                  );
                })}
            </select>
          </div>

          {/* Actions */}
          <div className="txn-form__actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {t('transaction.cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : t('transaction.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
