// lib/db.ts
// Offline-first data layer. Everything a crew needs in the field — parcel
// vulnerability scores, hydrants, egress/dead-end flags, station locations,
// and any notes logged in the field — lives in IndexedDB so the app is fully
// usable with zero signal on a ridge, then reconciles with the server the
// next time the truck (or the firehouse wifi) has connectivity.

import Dexie, { type Table } from "dexie";

export interface ParcelFeature {
  parcel_id: string;
  geojson: GeoJSON.Feature; // full feature incl. geometry + properties
  vuln_score: number;
  vuln_class: "Low" | "Moderate" | "High" | "Extreme";
  egress_score: number;
  water_score: number;
  veg_fuel_score: number;
  dist_hydrant_m: number;
  dead_end: boolean;
  updated_at: string;
}

export interface Hydrant {
  id: string;
  lat: number;
  lng: number;
  status: "active" | "out_of_service" | "unknown";
  flow_gpm?: number;
  last_checked?: string;
}

export interface FieldNote {
  id?: number;
  parcel_id?: string;
  lat: number;
  lng: number;
  note: string;
  photo_blob?: Blob;
  created_at: string;
  synced: boolean;
}

export interface CachedLayer {
  key: string; // e.g. "parcels", "hydrants", "roads"
  region: string; // jurisdiction/county key
  fetched_at: string;
}

class FirehouseDB extends Dexie {
  parcels!: Table<ParcelFeature, string>;
  hydrants!: Table<Hydrant, string>;
  notes!: Table<FieldNote, number>;
  layers!: Table<CachedLayer, string>;

  constructor() {
    super("firehouse-gis");
    this.version(1).stores({
      parcels: "parcel_id, vuln_class, dead_end",
      hydrants: "id, status",
      notes: "++id, parcel_id, synced",
      layers: "key",
    });
  }
}

export const db = new FirehouseDB();

/** Pull the latest vulnerability + hydrant layers and cache them locally. */
export async function syncLayers(region = "default") {
  const res = await fetch(`/api/vulnerability?region=${region}`);
  if (!res.ok) throw new Error("Sync failed — offline, using cached layer");
  const fc: GeoJSON.FeatureCollection = await res.json();

  await db.transaction("rw", db.parcels, db.layers, async () => {
    for (const f of fc.features) {
      const p = f.properties as any;
      await db.parcels.put({
        parcel_id: p.parcel_id,
        geojson: f,
        vuln_score: p.vuln_score,
        vuln_class: p.vuln_class,
        egress_score: p.egress_score,
        water_score: p.water_score,
        veg_fuel_score: p.veg_fuel_score,
        dist_hydrant_m: p.dist_hydrant_m,
        dead_end: p.dead_end_score >= 0.5,
        updated_at: new Date().toISOString(),
      });
    }
    await db.layers.put({ key: "parcels", region, fetched_at: new Date().toISOString() });
  });

  return fc.features.length;
}

/** Queue a field note offline; flushed to the server once back online. */
export async function addFieldNote(note: Omit<FieldNote, "id" | "synced">) {
  return db.notes.add({ ...note, synced: false });
}

export async function flushFieldNotes() {
  const unsynced = await db.notes.where("synced").equals(0 as any).toArray();
  for (const n of unsynced) {
    try {
      await fetch("/api/notes", { method: "POST", body: JSON.stringify(n) });
      if (n.id) await db.notes.update(n.id, { synced: true });
    } catch {
      // still offline — leave queued
    }
  }
}
