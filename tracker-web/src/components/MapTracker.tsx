"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapTrackerProps {
  currentLat: number;
  currentLng: number;
  history: Array<{ lat: number; lng: number }>;
  isOnline: boolean;
  followMarker: boolean;
  speed: number;
}

const TILE_LAYERS = {
  streets: {
    name: "Clean Street",
    icon: "🗺️",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
  },
  satellite: {
    name: "Satelit HD",
    icon: "🛰️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: {
      attribution: "Tiles &copy; Esri",
      maxZoom: 19,
    },
  },
  topo: {
    name: "Topografi",
    icon: "🏔️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    options: {
      attribution: "Tiles &copy; Esri",
      maxZoom: 19,
    },
  },
};

type LayerKey = keyof typeof TILE_LAYERS;

// Algoritma Chaikin Smoothing untuk memuluskan lekukan titik GPS
function smoothPolyline(points: Array<[number, number]>, iterations = 2): Array<[number, number]> {
  if (points.length < 3) return points;
  let current = points;

  for (let it = 0; it < iterations; it++) {
    const smoothed: Array<[number, number]> = [];
    smoothed.push(current[0]);

    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i];
      const p1 = current[i + 1];

      // Potong sudut pada titik 25% dan 75%
      const q: [number, number] = [
        0.75 * p0[0] + 0.25 * p1[0],
        0.75 * p0[1] + 0.25 * p1[1],
      ];
      const r: [number, number] = [
        0.25 * p0[0] + 0.75 * p1[0],
        0.25 * p0[1] + 0.75 * p1[1],
      ];

      smoothed.push(q);
      smoothed.push(r);
    }

    smoothed.push(current[current.length - 1]);
    current = smoothed;
  }

  return current;
}

export default function MapTracker({
  currentLat,
  currentLng,
  history,
  isOnline,
  followMarker,
  speed,
}: MapTrackerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineGlowRef = useRef<L.Polyline | null>(null);
  const polylineCoreRef = useRef<L.Polyline | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerKey>("streets");

  // Format dan haluskan jejak rute
  const smoothedLatLngs = useMemo(() => {
    const rawCoords: Array<[number, number]> = history
      .filter((p) => p.lat !== 0 && p.lng !== 0)
      .map((p) => [p.lat, p.lng]);
    return smoothPolyline(rawCoords, 2);
  }, [history]);

  // Inisialisasi Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [currentLat, currentLng],
      zoom: 17,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const initialConfig = TILE_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(initialConfig.url, initialConfig.options).addTo(map);
    currentTileLayerRef.current = tileLayer;

    // Custom Icon Pin
    const customIcon = L.divIcon({
      className: "custom-gps-pin",
      html: `
        <div class="relative flex items-center justify-center transition-all duration-300">
          <span class="absolute w-11 h-11 rounded-full ${
            isOnline ? "bg-cyan-500/40 animate-ping" : "bg-blue-500/20"
          }"></span>
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 ring-4 ring-white/40 text-white shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
          ${speed > 0 ? `
            <div class="absolute -top-6 px-1.5 py-0.5 rounded-md bg-slate-900/90 text-[10px] font-bold text-cyan-400 border border-cyan-500/40 shadow backdrop-blur-md">
              ${speed.toFixed(0)} km/h
            </div>
          ` : ''}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([currentLat, currentLng], { icon: customIcon }).addTo(map);

    // 1. Layer Glow Luar (Ambient Glow)
    const polyGlow = L.polyline(smoothedLatLngs, {
      color: "#0284c7",
      weight: 10,
      opacity: 0.35,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    // 2. Layer Inti Rute Neon (Sharp Core)
    const polyCore = L.polyline(smoothedLatLngs, {
      color: "#38bdf8",
      weight: 4,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;
    polylineGlowRef.current = polyGlow;
    polylineCoreRef.current = polyCore;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Ganti Layer Tile
  const switchLayer = (key: LayerKey) => {
    if (!mapRef.current || key === activeLayer) return;
    if (currentTileLayerRef.current) {
      mapRef.current.removeLayer(currentTileLayerRef.current);
    }
    const config = TILE_LAYERS[key];
    const newLayer = L.tileLayer(config.url, config.options).addTo(mapRef.current);
    currentTileLayerRef.current = newLayer;
    setActiveLayer(key);
  };

  // Update posisi marker dan jalur
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !polylineCoreRef.current || !polylineGlowRef.current) return;

    const newPos: [number, number] = [currentLat, currentLng];
    markerRef.current.setLatLng(newPos);

    // Update custom icon
    const customIcon = L.divIcon({
      className: "custom-gps-pin",
      html: `
        <div class="relative flex items-center justify-center transition-all duration-300">
          <span class="absolute w-11 h-11 rounded-full ${
            isOnline ? "bg-cyan-500/40 animate-ping" : "bg-blue-500/20"
          }"></span>
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 ring-4 ring-white/40 text-white shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
          ${speed > 0 ? `
            <div class="absolute -top-6 px-1.5 py-0.5 rounded-md bg-slate-900/90 text-[10px] font-bold text-cyan-400 border border-cyan-500/40 shadow backdrop-blur-md">
              ${speed.toFixed(0)} km/h
            </div>
          ` : ''}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    markerRef.current.setIcon(customIcon);

    // Update kedua layer polyline yang sudah dihaluskan
    polylineGlowRef.current.setLatLngs(smoothedLatLngs);
    polylineCoreRef.current.setLatLngs(smoothedLatLngs);

    if (followMarker) {
      mapRef.current.panTo(newPos, { animate: true, duration: 0.6 });
    }
  }, [currentLat, currentLng, smoothedLatLngs, isOnline, followMarker, speed]);

  return (
    <div className="w-full h-full relative rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60 group">
      {/* Floating Layer Switcher Buttons */}
      <div className="absolute top-4 left-4 z-[500] flex items-center gap-1.5 p-1.5 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl">
        {(Object.keys(TILE_LAYERS) as LayerKey[]).map((key) => {
          const l = TILE_LAYERS[key];
          const isActive = activeLayer === key;
          return (
            <button
              key={key}
              onClick={() => switchLayer(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-100"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/80"
              }`}
            >
              <span>{l.icon}</span>
              <span>{l.name}</span>
            </button>
          );
        })}
      </div>

      <div ref={mapContainerRef} className="w-full h-full min-h-[500px] z-0" />
    </div>
  );
}
