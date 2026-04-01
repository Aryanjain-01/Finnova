import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireUserId(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId };
}
