import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// Если у вас есть функция проверки на админа (например, checkAdmin), импортируйте её здесь.

export async function POST(req: Request) {
  try {
    // В идеале здесь должна быть проверка авторизации администратора
    
    const body = await req.json();
    const { title, content, tags } = body;

    // tags приходят как массив строк (например: ["физика", "анонс"])
    // В базе мы храним их как JSON-строку
    const tagsString = JSON.stringify(tags || []);

    const newPost = await prisma.newsPost.create({
      data: {
        title,
        content,
        tags: tagsString,
        // authorId: Вставьте сюда BigInt ID админа, если нужно отслеживать авторство
      },
    });

    return NextResponse.json({ success: true, post: newPost });
  } catch (error) {
    console.error("Error creating news post:", error);
    return NextResponse.json({ error: "Ошибка при создании новости" }, { status: 500 });
  }
}