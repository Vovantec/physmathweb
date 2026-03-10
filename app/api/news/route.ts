import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");

    const news = await prisma.newsPost.findMany({
      where: tag ? {
        tags: {
          contains: tag // Простой поиск по строке тегов
        }
      } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { firstName: true, username: true, photoUrl: true }
        },
        _count: {
          select: { comments: true, likes: true }
        }
      }
    });

    // Из-за BigInt преобразуем результат перед отправкой
    const serializedNews = news.map(post => ({
      ...post,
      authorId: post.authorId?.toString(),
    }));

    return NextResponse.json(serializedNews);
  } catch (error) {
    console.error("News fetch error:", error);
    return NextResponse.json({ error: "Failed to load news" }, { status: 500 });
  }
}