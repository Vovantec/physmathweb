import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const postId = parseInt(params.id);
    
    // TODO: Получите реальный ID пользователя из сессии/куки!
    // Пока для примера берем из тела запроса или ставим заглушку
    const body = await req.json();
    const userId = BigInt(body.userId); 

    if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    // Проверяем, стоит ли уже лайк
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: { postId, userId }
      }
    });

    if (existingLike) {
      // Если лайк есть — удаляем (забираем лайк)
      await prisma.like.delete({ where: { id: existingLike.id } });
      return NextResponse.json({ liked: false });
    } else {
      // Если лайка нет — создаем
      await prisma.like.create({ data: { postId, userId } });
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}