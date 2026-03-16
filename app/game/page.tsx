import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import GameManager from "@/app/components/game/GameManager";

const GAME_JWT_SECRET = process.env.GAME_JWT_SECRET || "change_me_secret";
const BOT_TOKEN       = process.env.BOT_TOKEN       || "secret";

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, BOT_TOKEN) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(decoded.userId) },
      include: { base: true },
    });
    return user;
  } catch {
    return null;
  }
}

export default async function GamePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  // Создаём базу если её ещё нет
  if (!user.base) {
    const mapX = 50 + Math.floor(Math.random() * 400);
    const mapY = 50 + Math.floor(Math.random() * 400);
    await prisma.base.create({
      data: { userId: user.id, mapX, mapY }
    });
  }

  // Генерируем игровой JWT (отдельный секрет!)
  const gameToken = jwt.sign(
    { userId: user.telegramId.toString(), username: user.firstName || user.username || "Командир" },
    GAME_JWT_SECRET,
    { expiresIn: "2h" }
  );

  return (
    <div className="w-full h-screen overflow-hidden">
      <GameManager
        userId={user.telegramId.toString()}
        gameToken={gameToken}
      />
    </div>
  );
}