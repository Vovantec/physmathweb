import { NextResponse } from 'next/server';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export function checkInternalAuth(request: Request) {
  const authHeader = request.headers.get('x-api-secret');
  
  if (!INTERNAL_API_KEY || authHeader !== INTERNAL_API_KEY) {
    return false;
  }
  return true;
}

// Хелпер для обработки BigInt при отправке JSON (Prisma возвращает BigInt, который JSON не любит)
export function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Расширение JSON.stringify для BigInt
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};