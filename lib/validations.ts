import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().max(120).optional(),
});

export const accountCreateSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["CASH", "BANK", "CARD", "OTHER"]),
  currency: z.string().length(3).optional(),
});

export const accountUpdateSchema = accountCreateSchema.partial().extend({
  archived: z.boolean().optional(),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().max(32).optional(),
  icon: z.string().max(64).optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

const transactionFields = z.object({
  accountId: z.string().min(1),
  toAccountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  amount: z.coerce.number().positive().max(1e12),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  date: z.coerce.date(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.string().max(500).optional().nullable(),
});

export const transactionCreateSchema = transactionFields.superRefine((data, ctx) => {
  if (data.type === "TRANSFER") {
    if (!data.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "toAccountId is required for transfers",
        path: ["toAccountId"],
      });
    }
    if (data.toAccountId && data.toAccountId === data.accountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot transfer to the same account",
        path: ["toAccountId"],
      });
    }
  }
});

export const transactionUpdateSchema = z.object({
  accountId: z.string().min(1).optional(),
  toAccountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  amount: z.coerce.number().positive().max(1e12).optional(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
  date: z.coerce.date().optional(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.string().max(500).optional().nullable(),
});

export const budgetUpsertSchema = z.object({
  categoryId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  limitAmount: z.coerce.number().positive().max(1e12),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const profileUpdateSchema = z.object({
  name: z.string().max(120).optional().nullable(),
  currency: z.string().length(3).optional(),
});

export const savingsGoalCreateSchema = z.object({
  name: z.string().min(1).max(120),
  targetAmount: z.coerce.number().positive().max(1e12),
  currentAmount: z.coerce.number().min(0).max(1e12).optional(),
  deadline: z.coerce.date().optional().nullable(),
  color: z.string().max(32).optional(),
  icon: z.string().max(64).optional(),
});

export const savingsGoalUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  targetAmount: z.coerce.number().positive().max(1e12).optional(),
  currentAmount: z.coerce.number().min(0).max(1e12).optional(),
  deadline: z.coerce.date().optional().nullable(),
  color: z.string().max(32).optional(),
  icon: z.string().max(64).optional(),
  contribute: z.coerce.number().max(1e12).optional(),
});

export const recurringCreateSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  amount: z.coerce.number().positive().max(1e12),
  type: z.enum(["INCOME", "EXPENSE"]),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  active: z.boolean().optional(),
});

export const recurringUpdateSchema = z.object({
  accountId: z.string().min(1).optional(),
  categoryId: z.string().optional().nullable(),
  amount: z.coerce.number().positive().max(1e12).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  active: z.boolean().optional(),
});
