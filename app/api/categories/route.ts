import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { categoryCreateSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const where = {
    userId: r.userId,
    ...(type === "INCOME" || type === "EXPENSE" ? { type: type as "INCOME" | "EXPENSE" } : {}),
  };

  const categories = await prisma.category.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const category = await prisma.category.create({
    data: { userId: r.userId, ...parsed.data },
  });

  return NextResponse.json(category);
}
