import { NextResponse } from "next/server";

export interface GPSPoint {
  lat: number;
  lng: number;
  speed: number;
  altitude: number;
  satellites: number;
  timestamp: string;
}

// Rumus Haversine untuk hitung jarak dalam meter
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Global in-memory storage
const globalGps = global as unknown as {
  gpsData?: {
    current: GPSPoint;
    history: GPSPoint[];
    lastUpdate: number;
    deviceId: string;
    isFixed: boolean;
    rawStatus: string;
    wemosIp: string;
  };
};

if (!globalGps.gpsData) {
  globalGps.gpsData = {
    current: {
      lat: 0,
      lng: 0,
      speed: 0,
      altitude: 0,
      satellites: 0,
      timestamp: new Date().toISOString(),
    },
    history: [],
    lastUpdate: 0,
    deviceId: "WEMOS-D1-MINI-PRO-01",
    isFixed: false,
    rawStatus: "Menunggu sinyal GPS...",
    wemosIp: "192.168.207.186",
  };
}

export async function GET() {
  const store = globalGps.gpsData!;
  const now = Date.now();

  const isOnline = store.lastUpdate > 0 && now - store.lastUpdate < 20000;
  const secondsAgo = store.lastUpdate > 0 ? Math.floor((now - store.lastUpdate) / 1000) : null;

  return NextResponse.json({
    deviceId: store.deviceId,
    wemosIp: store.wemosIp,
    isOnline,
    isFixed: store.isFixed,
    rawStatus: store.rawStatus,
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
    const sats = parseInt(body.satellites) || 0;
    const isFixed = body.valid === true || (lat !== 0 && sats >= 3);
    const speed = parseFloat(body.speed) || 0;

    const point: GPSPoint = {
      lat: isNaN(lat) ? 0 : lat,
      lng: isNaN(lng) ? 0 : lng,
      speed,
      altitude: parseFloat(body.altitude) || 0,
      satellites: sats,
      timestamp: new Date().toISOString(),
    };

    const store = globalGps.gpsData!;
    store.current = point;
    store.isFixed = isFixed;
    store.lastUpdate = Date.now();
    store.rawStatus = isFixed
      ? `Terkunci (${sats} Satelit)`
      : `Mencari Satelit (${sats} Sats terlihat)...`;

    // Filter Jitter (Peredam Gerigi):
    // Hanya rekam titik baru jika jarak gerak minimal 2.5 meter dari titik terakhir
    if (isFixed && lat !== 0) {
      const lastPoint = store.history[store.history.length - 1];
      if (!lastPoint) {
        store.history.push(point);
      } else {
        const dist = getDistanceMeters(lastPoint.lat, lastPoint.lng, lat, lng);
        // Abaikan loncatan noise di bawah 2.5 meter saat posisi diam
        if (dist >= 2.5 || speed > 3) {
          store.history.push(point);
          if (store.history.length > 200) {
            store.history.shift();
          }
        }
      }
    }

    return NextResponse.json({ success: true, point });
  } catch (err) {
    return NextResponse.json({ error: "Failed to parse body" }, { status: 500 });
  }
}

export async function DELETE() {
  const store = globalGps.gpsData!;
  store.history = [];
  return NextResponse.json({ success: true, message: "History cleared" });
}
