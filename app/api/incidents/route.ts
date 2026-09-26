import { NextResponse } from "next/server";

// GET /api/incidents — placeholder for active-incident feed (CAD/NIFC/local
// dispatch). Wire this to your CAD export or a NIFC/InciWeb feed; the map
// polls it with NetworkFirst caching (3s timeout) so it degrades gracefully
// to the last-known incident set when signal drops.
export async function GET() {
  return NextResponse.json({
    type: "FeatureCollection",
    features: [],
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  // TODO: persist to your incident store (Postgres/Supabase).
  return NextResponse.json({ ok: true, received: body });
}
