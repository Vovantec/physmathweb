import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const SECRET = process.env.BOT_TOKEN || 'secret';

export async function checkAdminAuth(): Promise<boolean> {
  try {
    // 1. Получаем список админов из .env
    const adminsEnv = process.env.ADMINS || '';
    // Превращаем строку "123,456" в массив строк ['123', '456']
    const adminIds = adminsEnv.split(',').map(id => id.trim());

    if (adminIds.length === 0) return false;

    // 2. Достаем токен сессии из кук
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) return false;

    // 3. Расшифровываем токен
    const decoded = jwt.verify(token, SECRET) as { userId: string | number };
    const userId = String(decoded.userId);

    // 4. Проверяем, есть ли ID в списке админов
    return adminIds.includes(userId);

  } catch (error) {
    return false; // Любая ошибка (токен протух, неверная подпись) = отказ
  }
}