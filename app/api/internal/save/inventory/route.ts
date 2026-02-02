import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-secret');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { userId, inventory } = await request.json();

    // Приводим инвентарь к строке
    const inventoryStr = typeof inventory === 'string' ? inventory : JSON.stringify(inventory);

    await prisma.character.updateMany({
      where: { 
        userId: BigInt(userId), 
        active: true 
      },
      data: {
        inventory: inventoryStr
      }
    });

    return NextResponse.json({ success: true });

  } catch (e) {
    console.error("Save Inventory Error:", e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}