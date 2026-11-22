import mongoose from 'mongoose';
import { WalletAccount } from '../models/WalletAccount.js';
import { LedgerTransaction } from '../models/LedgerTransaction.js';
import { LedgerEntry } from '../models/LedgerEntry.js';
import { toPaise, toRupees } from '../utils/currency.js';

/**
 * Ensures wallet exists for a user
 */
export const getOrCreateWallet = async (userId, session = null) => {
  let wallet = await WalletAccount.findOne({ user: userId }).session(session);
  if (!wallet) {
    const opts = session ? { session } : {};
    const created = await WalletAccount.create(
      [
        {
          user: userId,
          currency: 'INR',
          availableBalancePaise: 0,
          reservedBalancePaise: 0,
          pendingDepositsPaise: 0,
          pendingEarningsPaise: 0,
          totalCreditedPaise: 0,
          totalWithdrawnPaise: 0,
        },
      ],
      opts
    );
    wallet = created[0];
  }
  return wallet;
};

/**
 * Atomic Deposit Approval: Credits the user's available balance through a double-entry ledger posting
 */
export const creditDeposit = async ({
  userId,
  amount,
  currency = 'INR',
  referenceId,
  idempotencyKey,
  actorId = null,
  actorRole = 'admin',
  isDemo = true,
  session = null,
}) => {
  const amountPaise = toPaise(amount);
  if (amountPaise <= 0) {
    throw new Error('Deposit amount must be strictly greater than zero');
  }

  // Idempotency check: if transaction exists with this key, return it
  if (idempotencyKey) {
    const existing = await LedgerTransaction.findOne({ idempotencyKey }).session(session);
    if (existing) {
      return existing;
    }
  }

  const txnNumber = `TXN-DEP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Create Ledger Transaction
  const [transaction] = await LedgerTransaction.create(
    [
      {
        transactionId: txnNumber,
        type: 'deposit',
        user: userId,
        amount,
        amountPaise,
        currency,
        status: 'posted',
        idempotencyKey,
        referenceType: 'DepositRequest',
        referenceId,
        description: `Verified Deposit Credit of ₹${amount.toLocaleString('en-IN')}`,
        actor: actorId,
        actorRole,
        isDemo,
      },
    ],
    { session }
  );

  // Double-Entry:
  // 1. Credit User Available Account
  // 2. Debit System Clearing Account
  await LedgerEntry.create(
    [
      {
        transaction: transaction._id,
        accountType: 'user_available',
        user: userId,
        entryType: 'credit',
        amountPaise,
        currency,
      },
      {
        transaction: transaction._id,
        accountType: 'system_clearing',
        user: null,
        entryType: 'debit',
        amountPaise,
        currency,
      },
    ],
    { session }
  );

  // Atomically update wallet cache
  await getOrCreateWallet(userId, session);
  await WalletAccount.findOneAndUpdate(
    { user: userId },
    {
      $inc: {
        availableBalancePaise: amountPaise,
        totalCreditedPaise: amountPaise,
        pendingDepositsPaise: -amountPaise, // reduce pending deposits
      },
      $set: { lastReconciledAt: new Date() },
    },
    { session, new: true }
  );

  return transaction;
};

/**
 * Atomic Withdrawal Reservation: Moves funds from user_available to user_reserved
 */
export const reserveWithdrawal = async ({
  userId,
  amount,
  fee = 0,
  netAmount,
  currency = 'INR',
  referenceId,
  idempotencyKey,
  actorId = null,
  isDemo = true,
  session = null,
}) => {
  const amountPaise = toPaise(amount);
  if (amountPaise <= 0) {
    throw new Error('Withdrawal amount must be strictly positive');
  }

  // Check idempotency
  if (idempotencyKey) {
    const existing = await LedgerTransaction.findOne({ idempotencyKey }).session(session);
    if (existing) {
      return existing;
    }
  }

  // Ensure user has sufficient available balance
  const wallet = await getOrCreateWallet(userId, session);
  if (wallet.availableBalancePaise < amountPaise) {
    throw new Error('Insufficient available balance for withdrawal');
  }

  const txnNumber = `TXN-WTH-RSV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const [transaction] = await LedgerTransaction.create(
    [
      {
        transactionId: txnNumber,
        type: 'withdrawal_reserve',
        user: userId,
        amount,
        amountPaise,
        currency,
        status: 'posted',
        idempotencyKey,
        referenceType: 'WithdrawalRequest',
        referenceId,
        description: `Reservation for withdrawal request: ₹${amount.toLocaleString('en-IN')}`,
        actor: actorId || userId,
        actorRole: 'user',
        isDemo,
      },
    ],
    { session }
  );

  // Double-Entry:
  // 1. Debit User Available
  // 2. Credit User Reserved
  await LedgerEntry.create(
    [
      {
        transaction: transaction._id,
        accountType: 'user_available',
        user: userId,
        entryType: 'debit',
        amountPaise,
        currency,
      },
      {
        transaction: transaction._id,
        accountType: 'user_reserved',
        user: userId,
        entryType: 'credit',
        amountPaise,
        currency,
      },
    ],
    { session }
  );

  // Atomically decrement available, increment reserved
  const updatedWallet = await WalletAccount.findOneAndUpdate(
    {
      user: userId,
      availableBalancePaise: { $gte: amountPaise }, // Guard condition
    },
    {
      $inc: {
        availableBalancePaise: -amountPaise,
        reservedBalancePaise: amountPaise,
      },
      $set: { lastReconciledAt: new Date() },
    },
    { session, new: true }
  );

  if (!updatedWallet) {
    throw new Error('Concurrent withdrawal detected or insufficient available balance');
  }

  return transaction;
};

/**
 * Release Withdrawal Reservation: On rejection or cancellation, moves funds back from reserved to available
 */
export const releaseWithdrawalReservation = async ({
  userId,
  amount,
  currency = 'INR',
  referenceId,
  reason = 'Withdrawal rejected or cancelled',
  actorId = null,
  isDemo = true,
  session = null,
}) => {
  const amountPaise = toPaise(amount);

  const txnNumber = `TXN-WTH-REL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const [transaction] = await LedgerTransaction.create(
    [
      {
        transactionId: txnNumber,
        type: 'withdrawal_release',
        user: userId,
        amount,
        amountPaise,
        currency,
        status: 'posted',
        referenceType: 'WithdrawalRequest',
        referenceId,
        description: `Release reservation: ${reason}`,
        actor: actorId,
        actorRole: 'admin',
        isDemo,
      },
    ],
    { session }
  );

  // Double-Entry:
  // 1. Debit User Reserved
  // 2. Credit User Available
  await LedgerEntry.create(
    [
      {
        transaction: transaction._id,
        accountType: 'user_reserved',
        user: userId,
        entryType: 'debit',
        amountPaise,
        currency,
      },
      {
        transaction: transaction._id,
        accountType: 'user_available',
        user: userId,
        entryType: 'credit',
        amountPaise,
        currency,
      },
    ],
    { session }
  );

  await WalletAccount.findOneAndUpdate(
    {
      user: userId,
      reservedBalancePaise: { $gte: amountPaise },
    },
    {
      $inc: {
        reservedBalancePaise: -amountPaise,
        availableBalancePaise: amountPaise,
      },
      $set: { lastReconciledAt: new Date() },
    },
    { session, new: true }
  );

  return transaction;
};

/**
 * Finalize Paid Withdrawal: Debits user_reserved and credits system_payout
 */
export const finalizePaidWithdrawal = async ({
  userId,
  amount,
  fee = 0,
  netAmount,
  currency = 'INR',
  referenceId,
  payoutReference,
  actorId = null,
  isDemo = true,
  session = null,
}) => {
  const amountPaise = toPaise(amount);

  const txnNumber = `TXN-WTH-PAID-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const [transaction] = await LedgerTransaction.create(
    [
      {
        transactionId: txnNumber,
        type: 'withdrawal_paid',
        user: userId,
        amount,
        amountPaise,
        currency,
        status: 'posted',
        referenceType: 'WithdrawalRequest',
        referenceId,
        description: `Payout Dispatched: UTR ${payoutReference}`,
        actor: actorId,
        actorRole: 'admin',
        isDemo,
      },
    ],
    { session }
  );

  // Double-Entry:
  // 1. Debit User Reserved (amountPaise)
  // 2. Credit System Payout
  await LedgerEntry.create(
    [
      {
        transaction: transaction._id,
        accountType: 'user_reserved',
        user: userId,
        entryType: 'debit',
        amountPaise,
        currency,
      },
      {
        transaction: transaction._id,
        accountType: 'system_payout',
        user: null,
        entryType: 'credit',
        amountPaise,
        currency,
      },
    ],
    { session }
  );

  await WalletAccount.findOneAndUpdate(
    {
      user: userId,
      reservedBalancePaise: { $gte: amountPaise },
    },
    {
      $inc: {
        reservedBalancePaise: -amountPaise,
        totalWithdrawnPaise: amountPaise,
      },
      $set: { lastReconciledAt: new Date() },
    },
    { session, new: true }
  );

  return transaction;
};

/**
 * Container Purchase: Deducts from available balance for container fleet participation
 */
export const purchaseContainerPosition = async ({
  userId,
  planName,
  amount,
  currency = 'INR',
  referenceId,
  actorId = null,
  isDemo = true,
  session = null,
}) => {
  const amountPaise = toPaise(amount);

  const wallet = await getOrCreateWallet(userId, session);
  if (wallet.availableBalancePaise < amountPaise) {
    throw new Error('Insufficient balance to acquire container plan');
  }

  const txnNumber = `TXN-CONT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const [transaction] = await LedgerTransaction.create(
    [
      {
        transactionId: txnNumber,
        type: 'container_purchase',
        user: userId,
        amount,
        amountPaise,
        currency,
        status: 'posted',
        referenceType: 'PlanPosition',
        referenceId,
        description: `Acquired container unit: ${planName}`,
        actor: actorId || userId,
        actorRole: 'user',
        isDemo,
      },
    ],
    { session }
  );

  // Double-Entry:
  // 1. Debit User Available
  // 2. Credit System Revenue / Fleet Capital
  await LedgerEntry.create(
    [
      {
        transaction: transaction._id,
        accountType: 'user_available',
        user: userId,
        entryType: 'debit',
        amountPaise,
        currency,
      },
      {
        transaction: transaction._id,
        accountType: 'system_revenue',
        user: null,
        entryType: 'credit',
        amountPaise,
        currency,
      },
    ],
    { session }
  );

  const updatedWallet = await WalletAccount.findOneAndUpdate(
    {
      user: userId,
      availableBalancePaise: { $gte: amountPaise },
    },
    {
      $inc: {
        availableBalancePaise: -amountPaise,
      },
      $set: { lastReconciledAt: new Date() },
    },
    { session, new: true }
  );

  if (!updatedWallet) {
    throw new Error('Insufficient balance or concurrent order');
  }

  return transaction;
};

/**
 * Credit Earning to user available balance
 */
export const creditEarning = async ({
  userId,
  amount,
  period,
  planName,
  referenceId,
  batchId,
  actorId = null,
  isDemo = true,
  session = null,
}) => {
  const amountPaise = toPaise(amount);
  if (amountPaise <= 0) return null;

  const txnNumber = `TXN-ERN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const [transaction] = await LedgerTransaction.create(
    [
      {
        transactionId: txnNumber,
        type: 'earning_credit',
        user: userId,
        amount,
        amountPaise,
        currency: 'INR',
        status: 'posted',
        referenceType: 'EarningBatch',
        referenceId,
        description: `${isDemo ? '[SIMULATED] ' : ''}Fleet Revenue Accrual for ${planName} (${period})`,
        actor: actorId,
        actorRole: 'system',
        isDemo,
      },
    ],
    { session }
  );

  await LedgerEntry.create(
    [
      {
        transaction: transaction._id,
        accountType: 'user_available',
        user: userId,
        entryType: 'credit',
        amountPaise,
        currency: 'INR',
      },
      {
        transaction: transaction._id,
        accountType: 'user_earnings',
        user: userId,
        entryType: 'debit',
        amountPaise,
        currency: 'INR',
      },
    ],
    { session }
  );

  await WalletAccount.findOneAndUpdate(
    { user: userId },
    {
      $inc: {
        availableBalancePaise: amountPaise,
        totalCreditedPaise: amountPaise,
      },
      $set: { lastReconciledAt: new Date() },
    },
    { session, new: true }
  );

  return transaction;
};

/**
 * Reconcile wallet balance against ledger entries to ensure integrity
 */
export const reconcileWallet = async (userId) => {
  const userEntries = await LedgerEntry.find({
    user: userId,
    accountType: 'user_available',
  });

  let calculatedAvailablePaise = 0;
  for (const entry of userEntries) {
    if (entry.entryType === 'credit') {
      calculatedAvailablePaise += entry.amountPaise;
    } else {
      calculatedAvailablePaise -= entry.amountPaise;
    }
  }

  const reservedEntries = await LedgerEntry.find({
    user: userId,
    accountType: 'user_reserved',
  });

  let calculatedReservedPaise = 0;
  for (const entry of reservedEntries) {
    if (entry.entryType === 'credit') {
      calculatedReservedPaise += entry.amountPaise;
    } else {
      calculatedReservedPaise -= entry.amountPaise;
    }
  }

  const wallet = await getOrCreateWallet(userId);

  const isMatch =
    wallet.availableBalancePaise === calculatedAvailablePaise &&
    wallet.reservedBalancePaise === calculatedReservedPaise;

  if (!isMatch) {
    console.warn(
      `[Ledger Reconciliation Flag] Discrepancy detected for User: ${userId}. Recorded Available: ${wallet.availableBalancePaise} paise, Ledger Calculated: ${calculatedAvailablePaise} paise. Flagged for administrative review (no automated alteration).`
    );
  }

  return {
    isMatch,
    recordedAvailableBalance: toRupees(wallet.availableBalancePaise),
    recordedReservedBalance: toRupees(wallet.reservedBalancePaise),
    ledgerCalculatedAvailable: toRupees(calculatedAvailablePaise),
    ledgerCalculatedReserved: toRupees(calculatedReservedPaise),
    discrepancyPaise: calculatedAvailablePaise - wallet.availableBalancePaise,
    lastReconciledAt: wallet.lastReconciledAt,
  };
};
