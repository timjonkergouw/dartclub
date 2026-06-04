import { NextRequest, NextResponse } from "next/server";
import { uploadAvatar } from "@/lib/database";

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

    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const url = await uploadAvatar(file, filename);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("POST /api/avatars:", error);
    const message = error instanceof Error ? error.message : "Upload mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
