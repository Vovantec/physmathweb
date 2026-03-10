import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await req.json();
    const postId = parseInt(params.id);

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const userBigInt = BigInt(userId);

    // 1. ЗАЩИТА: Проверяем, существует ли пользователь в БД на самом деле
    const userExists = await prisma.user.findUnique({
      where: { telegramId: userBigInt }
    });

    if (!userExists) {
      return NextResponse.json({ 
        error: "Пользователь не найден в базе данных.", 
        details: "Пожалуйста, нажмите 'Выйти' и авторизуйтесь заново через Telegram." 
      }, { status: 403 });
    }

    // 2. Проверяем, стоит ли уже лайк
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId: postId,
          userId: userBigInt
        }
      }
    });

    if (existingLike) {
      // Убираем лайк
      await prisma.like.delete({ where: { id: existingLike.id } });
      return NextResponse.json({ liked: false });
    } else {
      // Ставим лайк
      await prisma.like.create({
        data: { postId, userId: userBigInt }
      });
      return NextResponse.json({ liked: true });
    }
  } catch (error: any) {
    console.error("Like error:", error);
    // Возвращаем детальную ошибку
    return NextResponse.json({ error: "Failed to process like", details: error.message }, { status: 500 });
  }
}