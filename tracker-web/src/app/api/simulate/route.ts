import { NextResponse } from "next/server";

// Simulasi pergerakan jalur kendaraan yang halus dan realistis
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
      isFixed?: boolean;
      heading?: number;
    };
  };

  if (!globalGps.gpsData) {
    return NextResponse.json({ error: "Store not initialized" }, { status: 500 });
  }

  const store = globalGps.gpsData;

  // Inisialisasi posisi awal jika masih 0,0
  if (store.current.lat === 0 && store.current.lng === 0) {
    store.current.lat = -7.747035;
    store.current.lng = 110.355398;
    store.heading = 45; // Menghadap timur laut mengikuti jalan
  }

  if (store.heading === undefined) {
    store.heading = 45;
  }

  // Berikan sedikit belokan bertahap (+- 8 derajat) agar rute meliuk halus seperti jalan raya
  store.heading += (Math.random() - 0.5) * 16;
  const rad = (store.heading * Math.PI) / 180;

  // Jarak tempuh per titik ~ 15-25 meter (0.00015 - 0.00025 derajat)
  const step = 0.00018 + Math.random() * 0.00007;
  const newLat = store.current.lat + Math.sin(rad) * step;
  const newLng = store.current.lng + Math.cos(rad) * step;
  const newSpeed = Math.floor(28 + Math.random() * 15);
  const newSats = Math.floor(8 + Math.random() * 3);

  const point = {
    lat: parseFloat(newLat.toFixed(6)),
    lng: parseFloat(newLng.toFixed(6)),
    speed: newSpeed,
    altitude: parseFloat((145 + Math.random() * 4).toFixed(1)),
    satellites: newSats,
    timestamp: new Date().toISOString(),
  };

  store.current = point;
  store.lastUpdate = Date.now();
  store.isFixed = true;
  store.history.push(point);
  if (store.history.length > 200) {
    store.history.shift();
  }

  return NextResponse.json({ success: true, point });
}
