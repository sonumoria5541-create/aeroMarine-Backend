/**
 * Safe currency calculation utility for AeroMarine
 * All internal ledger calculations use integer minor units (paise: 1 INR = 100 paise)
 * to prevent floating point inaccuracies.
 */

export const toPaise = (rupees) => {
  if (typeof rupees !== 'number' || isNaN(rupees)) {
    throw new Error('Invalid rupee amount');
  }
  return Math.round(rupees * 100);
};

export const toRupees = (paise) => {
  if (typeof paise !== 'number' || isNaN(paise)) {
    throw new Error('Invalid paise amount');
  }
  return paise / 100;
};

export const formatINR = (amount, isPaise = false) => {
  const value = isPaise ? toRupees(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
