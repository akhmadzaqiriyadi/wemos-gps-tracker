"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapTrackerProps {
  currentLat: number;
  currentLng: number;
  history: Array<{ lat: number; lng: number }>;
  isOnline: boolean;
  followMarker: boolean;
}

export default function MapTracker({
  currentLat,
  currentLng,
  history,
  isOnline,
  followMarker,
}: MapTrackerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Inisialisasi Map
    const map = L.map(mapContainerRef.current, {
      center: [currentLat, currentLng],
      zoom: 17,
      zoomControl: false,
    });

    // Custom Zoom control di kanan bawah
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // OpenStreetMap CartoDB Dark Matter / Positron tiles yang elegan
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    ).addTo(map);

    // Custom Icon untuk GPS Tracker Pin
    const customIcon = L.divIcon({
      className: "custom-gps-pin",
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-8 h-8 rounded-full ${
            isOnline ? "bg-emerald-500/40 animate-ping" : "bg-amber-500/30"
          }"></span>
          <div class="w-6 h-6 rounded-full flex items-center justify-center ${
            isOnline
              ? "bg-emerald-500 ring-4 ring-emerald-500/30 text-white shadow-lg"
              : "bg-amber-500 ring-4 ring-amber-500/30 text-white shadow-lg"
          }">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Marker
    const marker = L.marker([currentLat, currentLng], { icon: customIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4; color: #1e293b;">
        <strong style="color: #0f172a; font-size: 14px;">🛰️ Wemos D1 Mini GPS</strong><br/>
        <span>Lat: ${currentLat.toFixed(6)}</span><br/>
        <span>Lng: ${currentLng.toFixed(6)}</span>
      </div>
    `);

    // Polyline Jejak Jalur
    const polyline = L.polyline(
      history.map((p) => [p.lat, p.lng]),
      {
        color: "#3b82f6",
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1,
        dashArray: "1, 6",
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

  // Update posisi marker dan jalur secara dinamis saat koordinat berubah
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !polylineRef.current) return;

    const newPos: [number, number] = [currentLat, currentLng];
    markerRef.current.setLatLng(newPos);

    // Update popup
    markerRef.current.setPopupContent(`
      <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4; color: #1e293b;">
        <strong style="color: #0f172a; font-size: 14px;">🛰️ Wemos D1 Mini GPS</strong><br/>
        <span>Lat: ${currentLat.toFixed(6)}</span><br/>
        <span>Lng: ${currentLng.toFixed(6)}</span>
      </div>
    `);

    // Update custom icon class jika status online berubah
    const customIcon = L.divIcon({
      className: "custom-gps-pin",
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-8 h-8 rounded-full ${
            isOnline ? "bg-emerald-500/40 animate-ping" : "bg-amber-500/30"
          }"></span>
          <div class="w-6 h-6 rounded-full flex items-center justify-center ${
            isOnline
              ? "bg-emerald-500 ring-4 ring-emerald-500/30 text-white shadow-lg"
              : "bg-amber-500 ring-4 ring-amber-500/30 text-white shadow-lg"
          }">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    markerRef.current.setIcon(customIcon);

    // Update Polyline
    polylineRef.current.setLatLngs(history.map((p) => [p.lat, p.lng]));

    // Auto pan jika mode follow aktif
    if (followMarker) {
      mapRef.current.panTo(newPos, { animate: true, duration: 0.6 });
    }
  }, [currentLat, currentLng, history, isOnline, followMarker]);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50">
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px] z-0" />
    </div>
  );
}
