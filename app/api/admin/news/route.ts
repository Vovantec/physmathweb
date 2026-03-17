// app/api/admin/news/route.ts
// Путь: app/api/admin/news/route.ts
// Изменение: после создания новости вызываем /api/internal/notify

import { NextResponse } from 'next/server'
import { prisma }       from '@/lib/prisma'

export async function GET() {
  try {
    const news = await prisma.newsPost.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(news.map(post => ({
      ...post,
      authorId: post.authorId?.toString(),
    })))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { title, content, tags, authorId, imageUrl } = await req.json()
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    let parsedAuthorId = null
    if (authorId && authorId !== 'null' && authorId !== 'undefined') {
      try {
        const tempId = BigInt(authorId)
        const userExists = await prisma.user.findUnique({ where: { telegramId: tempId } })
        if (userExists) parsedAuthorId = tempId
      } catch {}
    }

    const newPost = await prisma.newsPost.create({
      data: {
        title,
        content,
        imageUrl:  imageUrl || null,
        tags:      tags || '[]',
        authorId:  parsedAuthorId,
      },
    })

    // ── Trigger Telegram notifications ────────────────────
    // Fire-and-forget — don't block the response
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://physmathlab.ru'
    fetch(`${baseUrl}/api/internal/notify`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'x-api-secret':  process.env.INTERNAL_API_KEY ?? '',
      },
      body: JSON.stringify({
        type:    'newNews',
        refId:   String(newPost.id),
        payload: { newsId: newPost.id, newsTitle: title },
      }),
    }).catch(e => console.error('[notify news]', e))

    return NextResponse.json({ ...newPost, authorId: newPost.authorId?.toString() })
  } catch (error: any) {
    console.error('News creation error:', error)
    return NextResponse.json({ error: 'Failed to create news', details: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'News ID is required' }, { status: 400 })
    await prisma.newsPost.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete news' }, { status: 500 })
  }
}