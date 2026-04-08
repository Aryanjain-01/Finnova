import { prisma } from "@/lib/prisma";

export async function seedDefaultsForUser(userId: string) {
  const cash = await prisma.account.create({
    data: {
      userId,
      name: "Cash",
      type: "CASH",
    },
  });

  await prisma.category.createMany({
    data: [
      { userId, name: "Salary", type: "INCOME", color: "#22c55e" },
      { userId, name: "Family allowance", type: "INCOME", color: "#16a34a" },
      { userId, name: "Family allowance (cash)", type: "INCOME", color: "#15803d" },
      { userId, name: "Food", type: "EXPENSE", color: "#f97316" },
      { userId, name: "Rent", type: "EXPENSE", color: "#3b82f6" },
      { userId, name: "Transport", type: "EXPENSE", color: "#a855f7" },
      { userId, name: "Other", type: "EXPENSE", color: "#64748b" },
    ],
  });

  await prisma.savingsGoal.create({
    data: {
      userId,
      name: "Emergency fund",
      targetAmount: 100000,
      currentAmount: 0,
      color: "#10b981",
      icon: "shield",
    },
  });

  return cash;
}
