import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  // Prevent directory traversal
  if (file.includes("..") || file.includes("/")) {
    return NextResponse.json({ error: "Arquivo invalido" }, { status: 400 });
  }

  const filepath = path.join(UPLOAD_DIR, file);

  try {
    const buffer = await readFile(filepath);
    const ext = file.split(".").pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };

    const contentType = mimeTypes[ext || ""] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo nao encontrado" }, { status: 404 });
  }
}
