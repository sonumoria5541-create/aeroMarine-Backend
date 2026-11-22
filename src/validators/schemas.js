import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(80),
    phone: z.string().min(8, 'Phone number must be at least 8 digits').max(20),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6),
    inviteCode: z.string().optional().or(z.literal('')),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the Maritime Terms & Conditions and Risk Disclosures',
    }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

export const loginSchema = z.object({
  body: z.object({
    phone: z.string().min(6, 'Valid phone number required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const depositSchema = z.object({
  body: z.object({
    amount: z.coerce.number().min(100, 'Minimum deposit is ₹100').max(10000000, 'Exceeds maximum single deposit limit'),
    paymentMethod: z.enum(['bank_transfer', 'upi', 'demo_transfer']).default('upi'),
    paymentReference: z.string().min(4, 'UTR / Payment reference is required'),
    idempotencyKey: z.string().optional(),
  }),
});

export const withdrawalSchema = z.object({
  body: z.object({
    amount: z.coerce.number().min(200, 'Minimum withdrawal is ₹200').max(1000000, 'Exceeds single withdrawal limit'),
    payoutMethod: z.enum(['bank_transfer', 'upi']),
    destination: z.object({
      accountHolderName: z.string().optional(),
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      upiId: z.string().optional(),
    }),
    idempotencyKey: z.string().optional(),
    confirmation: z.boolean().refine((val) => val === true, {
      message: 'You must confirm the withdrawal destination',
    }),
  }),
});

export const orderSchema = z.object({
  body: z.object({
    planId: z.string().min(1, 'Plan identifier required'),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'Must accept plan participation conditions',
    }),
  }),
});

export const contactSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name required'),
    email: z.string().email('Valid email required'),
    phone: z.string().optional(),
    subject: z.string().min(3, 'Subject required'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
  }),
});

export const adminDepositActionSchema = z.object({
  body: z.object({
    action: z.enum(['approve', 'reject', 'under_review']),
    adminNote: z.string().optional(),
  }),
});

export const adminWithdrawalActionSchema = z.object({
  body: z.object({
    action: z.enum(['approve', 'mark_paid', 'reject', 'under_review']),
    payoutReference: z.string().optional(),
    adminNote: z.string().optional(),
  }),
});
