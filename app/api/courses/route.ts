import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      include: { tasks: true }
    });
    return NextResponse.json(courses);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const course = await prisma.course.create({
      data: {
        title: body.title,
        description: body.description
      }
    });
    return NextResponse.json(course);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка создания' }, { status: 500 });
  }
}