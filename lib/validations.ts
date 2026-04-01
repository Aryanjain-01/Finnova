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
