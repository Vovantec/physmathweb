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

    const remoteBase = process.env.API_URL; 
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