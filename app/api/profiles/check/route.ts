import { NextRequest, NextResponse } from "next/server";
import { getProfileByUsername } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get("username")?.trim();
    const excludeId = request.nextUrl.searchParams.get("excludeId");
    if (!username) {
      return NextResponse.json({ exists: false });
    }
    const existing = await getProfileByUsername(
      username,
      excludeId ? Number(excludeId) : undefined
    );
    return NextResponse.json({ exists: !!existing });
  } catch (error) {
    console.error("GET /api/profiles/check:", error);
    return NextResponse.json({ error: "Check mislukt" }, { status: 500 });
  }
}
