import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
  }

  const token = process.env.BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    const fileInfoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${id}`);
    const fileInfo = await fileInfoRes.json();

    if (!fileInfo.ok || !fileInfo.result.file_path) {
      return NextResponse.json({ error: 'File not found in Telegram' }, { status: 404 });
    }

    const filePath = fileInfo.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) throw new Error('Failed to fetch file content');

    const fileName = filePath.split('/').pop() || 'document.pdf';
    
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