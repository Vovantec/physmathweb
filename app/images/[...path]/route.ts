import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { type NextRequest } from 'next/server';

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
    props: { params: Promise<{ path: string[] }> }
) {
    const params = await props.params;
    const urlPath = params.path;

    // === 1. Проксирование (для локальной разработки) ===
    const remoteBase = process.env.REMOTE_IMAGES_URL; 
    if (remoteBase) {
        try {
            const remoteUrl = `${remoteBase}/images/${urlPath.join('/')}`;
            // Увеличим таймаут до 5 секунд
            const response = await fetch(remoteUrl, { signal: AbortSignal.timeout(5000) });
            if (response.ok) {
                return new NextResponse(response.body, {
                    headers: {
                        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
                        'Cache-Control': 'public, max-age=3600',
                    },
                });
            } else {
                // Логируем, если сервер ответил ошибкой (например, 404 или 500)
                console.warn(`[Proxy Image] Remote replied ${response.status} for ${remoteUrl}`);
            }
        } catch (error) {
            // !!! ВАЖНО: Логируем ошибку, чтобы увидеть её в `docker logs`
            console.error(`[Proxy Image Error] Failed to fetch ${remoteBase}:`, error);
        }
    }

    // === 2. Локальные файлы (Исправлено для Windows/Docker) ===
    try {
        // process.cwd() - это папка проекта. Next.js держит статику в ./public
        const filePath = path.join(process.cwd(), 'public', 'images', ...urlPath);

        if (!fs.existsSync(filePath)) {
            return new NextResponse('File not found', { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIMES[ext] || 'application/octet-stream';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });

    } catch (e) {
        console.error("Local Image error:", e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}