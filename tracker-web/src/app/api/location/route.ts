import { NextResponse } from "next/server";

export interface GPSPoint {
  lat: number;
  lng: number;
  speed: number;
  altitude: number;
  satellites: number;
  timestamp: string;
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

  // Coba fetch langsung dari Wemos di jaringan lokal jika ada IP
  if (store.wemosIp && now - store.lastUpdate > 4000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`http://${store.wemosIp}/api/gps`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const wemosData = await res.json();
        const hasFix = wemosData.valid === true && wemosData.lat !== 0;
        
        store.current = {
          lat: wemosData.lat || 0,
          lng: wemosData.lng || 0,
          speed: wemosData.speed || 0,
          altitude: wemosData.altitude || 0,
          satellites: wemosData.satellites || 0,
          timestamp: new Date().toISOString(),
        };
        store.isFixed = hasFix;
        store.lastUpdate = Date.now();
        store.rawStatus = hasFix 
          ? `Lock Sinyal (${wemosData.satellites} Satelit)` 
          : `Indoor: Mencari Sinyal (${wemosData.chars} byte terbaca)`;

        if (hasFix) {
          store.history.push({ ...store.current });
          if (store.history.length > 150) store.history.shift();
        }
      }
    } catch (e) {
      // Wemos belum bisa dijangkau langsung via browser/server
    }
  }

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

    const point: GPSPoint = {
      lat: isNaN(lat) ? 0 : lat,
      lng: isNaN(lng) ? 0 : lng,
      speed: parseFloat(body.speed) || 0,
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

    if (isFixed && lat !== 0) {
      store.history.push(point);
      if (store.history.length > 150) {
        store.history.shift();
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
