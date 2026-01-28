import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Сериализация BigInt для логов
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, answers } = body;

    console.log(`--- ЗАПРОС ОТПРАВКИ РЕШЕНИЯ ---`);
    console.log(`Lesson ID: ${id}`);
    console.log(`User ID (из браузера): ${userId}`);

    if (!userId) return NextResponse.json({ error: 'Вы не авторизованы' }, { status: 401 });

    const lessonIdInt = parseInt(id);
    const internalUserId = parseInt(userId); // Это ID строки в таблице User (например, 1)

    // 1. Ищем пользователя по ВНУТРЕННЕМУ ID (id), а не по telegramId
    const user = await prisma.user.findUnique({
        where: { id: internalUserId }
    });

    if (!user) {
        console.error(`❌ Пользователь с internalId=${internalUserId} не найден.`);
        return NextResponse.json({ error: 'Пользователь не найден. Попробуйте перезайти.' }, { status: 404 });
    }
    
    // Получаем настоящий Telegram ID из найденного пользователя
    const tgIdBigInt = user.telegramId;
    console.log(`✅ Пользователь найден. Его Telegram ID: ${tgIdBigInt}`);

    // 2. Ищем урок и загружаем попытки для ЭТОГО Telegram ID
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonIdInt },
        include: { 
            questions: true,
            attempts: { 
                where: { userId: tgIdBigInt } // Тут используем BigInt
            } 
        }
    });

    if (!lesson) {
        return NextResponse.json({ error: 'Урок не найден' }, { status: 404 });
    }

    // 3. Проверяем лимит попыток
    if (lesson.attempts.length >= 2) {
        return NextResponse.json({ error: 'Попытки исчерпаны' }, { status: 403 });
    }

    // 4. Проверяем ответы
    let correctCount = 0;
    const totalCount = lesson.questions.length;

    lesson.questions.forEach(q => {
        const userAns = (answers[q.id] || "").toString().trim().toLowerCase();
        const correctAns = q.answer.trim().toLowerCase();
        if (userAns === correctAns) correctCount++;
    });

    const percent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    // 5. Начисление баллов
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

    // 6. Сохраняем результат
    // Используем tgIdBigInt для связи с таблицей HomeworkAttempt (так как там foreign key на telegramId)
    await prisma.$transaction([
        prisma.homeworkAttempt.create({
            data: {
                userId: tgIdBigInt, 
                lessonId: lessonIdInt,
                correct: correctCount,
                total: totalCount,
                percent: percent
            }
        }),
        prisma.user.update({
            where: { telegramId: tgIdBigInt }, // Обновляем баллы по Telegram ID
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