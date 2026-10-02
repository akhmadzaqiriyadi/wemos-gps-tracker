"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import SpeedometerGauge from "@/components/SpeedometerGauge";
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
  PowerOff,
  Trash2,
  Compass,
  Activity,
  Database,
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
  storage?: string;
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

  const handleResetAll = async () => {
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
  const hasCoordinates = current.lat !== 0 && current.lng !== 0;
  const hasGpsFix = isOnline && hasCoordinates && current.satellites >= 3;
  const isFixed = (data?.isFixed ?? false) || hasGpsFix;

  // Koordinat fallback untuk peta saat GPS belum fix (Jogja default)
  const displayLat = hasCoordinates ? current.lat : (history[0]?.lat || -7.747035);
  const displayLng = hasCoordinates ? current.lng : (history[0]?.lng || 110.355398);

  // Hitung total jarak tempuh rute (Trip Distance) dalam Kilometer
  const totalTripDistanceKm = useMemo(() => {
    if (!history || history.length < 2) return 0;
    let dist = 0;
    const R = 6371e3;
    for (let i = 1; i < history.length; i++) {
      const p1 = (history[i - 1].lat * Math.PI) / 180;
      const p2 = (history[i].lat * Math.PI) / 180;
      const dp = ((history[i].lat - history[i - 1].lat) * Math.PI) / 180;
      const dl = ((history[i].lng - history[i - 1].lng) * Math.PI) / 180;
      const a =
        Math.sin(dp / 2) * Math.sin(dp / 2) +
        Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      dist += R * c;
    }
    return dist / 1000;
  }, [history]);

  // Hitung arah mata angin (Heading) kendaraan
  const headingInfo = useMemo(() => {
    if (!history || history.length < 2) return { deg: 0, cardinal: "U (Utara)" };
    const p1 = history[history.length - 2];
    const p2 = history[history.length - 1];
    const y = Math.sin(((p2.lng - p1.lng) * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180);
    const x =
      Math.cos((p1.lat * Math.PI) / 180) * Math.sin((p2.lat * Math.PI) / 180) -
      Math.sin((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.cos(((p2.lng - p1.lng) * Math.PI) / 180);
    const deg = Math.round((((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360);
    const directions = ["U (Utara)", "TL (Timur Laut)", "T (Timur)", "TG (Tenggara)", "S (Selatan)", "BD (Barat Daya)", "B (Barat)", "BL (Barat Laut)"];
    const cardinal = directions[Math.round(deg / 45) % 8];
    return { deg, cardinal };
  }, [history]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 p-3 sm:p-5 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Top Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white">
                  IoT Real-Time GPS Tracker
                </h1>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    OpenStreetMap
                  </span>
                  <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Neon DB Active
                  </span>
                </div>
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm text-slate-400 flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                <span>Hardware: <strong>Wemos D1 Mini Pro</strong> + <strong>u-blox NEO-6M</strong></span>
                <span className="hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> iPhone 16 Pro Zaqi
                </span>
              </p>
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            {/* Status Badge */}
            <div
              className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                !isOnline
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  : isFixed
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  !isOnline
                    ? "bg-rose-500"
                    : isFixed
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-amber-400 animate-pulse"
                }`}
              ></span>
              <span className="truncate">
                {!isOnline
                  ? "ALAT DICABUT / OFFLINE"
                  : isFixed
                  ? "ALAT ONLINE (GPS TERKUNCI)"
                  : "ALAT ONLINE (MENCARI SATELIT)"}
              </span>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={fetchData}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
                title="Perbarui data sekarang"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-blue-600/90 hover:bg-blue-600 active:bg-blue-500 text-white text-xs font-medium rounded-xl transition shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                title="Kirim koordinat uji coba untuk melihat animasi pergerakan marker"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulasi</span>
              </button>

              <button
                onClick={handleResetAll}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 active:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-medium rounded-xl transition shadow-sm active:scale-95"
                title="Kosongkan data dan reset ke posisi awal"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </header>

        {/* Status Alert Banner */}
        {!isOnline ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-300 text-sm">
            <PowerOff className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold block text-rose-200">
                Alat Sedang Tidak Terhubung (Dicabut / Offline)
              </strong>
              <p className="text-xs text-rose-300/90 leading-relaxed">
                Modul Wemos saat ini tidak mengirim sinyal.
                {data?.lastSeenSecondsAgo 
                  ? ` Terakhir mengirim data ${data.lastSeenSecondsAgo} detik yang lalu.`
                  : " Belum ada data terbaru dari modul."}
                {hasCoordinates ? " Peta di bawah mengunci posisi terakhir yang terekam sebelum alat dimatikan." : ""}
              </p>
            </div>
          </div>
        ) : !hasGpsFix ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-300 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold block text-amber-200">
                Modul GPS Sedang Mencari Satelit (Indoor - 0 Satelit Terkunci)
              </strong>
              <p className="text-xs text-amber-300/90 leading-relaxed">
                Modul Wemos hidup dan terhubung ke cloud, tetapi sinyal satelit GPS terhalang atap ruangan.
                <strong> Bawa antena keramik GPS ke dekat jendela terbuka atau luar ruangan</strong> selama 1–2 menit sampai LED di board GPS berkedip.
              </p>
            </div>
          </div>
        ) : null}

        {/* Stats Metric Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Satelit */}
          <div className="p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span className="font-medium">Satelit</span>
              <Satellite className="w-4 h-4 text-cyan-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
                {isOnline ? current.satellites : 0}
              </span>
              <span className="text-xs text-slate-400 font-normal">Sats</span>
            </div>
            <div className="mt-2 text-[10px] sm:text-[11px] flex items-center gap-1.5 text-slate-400 truncate">
              <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${isOnline ? (hasGpsFix ? "bg-emerald-400" : "bg-amber-400") : "bg-rose-500"}`}></span>
              <span className="truncate">
                {isOnline 
                  ? (hasGpsFix ? "3D Fix Optimal" : "Mencari satelit...") 
                  : "Alat Terputus"}
              </span>
            </div>
          </div>

          {/* Kecepatan */}
          <div className="p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span className="font-medium">Kecepatan</span>
              <Gauge className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
                {isOnline && hasGpsFix ? current.speed.toFixed(1) : "0.0"}
              </span>
              <span className="text-xs text-slate-400 font-normal">km/h</span>
            </div>
            <div className="mt-2 text-[10px] sm:text-[11px] text-slate-400 truncate">
              {isOnline 
                ? (hasGpsFix && current.speed > 5 ? "Sedang Berjalan" : "Posisi Diam / Parkir")
                : "Alat Mati / Parkir"}
            </div>
          </div>

          {/* Ketinggian */}
          <div className="p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span className="font-medium">Ketinggian</span>
              <Mountain className="w-4 h-4 text-indigo-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
                {isOnline && hasGpsFix ? current.altitude.toFixed(1) : "--"}
              </span>
              <span className="text-xs text-slate-400 font-normal">mdpl</span>
            </div>
            <div className="mt-2 text-[10px] sm:text-[11px] text-slate-400 truncate">
              {isOnline 
                ? (hasGpsFix ? "Di atas laut" : "Menunggu Lock GPS")
                : "Offline"}
            </div>
          </div>

          {/* Koordinat */}
          <div className="p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span className="font-medium">Koordinat GPS</span>
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
            </div>
            <div className="font-mono text-xs sm:text-sm font-bold text-white tracking-tight truncate" title={hasCoordinates ? `${current.lat.toFixed(6)}, ${current.lng.toFixed(6)}` : ""}>
              {hasCoordinates ? `${current.lat.toFixed(5)}, ${current.lng.toFixed(5)}` : "Belum Ada Lokasi"}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] gap-2">
              {hasCoordinates ? (
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
                <span className="text-slate-500 text-[10px] sm:text-[11px]">Menunggu GPS Fix</span>
              )}
            </div>
          </div>
        </section>

        {/* Main Cockpit Section: Animated Speedometer HUD + Live Tracking Map */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left Column: Speedometer HUD & Cockpit Telemetry */}
          <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-4">
            <SpeedometerGauge
              speed={isOnline && hasGpsFix ? current.speed : 0}
              isOnline={isOnline}
              history={history}
            />

            {/* Quick Cockpit Telemetry Card */}
            <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold border-b border-slate-800/80 pb-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  KOKPIT NAVIGASI
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                  LIVE 2.5s
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block font-medium">ARAH GERAK</span>
                  <strong className="text-white font-mono text-xs sm:text-sm block mt-0.5 truncate">
                    {headingInfo.cardinal}
                  </strong>
                  <span className="text-[10px] text-cyan-400 font-mono">{headingInfo.deg}° Azimuth</span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block font-medium">JARAK TEMPUH</span>
                  <strong className="text-white font-mono text-xs sm:text-sm block mt-0.5">
                    {totalTripDistanceKm.toFixed(2)} <span className="text-xs font-normal text-slate-400">km</span>
                  </strong>
                  <span className="text-[10px] text-emerald-400 font-mono">{history.length} titik jejak</span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block font-medium">KETINGGIAN</span>
                  <strong className="text-white font-mono text-xs sm:text-sm block mt-0.5">
                    {isOnline && hasGpsFix ? current.altitude.toFixed(1) : "--"} <span className="text-xs font-normal text-slate-400">mdpl</span>
                  </strong>
                  <span className="text-[10px] text-indigo-400 font-mono">Elevasi GPS</span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block font-medium">CLOUD STORAGE</span>
                  <strong className="text-emerald-300 font-mono text-xs block mt-0.5 truncate">
                    Neon Postgres
                  </strong>
                  <span className="text-[10px] text-slate-400 font-mono">AWS Singapore</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Tracking Map */}
          <div className="lg:col-span-8 xl:col-span-8 bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 space-y-3 sm:space-y-4 shadow-2xl flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                <h2 className="text-base sm:text-lg font-bold text-white">Live Tracking Map</h2>
                <span className="text-xs text-slate-400 font-mono">({history.length} titik jejak)</span>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setFollowMarker(!followMarker)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    followMarker
                      ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Follow Marker: {followMarker ? "ON" : "OFF"}</span>
                </button>

                <button
                  onClick={handleResetAll}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
                  title="Hapus jejak riwayat"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Rute</span>
                </button>
              </div>
            </div>

            {/* Leaflet Map Responsive Viewport */}
            <div className="w-full h-[380px] sm:h-[460px] md:h-[500px] lg:h-[520px]">
              {mounted ? (
                <MapTracker
                  currentLat={displayLat}
                  currentLng={displayLng}
                  history={history}
                  isOnline={isOnline}
                  followMarker={followMarker}
                  speed={isOnline ? current.speed : 0}
                />
              ) : (
                <div className="w-full h-full min-h-[360px] bg-slate-900/60 flex flex-col items-center justify-center gap-3 text-slate-400 rounded-2xl border border-slate-800">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-medium">Memuat Peta OpenStreetMap...</p>
                </div>
              )}
            </div>

            {/* Footer Info / Telemetry Log */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-1 text-xs text-slate-400">
              <div className="p-2.5 sm:p-3 bg-slate-950/50 rounded-xl border border-slate-800/60 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Terakhir Dilihat:
                </span>
                <strong className="text-slate-200">
                  {isOnline ? "Baru saja (Live)" : data?.lastSeenSecondsAgo ? `${data.lastSeenSecondsAgo} detik lalu` : "Belum aktif"}
                </strong>
              </div>

              <div className="p-2.5 sm:p-3 bg-slate-950/50 rounded-xl border border-slate-800/60 flex items-center justify-between">
                <span>Status Satelit:</span>
                <span className={isOnline ? (hasGpsFix ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold") : "text-rose-400 font-semibold"}>
                  {isOnline 
                    ? (hasGpsFix ? `${current.satellites} Satelit Terkunci` : "Mencari Sinyal (Indoor)") 
                    : "Alat Dicabut / Tidak Aktif"}
                </span>
              </div>

              <div className="p-2.5 sm:p-3 bg-slate-950/50 rounded-xl border border-slate-800/60 flex items-center justify-between">
                <span>Status Alat:</span>
                <span className={isOnline ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                  {isOnline ? "Online Mengirim Telemetri" : "Offline / USB Dicabut"}
                </span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
