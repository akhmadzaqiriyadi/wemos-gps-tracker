import { NextResponse } from "next/server";

export interface GPSPoint {
  lat: number;
  lng: number;
  speed: number;
  altitude: number;
  satellites: number;
  timestamp: string;
}

// Global in-memory storage for development/runtime persistence
const globalGps = global as unknown as {
  gpsData?: {
    current: GPSPoint;
    history: GPSPoint[];
    lastUpdate: number;
    deviceId: string;
  };
};

if (!globalGps.gpsData) {
  globalGps.gpsData = {
    // Default location: Yogyakarta (Sekitar Kampus UTY)
    current: {
      lat: -7.747035,
      lng: 110.355398,
      speed: 0,
      altitude: 145.2,
      satellites: 0,
      timestamp: new Date().toISOString(),
    },
    history: [
      {
        lat: -7.747035,
        lng: 110.355398,
        speed: 0,
        altitude: 145.2,
        satellites: 0,
        timestamp: new Date().toISOString(),
      },
    ],
    lastUpdate: 0,
    deviceId: "WEMOS-D1-MINI-PRO-01",
  };
}

export async function GET() {
  const store = globalGps.gpsData!;
  const now = Date.now();
  // Online jika menerima update dalam 20 detik terakhir
  const isOnline = store.lastUpdate > 0 && now - store.lastUpdate < 20000;
  const secondsAgo = store.lastUpdate > 0 ? Math.floor((now - store.lastUpdate) / 1000) : null;

  return NextResponse.json({
    deviceId: store.deviceId,
    isOnline,
    lastSeenSecondsAgo: secondsAgo,
    current: store.current,
    history: store.history,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lat = parseFloat(body.lat);
    const lng = parseFloat(body.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
    }

    const point: GPSPoint = {
      lat,
      lng,
      speed: parseFloat(body.speed) || 0,
      altitude: parseFloat(body.altitude) || 0,
      satellites: parseInt(body.satellites) || 0,
      timestamp: new Date().toISOString(),
    };

    const store = globalGps.gpsData!;
    store.current = point;
    store.lastUpdate = Date.now();

    // Tambahkan ke riwayat (maksimal 150 titik)
    store.history.push(point);
    if (store.history.length > 150) {
      store.history.shift();
    }

    return NextResponse.json({ success: true, point });
  } catch (err) {
    return NextResponse.json({ error: "Failed to parse body" }, { status: 500 });
  }
}

export async function DELETE() {
  const store = globalGps.gpsData!;
  store.history = [store.current];
  return NextResponse.json({ success: true, message: "History cleared" });
}
