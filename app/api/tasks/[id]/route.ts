import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const taskId = parseInt(params.id);
  
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { 
      lessons: {
        include: { questions: true } // Подгружаем вопросы к урокам
      } 
    }
  });

  return NextResponse.json(task);
}