import { checkInternalAuth, jsonResponse } from '@/lib/internal-api';
import jwt from 'jsonwebtoken';

const SECRET = process.env.BOT_TOKEN || 'secret';

export async function POST(request: Request) {
  if (!checkInternalAuth(request)) return jsonResponse({ error: 'Unauthorized' }, 401);

  try {
    const { token } = await request.json();
    
    // Проверяем подпись JWT
    const decoded = jwt.verify(token, SECRET) as any;
    
    // Возвращаем ID пользователя игровому серверу
    return jsonResponse({ 
      valid: true, 
      userId: decoded.userId,
      username: decoded.username 
    });

  } catch (e) {
    return jsonResponse({ valid: false, error: 'Invalid token' }, 200);
  }
}