import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    // 1. Ожидаем параметры, чтобы код работал в любых версиях Next.js
    const resolvedParams = await context.params;
    const postId = parseInt(resolvedParams.id, 10);

    // Проверяем, что ID поста успешно распознался как число
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Некорректный ID поста" }, { status: 400 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID не передан" }, { status: 400 });
    }

    const userBigInt = BigInt(userId);

    // Проверяем, существует ли пользователь в БД
    const userExists = await prisma.user.findUnique({
      where: { telegramId: userBigInt }
    });

    if (!userExists) {
      return NextResponse.json({ 
        error: "Пользователь не найден.", 
        details: "Пожалуйста, нажмите 'Выйти' и авторизуйтесь заново через Telegram." 
      }, { status: 403 });
    }

    // Проверяем, стоит ли уже лайк
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId: postId, // Теперь тут точно целое число!
          userId: userBigInt
        }
      }
    });

    if (existingLike) {
      // Если лайк есть — убираем
      await prisma.like.delete({ where: { id: existingLike.id } });
      return NextResponse.json({ liked: false });
    } else {
      // Если нет — ставим
      await prisma.like.create({
        data: { postId, userId: userBigInt }
      });
      return NextResponse.json({ liked: true });
    }
  } catch (error: any) {
    console.error("Like error:", error);
    return NextResponse.json({ error: "Failed to process like", details: error.message }, { status: 500 });
  }
}