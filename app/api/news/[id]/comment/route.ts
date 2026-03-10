import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, content } = await req.json();
    const postId = parseInt(params.id);

    if (!content.trim()) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        authorId: BigInt(userId)
      },
      include: {
        author: { select: { firstName: true, photoUrl: true } }
      }
    });

    return NextResponse.json({
      ...comment,
      authorId: comment.authorId.toString()
    });
  } catch (error) {
    console.error("Comment error:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}