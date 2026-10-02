"use client";

import { useEffect, useRef, useState } from "react";
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
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      maxZoom: 19,
    },
  },
  topo: {
    name: "Topografi / 3D",
    icon: "🏔️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    options: {
      attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community",
      maxZoom: 19,
    },
  },
};

type LayerKey = keyof typeof TILE_LAYERS;

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
  const polylineRef = useRef<L.Polyline | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerKey>("streets");

  // Inisialisasi Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [currentLat, currentLng],
      zoom: 17,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const initialLayerConfig = TILE_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(initialLayerConfig.url, initialLayerConfig.options).addTo(map);
    currentTileLayerRef.current = tileLayer;

    // Custom Glowing Vehicle Marker Pin
    const customIcon = L.divIcon({
      className: "custom-gps-pin",
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-10 h-10 rounded-full ${
            isOnline ? "bg-emerald-500/40 animate-ping" : "bg-blue-500/30"
          }"></span>
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 ring-4 ring-white/30 text-white shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
          ${speed > 0 ? `
            <div class="absolute -top-6 px-1.5 py-0.5 rounded-md bg-slate-900/90 text-[10px] font-bold text-emerald-400 border border-emerald-500/40 shadow">
              ${speed.toFixed(0)} km/h
            </div>
          ` : ''}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([currentLat, currentLng], { icon: customIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: inherit; font-size: 13px; line-height: 1.5; color: #f8fafc; padding: 4px;">
        <strong style="color: #38bdf8; font-size: 14px;">🛰️ Wemos D1 Mini GPS</strong><br/>
        <span>Lat: ${currentLat.toFixed(6)}</span><br/>
        <span>Lng: ${currentLng.toFixed(6)}</span><br/>
        <span>Speed: <strong>${speed.toFixed(1)} km/jam</strong></span>
      </div>
    `);

    // Polyline Jejak Jalur dengan gradasi neon
    const polyline = L.polyline(
      history.map((p) => [p.lat, p.lng]),
      {
        color: "#06b6d4",
        weight: 5,
        opacity: 0.85,
        smoothFactor: 1,
      }
    ).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;
    polylineRef.current = polyline;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Ganti Layer Tile saat diklik
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
    if (!mapRef.current || !markerRef.current || !polylineRef.current) return;

    const newPos: [number, number] = [currentLat, currentLng];
    markerRef.current.setLatLng(newPos);

    markerRef.current.setPopupContent(`
      <div style="font-family: inherit; font-size: 13px; line-height: 1.5; color: #f8fafc; padding: 4px;">
        <strong style="color: #38bdf8; font-size: 14px;">🛰️ Wemos D1 Mini GPS</strong><br/>
        <span>Lat: ${currentLat.toFixed(6)}</span><br/>
        <span>Lng: ${currentLng.toFixed(6)}</span><br/>
        <span>Speed: <strong>${speed.toFixed(1)} km/jam</strong></span>
      </div>
    `);

    const customIcon = L.divIcon({
      className: "custom-gps-pin",
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-10 h-10 rounded-full ${
            isOnline ? "bg-emerald-500/40 animate-ping" : "bg-blue-500/30"
          }"></span>
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 ring-4 ring-white/30 text-white shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
          ${speed > 0 ? `
            <div class="absolute -top-6 px-1.5 py-0.5 rounded-md bg-slate-900/90 text-[10px] font-bold text-emerald-400 border border-emerald-500/40 shadow">
              ${speed.toFixed(0)} km/h
            </div>
          ` : ''}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    markerRef.current.setIcon(customIcon);

    polylineRef.current.setLatLngs(history.map((p) => [p.lat, p.lng]));

    if (followMarker) {
      mapRef.current.panTo(newPos, { animate: true, duration: 0.5 });
    }
  }, [currentLat, currentLng, history, isOnline, followMarker, speed]);

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
