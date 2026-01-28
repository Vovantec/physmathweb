// migrate.js
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Загружаем ваш JSON
const rawData = fs.readFileSync('database.json', 'utf-8');
const dbData = JSON.parse(rawData);

async function main() {
  console.log('Начинаем миграцию данных...');

  // 1. Перенос КУРСОВ, ЗАДАЧ и УРОКОВ
  const courses = dbData.courses || {};
  
  for (const [courseKey, courseData] of Object.entries(courses)) {
    console.log(`Создаем курс: ${courseData.name}`);
    
    // Создаем курс
    const createdCourse = await prisma.course.create({
      data: {
        title: courseData.name,
        description: courseData.description || '',
      },
    });

    // Перебираем задачи внутри курса
    const tasks = courseData.tasks || {};
    for (const [taskKey, taskData] of Object.entries(tasks)) {
      console.log(`  -> Задача: ${taskData.title}`);

      const createdTask = await prisma.task.create({
        data: {
          title: taskData.title,
          courseId: createdCourse.id,
        },
      });

      // Перебираем уроки внутри задачи
      const lessons = taskData.lessons || {};
      for (const [lessonKey, lessonData] of Object.entries(lessons)) {
        console.log(`    -> Урок: ${lessonData.title}`);

        // Подготовка вопросов из домашки
        const homework = lessonData.homework || {};
        const questionsData = homework.questions || [];
        
        // Формируем массив вопросов для создания через Prisma (nested writes)
        const questionsToCreate = questionsData.map(q => ({
          type: q.type,
          answer: q.answer,
          content: "Вопрос из бота" // В JSON нет текста вопроса, ставим заглушку
        }));

        await prisma.lesson.create({
          data: {
            title: lessonData.title,
            videoUrl: lessonData.video_url,
            pdfId: homework.pdf_id, // Сохраняем ID PDF
            taskId: createdTask.id,
            questions: {
              create: questionsToCreate // Сразу создаем вопросы
            }
          },
        });
      }
    }
  }

  // 2. Перенос ПОЛЬЗОВАТЕЛЕЙ
  const users = dbData.users || {};
  for (const [userId, userData] of Object.entries(users)) {
    console.log(`Перенос пользователя: ${userId} (${userData.points} баллов)`);
    
    // Используем BigInt для ID из телеграма, так как они большие
    await prisma.user.create({
      data: {
        telegramId: BigInt(userData.id),
        username: userData.username,
        points: userData.points,
        isAdmin: false // По умолчанию не админ
      }
    });
  }

  console.log('✅ Миграция успешно завершена!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });