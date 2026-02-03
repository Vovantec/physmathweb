import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const SECRET = process.env.BOT_TOKEN || 'secret';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, username } = body;

    if (!userId) return NextResponse.json({ error: 'No userId' }, { status: 400 });

    // Создаем токен, который будет жить 1 час
    const token = jwt.sign({ userId, username }, SECRET, { expiresIn: '1h' });

    return NextResponse.json({ token });
  } catch (e) {
    return NextResponse.json({ error: 'Error generating token' }, { status: 500 });
  }
}