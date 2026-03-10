import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");

    const news = await prisma.newsPost.findMany({
      where: tag ? { tags: { contains: tag } } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { firstName: true, username: true, photoUrl: true }
        },
        likes: {
          select: { userId: true }
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { firstName: true, photoUrl: true } }
          }
        },
        _count: {
          select: { comments: true, likes: true }
        }
      }
    });

    // Сериализация BigInt в String
    const serializedNews = news.map(post => ({
      ...post,
      authorId: post.authorId?.toString(),
      likes: post.likes.map(l => ({ userId: l.userId.toString() })),
      comments: post.comments.map(c => ({
        ...c,
        authorId: c.authorId.toString()
      }))
    }));

    return NextResponse.json(serializedNews);
  } catch (error) {
    console.error("News fetch error:", error);
    return NextResponse.json({ error: "Failed to load news" }, { status: 500 });
  }
}