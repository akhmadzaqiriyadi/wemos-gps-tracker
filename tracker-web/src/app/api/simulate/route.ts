import { NextResponse } from "next/server";

// Rute jalan asli yang presisi (Jalan Siliwangi / UTY -> Ringroad Barat -> Jl. Kyai Mojo -> Jl. Bener)
// Semua koordinat ini berada persis di atas jalan raya (tidak melenceng/menabrak bangunan)
const ROAD_WAYPOINTS: Array<[number, number]> = [
  [-7.747035, 110.355398], // 0: Depan Kampus 1 UTY (Jl. Siliwangi)
  [-7.747350, 110.354100], // 1: Jl. Siliwangi arah Barat
  [-7.747800, 110.352200], // 2: Mendekati Simpang Kronggahan
  [-7.748300, 110.350600], // 3: Simpang Kronggahan
  [-7.749000, 110.348900], // 4: Masuk ke Jl. Ringroad Barat
  [-7.750500, 110.348400], // 5: Menyusuri Ringroad Barat ke Selatan
  [-7.752500, 110.348250], // 6: Ringroad Barat
  [-7.755000, 110.348100], // 7: Ringroad Barat
  [-7.758000, 110.348050], // 8: Ringroad Barat
  [-7.761000, 110.348150], // 9: Mendekati Simpang Demak Ijo
  [-7.763200, 110.348300], // 10: Simpang Demak Ijo (Belok Kiri ke Jl. Kyai Mojo)
  [-7.763350, 110.350200], // 11: Jl. Kyai Mojo
  [-7.763550, 110.352800], // 12: Jl. Kyai Mojo
  [-7.763750, 110.355500], // 13: Jl. Kyai Mojo
  [-7.763850, 110.358800], // 14: Perempatan Pingit / Jl. Bener
  [-7.761800, 110.358900], // 15: Masuk Jalan Bener (Persis di atas aspal Jl. Bener)
  [-7.758500, 110.358850], // 16: Jl. Bener
  [-7.755500, 110.358750], // 17: Jl. Bener
  [-7.752500, 110.358650], // 18: Jl. Bener
  [-7.749500, 110.358550], // 19: Jl. Bener arah Utara
  [-7.747500, 110.358450], // 20: Pertigaan kembali ke Jl. Siliwangi
  [-7.747200, 110.356800], // 21: Jl. Siliwangi kembali ke Kampus UTY
];

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
      waypointIndex?: number;
    };
  };

  if (!globalGps.gpsData) {
    return NextResponse.json({ error: "Store not initialized" }, { status: 500 });
  }

  const store = globalGps.gpsData;

  // Lacak indeks waypoint di jalan nyata
  if (store.waypointIndex === undefined || store.waypointIndex < 0) {
    store.waypointIndex = 0;
  } else {
    store.waypointIndex = (store.waypointIndex + 1) % ROAD_WAYPOINTS.length;
  }

  const [targetLat, targetLng] = ROAD_WAYPOINTS[store.waypointIndex];
  const newSpeed = Math.floor(32 + Math.random() * 12);
  const newSats = Math.floor(9 + Math.random() * 3);

  const point = {
    lat: targetLat,
    lng: targetLng,
    speed: newSpeed,
    altitude: parseFloat((145 + Math.random() * 3).toFixed(1)),
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

  return NextResponse.json({
    success: true,
    waypointIndex: store.waypointIndex,
    point,
  });
}
