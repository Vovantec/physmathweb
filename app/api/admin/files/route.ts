import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const targetPath = searchParams.get('path') || '';

    let baseDir = '';

    if (fs.existsSync('/container')) {
        baseDir = '/container';
    } 
    else if (process.env.LOCAL_IMAGES_PATH) {
        baseDir = path.resolve(process.env.LOCAL_IMAGES_PATH, '..');
    } 
    else {
        baseDir = path.join(process.cwd(), 'public');
    }

    const cleanPath = targetPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const normalizedPath = path.normalize(cleanPath).replace(/^(\.\.(\/|\\|$))+/, '');
    
    const fullPath = normalizedPath ? path.resolve(baseDir, normalizedPath) : path.resolve(baseDir);

    if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ 
            error: `Папка не найдена`, 
            debugPath: fullPath,
            usedBaseDir: baseDir
        }, { status: 404 });
    }

    const entries = fs.readdirSync(fullPath, { withFileTypes: true });

    const files = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: normalizedPath ? `${normalizedPath}/${entry.name}` : entry.name
    }));

    files.sort((a, b) => {
      if (a.isDirectory() === b.isDirectory()) return a.name.localeCompare(b.name);
      return a.isDirectory() ? -1 : 1;
    });

    return NextResponse.json({ files, currentPath: normalizedPath, debugPath: fullPath });
  } catch (error: any) {
    console.error('[FileManager Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}