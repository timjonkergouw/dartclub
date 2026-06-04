import { NextRequest, NextResponse } from "next/server";
import {
  createProfile,
  getProfileByUsername,
  getProfiles,
} from "@/lib/database";

export async function GET() {
  try {
    const profiles = await getProfiles();
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("GET /api/profiles:", error);
    return NextResponse.json(
      { error: "Kon profielen niet ophalen" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = body.username?.trim();
    if (!username) {
      return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
    }

    const existing = await getProfileByUsername(username);
    if (existing) {
      return NextResponse.json(
        { error: "Deze gebruikersnaam bestaat al. Kies een andere naam." },
        { status: 409 }
      );
    }

    const profile = await createProfile(username, body.avatar_url ?? null);
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error("POST /api/profiles:", error);
    return NextResponse.json(
      { error: "Kon profiel niet aanmaken" },
      { status: 500 }
    );
  }
}
