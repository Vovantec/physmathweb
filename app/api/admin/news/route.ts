import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Получение списка всех новостей для админки
export async function GET() {
  try {
    const news = await prisma.newsPost.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Преобразуем BigInt в строки, чтобы JSON.stringify не выдавал ошибку
    const serializedNews = news.map(post => ({
      ...post,
      authorId: post.authorId?.toString(),
    }));

    return NextResponse.json(serializedNews);
  } catch (error) {
    console.error("Admin news fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}

// POST: Создание новой новости
export async function POST(req: Request) {
  try {
    const { title, content, tags, authorId } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const newPost = await prisma.newsPost.create({
      data: {
        title,
        content,
        tags: tags || "[]",
        // Если автор передан, сохраняем его как BigInt (ID из Telegram)
        authorId: authorId ? BigInt(authorId) : null,
      },
    });

    // Возвращаем созданный пост, предварительно сериализовав BigInt
    return NextResponse.json({
      ...newPost,
      authorId: newPost.authorId?.toString(),
    });
  } catch (error) {
    console.error("News creation error:", error);
    return NextResponse.json({ error: "Failed to create news" }, { status: 500 });
  }
}

// DELETE: Удаление новости по ID
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "News ID is required" }, { status: 400 });
    }

    await prisma.newsPost.delete({
      where: {
        id: parseInt(id),
      },
    });

    return NextResponse.json({ success: true, message: "News deleted successfully" });
  } catch (error) {
    console.error("News deletion error:", error);
    return NextResponse.json({ error: "Failed to delete news" }, { status: 500 });
  }
}