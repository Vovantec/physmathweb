import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params; // file_id из Telegram

  if (!id) {
    return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
  }

  const token = process.env.BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    // 1. Спрашиваем у Telegram путь к файлу (getFile)
    const fileInfoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${id}`);
    const fileInfo = await fileInfoRes.json();

    if (!fileInfo.ok || !fileInfo.result.file_path) {
      return NextResponse.json({ error: 'File not found in Telegram' }, { status: 404 });
    }

    const filePath = fileInfo.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    // 2. Скачиваем сам файл
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) throw new Error('Failed to fetch file content');

    // 3. Отдаем файл пользователю
    // Определяем имя файла (можно улучшить, если хранить имя в БД, но пока берем из пути)
    const fileName = filePath.split('/').pop() || 'document.pdf';
    
    // Превращаем blob в поток для ответа
    const blob = await fileRes.blob();
    const headers = new Headers();
    headers.set("Content-Type", fileRes.headers.get("Content-Type") || "application/pdf");
    headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
    headers.set("Content-Length", blob.size.toString());

    return new NextResponse(blob, { status: 200, headers });

  } catch (error) {
    console.error('File proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}