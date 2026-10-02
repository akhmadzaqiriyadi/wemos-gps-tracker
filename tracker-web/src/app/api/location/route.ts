import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

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

// Global fallback in-memory storage
const globalGps = global as unknown as {
  gpsData?: {
    current: GPSPoint;
    history: GPSPoint[];
    lastUpdate: number;
    deviceId: string;
    isFixed: boolean;
    rawStatus: string;
    wemosIp: string;
    dbInitialized?: boolean;
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
    dbInitialized: false,
  };
}

export async function GET() {
  const store = globalGps.gpsData!;
  const sql = getDb();

  // Inisialisasi tabel Neon jika ada DATABASE_URL
  if (sql && !store.dbInitialized) {
    await initDb();
    store.dbInitialized = true;
  }

  // Jika Neon Postgres tersedia, baca data permanen dari database
  if (sql) {
    try {
      // Ambil 250 titik koordinat terbaru
      const rows = await sql`
        SELECT latitude, longitude, speed, altitude, satellites, created_at 
        FROM gps_logs 
        ORDER BY created_at DESC 
        LIMIT 250;
      `;

      if (rows && rows.length > 0) {
        // Balikkan urutan agar kronologis dari yang terlama ke terbaru
        const dbHistory: GPSPoint[] = rows.reverse().map((r: any) => ({
          lat: parseFloat(r.latitude),
          lng: parseFloat(r.longitude),
          speed: parseFloat(r.speed),
          altitude: parseFloat(r.altitude),
          satellites: parseInt(r.satellites),
          timestamp: new Date(r.created_at).toISOString(),
        }));

        const latest = dbHistory[dbHistory.length - 1];
        const latestTime = new Date(latest.timestamp).getTime();
        const now = Date.now();
        const isOnline = now - latestTime < 25000;
        const secondsAgo = Math.floor((now - latestTime) / 1000);

        return NextResponse.json({
          deviceId: store.deviceId,
          wemosIp: store.wemosIp,
          isOnline,
          isFixed: latest.lat !== 0 && latest.satellites >= 3,
          rawStatus: isOnline ? "Online (Tersimpan di Neon DB)" : "Offline (Data tersimpan di Neon)",
          lastSeenSecondsAgo: secondsAgo,
          current: latest,
          history: dbHistory,
          storage: "neon-postgres",
        });
      } else {
        return NextResponse.json({
          deviceId: store.deviceId,
          wemosIp: store.wemosIp,
          isOnline: false,
          isFixed: false,
          rawStatus: "Siap (Neon Postgres terhubung, menunggu data Wemos...)",
          lastSeenSecondsAgo: null,
          current: store.current,
          history: [],
          storage: "neon-postgres",
        });
      }
    } catch (e) {
      console.error("Gagal membaca dari Neon Postgres, fallback ke memory:", e);
    }
  }

  // Fallback in-memory jika Neon belum terhubung
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
    storage: "memory-fallback",
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
    const altitude = parseFloat(body.altitude) || 0;

    const point: GPSPoint = {
      lat: isNaN(lat) ? 0 : lat,
      lng: isNaN(lng) ? 0 : lng,
      speed,
      altitude,
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

    // Simpan ke Neon Postgres jika valid dan tidak ada loncatan jitter
    const sql = getDb();
    if (sql && !store.dbInitialized) {
      await initDb();
      store.dbInitialized = true;
    }

    if (isFixed && lat !== 0) {
      // Periksa titik terakhir untuk filter jitter
      let shouldInsert = true;
      if (sql) {
        try {
          const lastRows = await sql`
            SELECT latitude, longitude FROM gps_logs ORDER BY created_at DESC LIMIT 1;
          `;
          if (lastRows.length > 0) {
            const dist = getDistanceMeters(
              parseFloat(lastRows[0].latitude),
              parseFloat(lastRows[0].longitude),
              lat,
              lng
            );
            // Abaikan jitter saat diam (jarak < 2.5m dan kecepatan < 3 km/jam)
            if (dist < 2.5 && speed < 3) {
              shouldInsert = false;
            }
          }

          if (shouldInsert) {
            await sql`
              INSERT INTO gps_logs (device_id, latitude, longitude, speed, altitude, satellites)
              VALUES (${store.deviceId}, ${lat}, ${lng}, ${speed}, ${altitude}, ${sats});
            `;
          }
        } catch (dbErr) {
          console.error("Gagal simpan ke Neon Postgres:", dbErr);
        }
      }

      // Memory storage update
      const lastPoint = store.history[store.history.length - 1];
      if (!lastPoint || getDistanceMeters(lastPoint.lat, lastPoint.lng, lat, lng) >= 2.5 || speed > 3) {
        store.history.push(point);
        if (store.history.length > 250) store.history.shift();
      }
    }

    return NextResponse.json({ success: true, point, savedToDb: !!sql });
  } catch (err) {
    return NextResponse.json({ error: "Failed to parse body" }, { status: 500 });
  }
}

export async function DELETE() {
  const store = globalGps.gpsData!;
  store.history = [];
  store.current = {
    lat: 0,
    lng: 0,
    speed: 0,
    altitude: 0,
    satellites: 0,
    timestamp: new Date().toISOString(),
  };
  store.isFixed = false;
  store.lastUpdate = 0;
  store.rawStatus = "Data telah di-reset.";

  const sql = getDb();
  if (sql) {
    try {
      await sql`TRUNCATE TABLE gps_logs;`;
      return NextResponse.json({ success: true, message: "Neon DB & Memory Cleared" });
    } catch (e) {
      console.error("Gagal truncate table Neon:", e);
    }
  }

  return NextResponse.json({ success: true, message: "Memory cleared" });
}
