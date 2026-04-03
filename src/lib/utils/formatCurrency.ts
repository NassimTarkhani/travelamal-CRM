export const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return '0,000 TND';
  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3,
  }).format(amount);
};
