import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Сериализация BigInt для логов
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, answers } = body;

    if (!userId) return NextResponse.json({ error: 'Вы не авторизованы' }, { status: 401 });

    const lessonIdInt = parseInt(id);
    
    let tgIdBigInt: bigint;
    try {
        tgIdBigInt = BigInt(userId);
    } catch (e) {
        return NextResponse.json({ error: 'Неверный формат ID пользователя' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { telegramId: tgIdBigInt }
    });

    if (!user) {
        return NextResponse.json({ error: 'Пользователь не найден. Попробуйте перезайти.' }, { status: 404 });
    }

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonIdInt },
        include: { 
            questions: true,
            attempts: { 
                where: { userId: tgIdBigInt }
            } 
        }
    });

    if (!lesson) {
        return NextResponse.json({ error: 'Урок не найден' }, { status: 404 });
    }

    // Проверяем лимит попыток
    if (lesson.attempts.length >= 2) {
        return NextResponse.json({ error: 'Попытки исчерпаны' }, { status: 403 });
    }

    // Проверяем ответы
    let correctCount = 0;
    const totalCount = lesson.questions.length;

    lesson.questions.forEach(q => {
        const userAns = (answers[q.id] || "").toString().trim().toLowerCase();
        const correctAns = q.answer.trim().toLowerCase();
        if (userAns === correctAns) correctCount++;
    });

    const percent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    // Начисление баллов
    const isFirstAttempt = lesson.attempts.length === 0;
    const previousMax = lesson.attempts.length > 0 
        ? Math.max(...lesson.attempts.map(a => a.correct)) 
        : 0;
    
    let pointsGained = 0;
    let bonusGained = false;
    const perfectBonus = 5;

    if (correctCount > previousMax) {
        pointsGained += (correctCount - previousMax) * 2;
    }

    if (correctCount === totalCount && isFirstAttempt) {
        pointsGained += perfectBonus;
        bonusGained = true;
    }

    // Сохраняем результат
    await prisma.$transaction([
        prisma.homeworkAttempt.create({
            data: {
                userId: tgIdBigInt,
                lessonId: lessonIdInt,
                correct: correctCount,
                total: totalCount,
                percent: percent,
                answers: JSON.stringify(answers),
            }
        }),
        prisma.user.update({
            where: { telegramId: tgIdBigInt },
            data: {
                points: { increment: pointsGained }
            }
        })
    ]);

    return NextResponse.json({
        success: true,
        results: {
            correct: correctCount,
            total: totalCount,
            percent: percent,
            pointsGained,
            bonusGained,
            attemptsLeft: 2 - (lesson.attempts.length + 1)
        }
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}