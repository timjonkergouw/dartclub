import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const AVATAR_DIR = path.join(process.cwd(), "public", "avatars");

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
    }

    const name = file instanceof File ? file.name : "avatar.jpg";
    const ext = name.split(".").pop()?.toLowerCase() || "jpg";
    if (!["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      return NextResponse.json(
        { error: "Alleen afbeeldingen zijn toegestaan" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Afbeelding mag maximaal 5MB zijn" },
        { status: 400 }
      );
    }

    await fs.mkdir(AVATAR_DIR, { recursive: true });
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(AVATAR_DIR, filename), buffer);

    return NextResponse.json({ url: `/avatars/${filename}` });
  } catch (error) {
    console.error("POST /api/avatars:", error);
    return NextResponse.json(
      { error: "Upload mislukt" },
      { status: 500 }
    );
  }
}
