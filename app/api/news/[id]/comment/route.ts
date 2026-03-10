import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    // 1. Ожидаем параметры (исправляет ошибку с NaN / undefined в новых версиях Next.js)
    const resolvedParams = await context.params;
    const postId = parseInt(resolvedParams.id, 10);

    if (isNaN(postId)) {
      return NextResponse.json({ error: "Некорректный ID поста" }, { status: 400 });
    }

    const { userId, content } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID не передан" }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Комментарий не может быть пустым" }, { status: 400 });
    }

    const userBigInt = BigInt(userId);

    // 2. ЗАЩИТА: Проверяем, существует ли пользователь (исправляет ошибку Foreign Key)
    const userExists = await prisma.user.findUnique({
      where: { telegramId: userBigInt }
    });

    if (!userExists) {
      return NextResponse.json({ 
        error: "Пользователь не найден.", 
        details: "Пожалуйста, нажмите 'Выйти' и авторизуйтесь заново через Telegram." 
      }, { status: 403 });
    }

    // 3. Создаем комментарий
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        postId: postId, 
        authorId: userBigInt
      },
      include: {
        // Подтягиваем данные автора, чтобы сразу красиво отобразить на фронтенде
        author: { select: { firstName: true, photoUrl: true } } 
      }
    });

    // 4. Возвращаем результат
    return NextResponse.json({
      ...comment,
      authorId: comment.authorId.toString()
    });
  } catch (error: any) {
    console.error("Comment error:", error);
    // Теперь, если что-то пойдет не так, мы увидим точную причину (details) в консоли сети
    return NextResponse.json({ error: "Failed to add comment", details: error.message }, { status: 500 });
  }
}