import { NextResponse } from "next/server";

// Simulasi pergerakan titik GPS untuk testing
export async function POST() {
  const globalGps = global as unknown as {
    gpsData?: {
      current: {
        lat: number;
        lng: number;
        speed: number;
        altitude: number;
        satellites: number;
        timestamp: string;
      };
      history: any[];
      lastUpdate: number;
      deviceId: string;
    };
  };

  if (!globalGps.gpsData) {
    return NextResponse.json({ error: "Store not initialized" }, { status: 500 });
  }

  const store = globalGps.gpsData;
  // Geser koordinat sedikit (0.0002 derajat ~ 20 meter)
  const angle = Math.random() * 2 * Math.PI;
  const deltaLat = Math.sin(angle) * 0.00035;
  const deltaLng = Math.cos(angle) * 0.00035;

  const newLat = store.current.lat + deltaLat;
  const newLng = store.current.lng + deltaLng;
  const newSpeed = Math.floor(15 + Math.random() * 30);
  const newSats = Math.floor(7 + Math.random() * 4);

  const point = {
    lat: parseFloat(newLat.toFixed(6)),
    lng: parseFloat(newLng.toFixed(6)),
    speed: newSpeed,
    altitude: parseFloat((140 + Math.random() * 10).toFixed(1)),
    satellites: newSats,
    timestamp: new Date().toISOString(),
  };

  store.current = point;
  store.lastUpdate = Date.now();
  store.history.push(point);
  if (store.history.length > 150) {
    store.history.shift();
  }

  return NextResponse.json({ success: true, point });
}
