import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { type NextRequest } from 'next/server';

// Простая карта MIME-типов, чтобы не устанавливать лишние библиотеки
const MIMES: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        // 1. Получаем путь из URL (например, ['tileset.png'] или ['npcs', 'elf.png'])
        const { path: urlPath } = await params;
        
        // 2. Собираем реальный путь к файлу в папке /container
        // Если запрос был /images/tileset.png, то ищем в /container/tileset.png
        // Если у вас в /container есть подпапка images, добавьте её в join
        const filePath = path.join('/container/images', ...urlPath);

        // 3. Проверяем, существует ли файл
        if (!fs.existsSync(filePath)) {
            return new NextResponse('File not found', { status: 404 });
        }

        // 4. Читаем файл
        const fileBuffer = fs.readFileSync(filePath);

        // 5. Определяем тип контента
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIMES[ext] || 'application/octet-stream';

        // 6. Отдаем файл браузеру
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable', // Кэширование
            },
        });

    } catch (e) {
        console.error("Image loading error:", e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}