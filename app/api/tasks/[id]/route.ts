import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const taskId = parseInt(id);
  
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { 
      lessons: {
        include: { questions: true } 
      } 
    }
  });

  return NextResponse.json(task);
}