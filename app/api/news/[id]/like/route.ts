import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await req.json();
    const postId = parseInt(params.id);

    // Проверяем, стоит ли уже лайк от этого пользователя
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId: postId,
          userId: BigInt(userId)
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
        data: { postId, userId: BigInt(userId) }
      });
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json({ error: "Failed to process like" }, { status: 500 });
  }
}