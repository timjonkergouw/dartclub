import { NextRequest, NextResponse } from "next/server";
import {
  deleteProfile,
  getProfileByUsername,
  updateProfile,
} from "@/lib/database";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: idParam } = await context.params;
    const id = Number(idParam);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Ongeldig id" }, { status: 400 });
    }

    const body = await request.json();
    if (body.username) {
      const existing = await getProfileByUsername(body.username, id);
      if (existing) {
        return NextResponse.json(
          { error: "Deze gebruikersnaam bestaat al. Kies een andere naam." },
          { status: 409 }
        );
      }
    }

    const profile = await updateProfile(id, {
      username: body.username,
      avatar_url: body.avatar_url,
    });
    if (!profile) {
      return NextResponse.json({ error: "Profiel niet gevonden" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("PATCH /api/profiles/[id]:", error);
    return NextResponse.json(
      { error: "Kon profiel niet bijwerken" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id: idParam } = await context.params;
    const id = Number(idParam);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Ongeldig id" }, { status: 400 });
    }

    const ok = await deleteProfile(id);
    if (!ok) {
      return NextResponse.json({ error: "Profiel niet gevonden" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/profiles/[id]:", error);
    return NextResponse.json(
      { error: "Kon profiel niet verwijderen" },
      { status: 500 }
    );
  }
}
