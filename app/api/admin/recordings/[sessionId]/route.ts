import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const RECORD_DIR = path.join(process.cwd(), 'recordings');

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;

    // Construct the file path for the desktop recording
    const filePath = path.join(RECORD_DIR, `${sessionId}-desktop.webm`);

    try {
        if (!fs.existsSync(filePath)) {
            return new NextResponse('Recording not found', { status: 404 });
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;

        // Handle range requests for video streaming
        const range = req.headers.get('range');

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });

            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/webm',
            };

            return new NextResponse(file as any, {
                status: 206,
                headers: head as any
            });
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/webm',
            };
            const file = fs.createReadStream(filePath);

            return new NextResponse(file as any, {
                status: 200,
                headers: head as any
            });
        }
    } catch (error) {
        console.error('Error serving recording:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
