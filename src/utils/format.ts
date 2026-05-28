export const formatCurrency = (amount?: number, currency = 'USD') => {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '--';
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

export const formatRelativeTime = (iso?: string) => {
  if (!iso) {
    return '--';
  }

  const timestamp = new Date(iso).getTime();
  if (!timestamp || Number.isNaN(timestamp)) {
    return '--';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};
