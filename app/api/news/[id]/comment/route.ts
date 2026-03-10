import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const postId = parseInt(params.id);
    const body = await req.json();
    const { content, userId } = body; // TODO: userId брать из защищенной сессии!

    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "Комментарий пуст" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        authorId: BigInt(userId),
      },
      include: {
        author: { select: { firstName: true, username: true } } // Возвращаем имя автора, чтобы сразу показать на фронте
      }
    });

    // Преобразуем BigInt для JSON
    const serializedComment = {
      ...comment,
      authorId: comment.authorId.toString()
    };

    return NextResponse.json({ success: true, comment: serializedComment });
  } catch (error) {
    console.error("Comment error:", error);
    return NextResponse.json({ error: "Ошибка при отправке комментария" }, { status: 500 });
  }
}