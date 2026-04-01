import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { profileUpdateSchema } from "@/lib/validations";

export async function GET() {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const user = await prisma.user.findUnique({
    where: { id: r.userId },
    select: { id: true, email: true, name: true, currency: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: r.userId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.currency ? { currency: parsed.data.currency } : {}),
    },
    select: { id: true, email: true, name: true, currency: true },
  });

  return NextResponse.json(user);
}
