"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Navigation,
  Radio,
  Satellite,
  Gauge,
  Mountain,
  Wifi,
  MapPin,
  Clock,
  RotateCcw,
  Play,
  Copy,
  Check,
  ExternalLink,
  Layers,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// Dynamic import Leaflet component agar tidak error SSR di Next.js
const MapTracker = dynamic(() => import("@/components/MapTracker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[460px] bg-slate-900/60 flex flex-col items-center justify-center gap-3 text-slate-400 rounded-2xl border border-slate-800">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-medium">Memuat Peta OpenStreetMap...</p>
    </div>
  ),
});

interface GPSData {
  deviceId: string;
  wemosIp: string;
  isOnline: boolean;
  isFixed: boolean;
  rawStatus: string;
  lastSeenSecondsAgo: number | null;
  current: {
    lat: number;
    lng: number;
    speed: number;
    altitude: number;
    satellites: number;
    timestamp: string;
  };
  history: Array<{
    lat: number;
    lng: number;
    speed: number;
    altitude: number;
    satellites: number;
    timestamp: string;
  }>;
}

export default function TrackerDashboard() {
  const [data, setData] = useState<GPSData | null>(null);
  const [followMarker, setFollowMarker] = useState(true);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Polling data GPS setiap 2 detik
  const fetchData = async () => {
    try {
      const res = await fetch("/api/location", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Gagal polling data GPS:", e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const copyCoordinates = () => {
    if (!data?.current || (data.current.lat === 0 && data.current.lng === 0)) return;
    const text = `${data.current.lat.toFixed(6)}, ${data.current.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await fetch("/api/simulate", { method: "POST" });
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await fetch("/api/location", { method: "DELETE" });
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const current = data?.current || {
    lat: 0,
    lng: 0,
    speed: 0,
    altitude: 0,
    satellites: 0,
    timestamp: new Date().toISOString(),
  };

  const isOnline = data?.isOnline ?? false;
  const history = data?.history || [];
  const hasGpsFix = current.lat !== 0 && current.lng !== 0 && current.satellites >= 3;

  // Koordinat fallback untuk peta saat GPS belum fix (Jogja default)
  const displayLat = hasGpsFix ? current.lat : (history[0]?.lat || -7.747035);
  const displayLng = hasGpsFix ? current.lng : (history[0]?.lng || 110.355398);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Navigation className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                  IoT Real-Time GPS Tracker
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  OpenStreetMap
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Hardware: <strong>Wemos D1 Mini Pro</strong> + <strong>u-blox NEO-6M</strong></span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-3.5 h-3.5" /> iPhone 16 Pro Zaqi (192.168.207.186)
                </span>
              </p>
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
                isOnline
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              ></span>
              {isOnline ? "WEMOS ONLINE" : "WEMOS STANDBY"}
            </div>

            <button
              onClick={fetchData}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
              title="Perbarui data sekarang"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-medium rounded-xl transition shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50"
              title="Kirim koordinat uji coba untuk melihat pergerakan marker"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Tes Simulasi</span>
            </button>
          </div>
        </header>

        {/* Indoor / No-Fix Alert Banner */}
        {!hasGpsFix && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-300 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold block text-amber-200">
                Modul GPS Sedang Mencari Satelit (Indoor - 0 Satelit Terkunci)
              </strong>
              <p className="text-xs text-amber-300/90 leading-relaxed">
                Modul GPS NEO-6M fisik Anda sudah aktif dan terhubung, tetapi sinyal satelit GPS terhalang oleh atap/tembok ruangan. 
                Peta di atas sementara menampilkan posisi default/terakhir. 
                <strong> Bawa antena keramik GPS ke dekat jendela terbuka atau luar ruangan</strong> selama 1–3 menit sampai LED kecil di board GPS mulai berkedip (lock 3D).
              </p>
            </div>
          </div>
        )}

        {/* Stats Metric Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Satelit */}
          <div className="p-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-medium">Satelit Terkunci</span>
              <Satellite className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-extrabold text-white">
                {current.satellites}
              </span>
              <span className="text-xs text-slate-400 font-normal">Sats</span>
            </div>
            <div className="mt-2 text-[11px] flex items-center gap-1 text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${hasGpsFix ? "bg-emerald-400" : "bg-amber-400"}`}></span>
              {hasGpsFix ? "3D Fix Optimal" : "Mencari satelit..."}
            </div>
          </div>

          {/* Kecepatan */}
          <div className="p-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-medium">Kecepatan Saat Ini</span>
              <Gauge className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-extrabold text-white">
                {hasGpsFix ? current.speed.toFixed(1) : "0.0"}
              </span>
              <span className="text-xs text-slate-400 font-normal">km/jam</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              {hasGpsFix && current.speed > 5 ? "Sedang Berjalan" : "Posisi Diam / Parkir"}
            </div>
          </div>

          {/* Ketinggian */}
          <div className="p-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-medium">Ketinggian (Altitude)</span>
              <Mountain className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-extrabold text-white">
                {hasGpsFix ? current.altitude.toFixed(1) : "--"}
              </span>
              <span className="text-xs text-slate-400 font-normal">mdpl</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              {hasGpsFix ? "Di atas permukaan laut" : "Menunggu Lock GPS"}
            </div>
          </div>

          {/* Koordinat */}
          <div className="p-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-medium">Koordinat GPS</span>
              <MapPin className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-sm md:text-base font-bold text-white tracking-tight truncate">
              {hasGpsFix ? `${current.lat.toFixed(5)}, ${current.lng.toFixed(5)}` : "Mencari Lokasi..."}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              {hasGpsFix ? (
                <>
                  <button
                    onClick={copyCoordinates}
                    className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 transition"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Tersalin!" : "Salin"}</span>
                  </button>
                  <a
                    href={`https://maps.google.com/?q=${current.lat},${current.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-white inline-flex items-center gap-0.5 transition"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              ) : (
                <span className="text-amber-400/80 text-[11px]">Indoor / No Fix</span>
              )}
            </div>
          </div>
        </section>

        {/* Map Container & Interactive Controls */}
        <section className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 md:p-6 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Live Tracking Map</h2>
              <span className="text-xs text-slate-400">({history.length} jejak titik rute)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFollowMarker(!followMarker)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                  followMarker
                    ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Follow Marker: {followMarker ? "ON" : "OFF"}</span>
              </button>

              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
                title="Hapus jejak riwayat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Rute</span>
              </button>
            </div>
          </div>

          {/* Leaflet Map */}
          <div className="w-full h-[520px]">
            {mounted ? (
              <MapTracker
                currentLat={displayLat}
                currentLng={displayLng}
                history={history}
                isOnline={isOnline}
                followMarker={followMarker}
              />
            ) : (
              <div className="w-full h-full min-h-[460px] bg-slate-900/60 flex flex-col items-center justify-center gap-3 text-slate-400 rounded-2xl border border-slate-800">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Memuat Peta OpenStreetMap...</p>
              </div>
            )}
          </div>

          {/* Footer Info / Telemetry Log */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-slate-400">
            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Waktu Pembaruan:
              </span>
              <strong className="text-slate-200">
                {new Date(current.timestamp).toLocaleTimeString("id-ID")}
              </strong>
            </div>

            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 flex items-center justify-between">
              <span>Status Satelit:</span>
              <span className={hasGpsFix ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                {hasGpsFix ? `${current.satellites} Satelit (Terkunci)` : "0 Satelit (Mencari Sinyal Langit)"}
              </span>
            </div>

            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 flex items-center justify-between">
              <span>Wemos Web Portal:</span>
              <a 
                href="http://192.168.207.186/" 
                target="_blank" 
                rel="noreferrer" 
                className="text-blue-400 hover:underline font-mono"
              >
                http://192.168.207.186/ &rarr;
              </a>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
