export function formatCurrency(amount: number, language: string = 'en'): string {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toFixed(3);

  if (language === 'ar') {
    const sign = amount < 0 ? '-' : '';
    return `${sign}${formatted} د.أ`;
  }

  const sign = amount < 0 ? '-' : '';
  return `${sign}${formatted} JD`;
}

export function formatDiff(amount: number, language: string = 'en'): string {
  const sign = amount > 0 ? '+' : '';
  return `${sign}${formatCurrency(amount, language)}`;
}

export function formatPercentage(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
