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

    // === 1. Попытка проксирования ===
    const remoteBase = process.env.API_URL; 
    
    // БЛОКИРУЕМ БЕСКОНЕЧНЫЙ ЦИКЛ: Игнорируем сам сайт и локалхост
    const isLocalhost = remoteBase?.includes('localhost') || remoteBase?.includes('127.0.0.1');
    const isMainSite = remoteBase?.includes('physmathlab.ru');
    
    if (remoteBase && !isLocalhost && !isMainSite) {
        try {
            const remoteUrl = `${remoteBase}/images/${urlPath.join('/')}`;
            const response = await fetch(remoteUrl, { signal: AbortSignal.timeout(5000) });
            
            if (response.ok) {
                return new NextResponse(response.body, {
                    headers: {
                        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
                        'Cache-Control': 'public, max-age=3600',
                    },
                });
            } else {
                console.warn(`[Proxy Image] Remote replied ${response.status} for ${remoteUrl}`);
            }
        } catch (error) {
            console.error(`[Proxy Image Error] Failed to fetch ${remoteBase}:`, error);
        }
    }

    // === 2. Чтение файлов с локального / сетевого диска ===
    try {
        // Укажите LOCAL_IMAGES_PATH в .env, иначе берет папку public/images
        const baseDir = process.env.LOCAL_IMAGES_PATH || path.join(process.cwd(), 'public', 'images');
        const filePath = path.resolve(baseDir, ...urlPath);

        // Защита от Directory Traversal
        if (!filePath.startsWith(path.resolve(baseDir))) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (!fs.existsSync(filePath)) {
            return new NextResponse('Image not found', { status: 404 });
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