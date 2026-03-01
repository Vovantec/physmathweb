import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

const MIMES: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ path: string[] }> }
) {
    const params = await props.params;
    const urlPath = params.path;

    try {
        let baseDir = '';
        if (fs.existsSync('/container/courses')) {
            baseDir = '/container/courses';
        } else if (process.env.LOCAL_COURSES_PATH) {
            baseDir = process.env.LOCAL_COURSES_PATH;
        } else if (process.env.LOCAL_IMAGES_PATH) {
            baseDir = path.join(path.resolve(process.env.LOCAL_IMAGES_PATH, '..'), 'courses');
        } else {
            baseDir = path.join(process.cwd(), 'container', 'courses');
        }

        const filePath = path.resolve(baseDir, ...urlPath);

        if (!filePath.startsWith(path.resolve(baseDir))) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (!fs.existsSync(filePath)) {
            return new NextResponse('File not found', { status: 404 });
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIMES[ext] || 'application/octet-stream';
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;

        const range = request.headers.get('range');

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            
            // === ОПТИМИЗАЦИЯ ПАМЯТИ #1: ЖЕСТКОЕ ОГРАНИЧЕНИЕ ЧАНКА ===
            // Отдаем не более 5 МБ за один запрос.
            const CHUNK_SIZE = 5 * 1024 * 1024; 
            const requestedEnd = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            // Конец - это минимум из запрошенного, лимита в 5 МБ и конца файла
            const end = Math.min(requestedEnd, start + CHUNK_SIZE - 1, fileSize - 1);
            
            const chunksize = (end - start) + 1;

            // === ОПТИМИЗАЦИЯ ПАМЯТИ #2: АВТОМАТИЧЕСКАЯ ПАУЗА ПОТОКА ===
            const nodeStream = fs.createReadStream(filePath, { start, end });
            const webStream = Readable.toWeb(nodeStream) as ReadableStream;

            return new NextResponse(webStream, {
                status: 206,
                headers: {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize.toString(),
                    'Content-Type': contentType,
                },
            });
        } else {
            const nodeStream = fs.createReadStream(filePath);
            const webStream = Readable.toWeb(nodeStream) as ReadableStream;

            return new NextResponse(webStream, {
                status: 200,
                headers: {
                    'Content-Length': fileSize.toString(),
                    'Content-Type': contentType,
                    'Accept-Ranges': 'bytes',
                    'Cache-Control': 'public, max-age=3600',
                },
            });
        }

    } catch (e) {
        console.error("[Course Media Error]:", e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}