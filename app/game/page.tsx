import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import GameClientWrapper from "./GameClientWrapper";

const GAME_JWT_SECRET = process.env.GAME_JWT_SECRET || "change_me_secret";
const BOT_TOKEN       = process.env.BOT_TOKEN       || "secret";

// Отключаем статическую генерацию — страница всегда динамическая
export const dynamic = "force-dynamic";

async function getCurrentUser(uidFromQuery?: string) {
  let telegramId: bigint | null = null;

  if (uidFromQuery) {
    try { telegramId = BigInt(uidFromQuery); } catch { /* игнорируем */ }
  }

  if (!telegramId) {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("session_token")?.value;
      if (token) {
        const decoded = jwt.verify(token, BOT_TOKEN) as { userId: string };
        telegramId = BigInt(decoded.userId);
      }
    } catch { /* невалидная кука */ }
  }

  if (!telegramId) return null;

  try {
    return await prisma.user.findUnique({
      where: { telegramId },
      include: { base: true },
    });
  } catch (e: any) {
    console.error("[game/page] prisma error:", e?.message);
    try {
      const user = await prisma.user.findUnique({ where: { telegramId } });
      if (!user) return null;
      return { ...user, base: null };
    } catch {
      return null;
    }
  }
}

export default async function GamePage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser(params.uid);

  if (!user) {
    redirect("/");
  }

  // Создаём базу если нет
  if (!user.base) {
    try {
      const mapX = 50 + Math.floor(Math.random() * 400);
      const mapY = 50 + Math.floor(Math.random() * 400);
      await prisma.base.create({
        data: { userId: user.id, mapX, mapY }
      });
    } catch (e: any) {
      console.error("[game/page] base create error:", e?.message);
    }
  }

  const gameToken = jwt.sign(
    {
      userId:   user.telegramId.toString(),
      username: user.firstName || user.username || "Командир",
    },
    GAME_JWT_SECRET,
    { expiresIn: "2h" }
  );

  // Рендерим только серверную обёртку с данными.
  // GameManager грузится исключительно на клиенте через GameClientWrapper.
  return (
    <div className="w-full h-screen overflow-hidden" suppressHydrationWarning>
      <GameClientWrapper
        userId={user.telegramId.toString()}
        gameToken={gameToken}
      />
    </div>
  );
}