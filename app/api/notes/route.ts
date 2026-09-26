import { NextResponse } from "next/server";

// Receives field notes flushed from IndexedDB (lib/db.ts flushFieldNotes)
// once the device regains connectivity. Wire to your database of choice.
export async function POST(req: Request) {
  const note = await req.json();
  // TODO: persist `note` (parcel_id, lat, lng, note, created_at).
  return NextResponse.json({ ok: true, id: note.id ?? null });
}
