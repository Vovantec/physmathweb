import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkInternalAuth, jsonResponse } from "@/lib/internal-api";

// GET — загрузить базу
export async function GET(request: Request) {
  if (!checkInternalAuth(request)) return jsonResponse({ error: "Unauthorized" }, 401);

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return jsonResponse({ error: "userId required" }, 400);

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) },
      include: { base: true },
    });

    if (!user) return jsonResponse({ error: "User not found" }, 404);

    return jsonResponse({
      base: user.base,
      username: user.firstName || user.username || "Командир",
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "Server error" }, 500);
  }
}

// POST — сохранить базу
export async function POST(request: Request) {
  if (!checkInternalAuth(request)) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    const { userId, buildings, resources } = await request.json();
    if (!userId) return jsonResponse({ error: "userId required" }, 400);

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) },
    });
    if (!user) return jsonResponse({ error: "User not found" }, 404);

    await prisma.base.update({
      where: { userId: user.id },
      data: { buildings, resources },
    });

    return jsonResponse({ success: true });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "Server error" }, 500);
  }
}