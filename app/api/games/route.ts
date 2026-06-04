import { NextRequest, NextResponse } from "next/server";
import { createGame } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile_id = Number(body.profile_id);
    if (Number.isNaN(profile_id)) {
      return NextResponse.json({ error: "Ongeldig profile_id" }, { status: 400 });
    }

    const game = await createGame(
      profile_id,
      body.ended_at || new Date().toISOString()
    );
    return NextResponse.json({ id: game.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/games:", error);
    return NextResponse.json(
      { error: "Kon game niet opslaan" },
      { status: 500 }
    );
  }
}
