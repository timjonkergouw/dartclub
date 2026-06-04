import { NextRequest, NextResponse } from "next/server";
import {
  createDartStat,
  dartStatExists,
  getDartStatsByPlayer,
} from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    if (params.get("check") === "1") {
      const game_id = params.get("game_id");
      const player_id = Number(params.get("player_id"));
      if (!game_id || Number.isNaN(player_id)) {
        return NextResponse.json({ exists: false });
      }
      const exists = await dartStatExists(game_id, player_id);
      return NextResponse.json({ exists });
    }

    const player_id = Number(params.get("player_id"));
    if (Number.isNaN(player_id)) {
      return NextResponse.json({ stats: [] });
    }

    const stats = await getDartStatsByPlayer(player_id);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("GET /api/dart-stats:", error);
    return NextResponse.json(
      { error: "Kon statistieken niet ophalen" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const game_id = body.game_id as string;
    const player_id = Number(body.player_id);

    if (!game_id || Number.isNaN(player_id)) {
      return NextResponse.json({ error: "Ongeldige data" }, { status: 400 });
    }

    if (await dartStatExists(game_id, player_id)) {
      return NextResponse.json({ success: true, skipped: true });
    }

    await createDartStat(body);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/dart-stats:", error);
    return NextResponse.json(
      { error: "Kon statistieken niet opslaan" },
      { status: 500 }
    );
  }
}
