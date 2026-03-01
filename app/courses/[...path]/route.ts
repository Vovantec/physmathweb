import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MIMES: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

function streamFile(filePath: string, options?: { start: number; end: number }): ReadableStream {
    const stream = fs.createReadStream(filePath, options);
    return new ReadableStream({
        start(controller) {
            stream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
            stream.on("end", () => controller.close());
            stream.on("error", (error: any) => controller.error(error));
        },
        cancel() {
            stream.destroy();
        },
    });
}

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

        // === ОБРАБОТКА ПОТОКОВОГО ВИДЕО (Range Requests) ===
        const range = request.headers.get('range');

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            const stream = streamFile(filePath, { start, end });

            return new NextResponse(stream, {
                status: 206,
                headers: {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize.toString(),
                    'Content-Type': contentType,
                },
            });
        } else {
            const stream = streamFile(filePath);

            return new NextResponse(stream, {
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