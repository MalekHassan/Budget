import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Pencil, ImageIcon, X } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import type { Transaction } from '../types';
import './TransactionItem.css';

interface TransactionItemProps {
  transaction: Transaction;
  onEdit?: (txn: Transaction) => void;
  onDelete?: (id: string) => void;
}

export function TransactionItem({ transaction, onEdit, onDelete }: TransactionItemProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const { description, category, amount, type, date, receiptUrl } = transaction;
  const [showImage, setShowImage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isAr = lang === 'ar';

  const dateStr = date instanceof Date
    ? date.toLocaleDateString(lang === 'ar' ? 'ar-JO' : 'en-GB', { day: 'numeric', month: 'short' })
    : '';

  return (
    <>
      <div className={`txn-item ${type === 'income' ? 'txn-item--income' : ''}`}>
        <div className="txn-item__info">
          <span className="txn-item__desc">
            {receiptUrl && (
              <button className="txn-item__receipt-icon" onClick={() => setShowImage(true)} title="View receipt">
                <ImageIcon size={13} />
              </button>
            )}
            {description || category}
          </span>
          <span className="txn-item__meta">{category} · {dateStr}</span>
        </div>
        <div className="txn-item__right">
          <span className={`txn-item__amount ${type === 'income' ? 'txn-item__amount--income' : ''}`}>
            {type === 'income' ? '+' : '-'}{formatCurrency(amount, lang)}
          </span>
          <div className="txn-item__actions">
            {onEdit && (
              <button className="txn-item__btn" onClick={() => onEdit(transaction)}>
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button className="txn-item__btn txn-item__btn--delete" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && onDelete && (
        <div className="txn-item__image-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="txn-item__confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="txn-item__confirm-title">
              {isAr ? 'حذف المعاملة؟' : 'Delete Transaction?'}
            </h3>
            <div className="txn-item__confirm-details">
              <div className="txn-item__confirm-row">
                <span className="txn-item__confirm-label">{isAr ? 'الفئة' : 'Category'}</span>
                <span>{category}</span>
              </div>
              {description && (
                <div className="txn-item__confirm-row">
                  <span className="txn-item__confirm-label">{isAr ? 'الوصف' : 'Description'}</span>
                  <span>{description}</span>
                </div>
              )}
              <div className="txn-item__confirm-row">
                <span className="txn-item__confirm-label">{isAr ? 'المبلغ' : 'Amount'}</span>
                <span className={type === 'income' ? 'txn-item__amount--income' : 'txn-item__amount'}>
                  {type === 'income' ? '+' : '-'}{formatCurrency(amount, lang)}
                </span>
              </div>
              <div className="txn-item__confirm-row">
                <span className="txn-item__confirm-label">{isAr ? 'التاريخ' : 'Date'}</span>
                <span>{dateStr}</span>
              </div>
            </div>
            <div className="txn-item__confirm-actions">
              <button
                className="btn-secondary"
                style={{ flex: 1, padding: '10px' }}
                onClick={() => setShowDeleteConfirm(false)}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                className="txn-item__confirm-delete-btn"
                onClick={() => { setShowDeleteConfirm(false); onDelete(transaction.id); }}
              >
                <Trash2 size={14} />
                {isAr ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Image Viewer */}
      {showImage && receiptUrl && (
        <div className="txn-item__image-overlay" onClick={() => setShowImage(false)}>
          <div className="txn-item__image-modal" onClick={(e) => e.stopPropagation()}>
            <button className="txn-item__image-close" onClick={() => setShowImage(false)}>
              <X size={20} />
            </button>
            <img src={receiptUrl} alt="Receipt" className="txn-item__image" />
          </div>
        </div>
      )}
    </>
  );
}
