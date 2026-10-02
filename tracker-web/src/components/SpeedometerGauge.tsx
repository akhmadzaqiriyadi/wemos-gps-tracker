"use client";

import React, { useMemo } from "react";
import { Gauge, Zap, Flame, ShieldCheck } from "lucide-react";

interface SpeedometerGaugeProps {
  speed: number;
  isOnline: boolean;
  history?: Array<{ speed: number }>;
}

export default function SpeedometerGauge({
  speed,
  isOnline,
  history = [],
}: SpeedometerGaugeProps) {
  const displaySpeed = isOnline ? Math.max(0, speed) : 0;
  const maxScale = 120; // 0 - 120 km/jam
  const progress = Math.min(1, Math.max(0, displaySpeed / maxScale));

  // Hitung kecepatan maksimal & rata-rata dari riwayat
  const { maxSpeed, avgSpeed } = useMemo(() => {
    if (!history || history.length === 0) {
      return { maxSpeed: displaySpeed, avgSpeed: displaySpeed };
    }
    const speeds = history.map((h) => h.speed).filter((s) => !isNaN(s) && s >= 0);
    if (speeds.length === 0) return { maxSpeed: displaySpeed, avgSpeed: displaySpeed };
    const max = Math.max(...speeds, displaySpeed);
    const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    return { maxSpeed: max, avgSpeed: avg };
  }, [history, displaySpeed]);

  // SVG Arc Math (240 Derajat dari 150° ke 390°)
  // Radius = 75, Panjang Busur 240° = 314.16
  const totalLength = 314.16;
  const strokeDashoffset = totalLength * (1 - progress);
  const needleAngle = -120 + progress * 240;

  // Status gaya berkendara berdasarkan kecepatan
  const speedState = useMemo(() => {
    if (!isOnline) return { label: "OFFLINE", color: "text-slate-400", bg: "bg-slate-800/80 border-slate-700", icon: ShieldCheck };
    if (displaySpeed <= 2) return { label: "PARKIR / DIAM", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", icon: ShieldCheck };
    if (displaySpeed <= 40) return { label: "ECO / KOTA", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: ShieldCheck };
    if (displaySpeed <= 80) return { label: "CRUISING", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30", icon: Zap };
    if (displaySpeed <= 100) return { label: "KECEPATAN TINGGI", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", icon: Zap };
    return { label: "OVER SPEED", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30", icon: Flame };
  }, [displaySpeed, isOnline]);

  const StatusIcon = speedState.icon;

  // Ticks untuk skala 0, 20, 40, 60, 80, 100, 120
  const ticks = [0, 20, 40, 60, 80, 100, 120];

  return (
    <div className="relative flex flex-col items-center justify-between p-4 sm:p-5 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden group w-full">
      {/* Background Ambient Glow */}
      <div 
        className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{
          backgroundColor: displaySpeed > 80 ? "#f43f5e" : displaySpeed > 40 ? "#06b6d4" : "#10b981",
        }}
      />

      {/* Header Widget */}
      <div className="w-full flex items-center justify-between text-xs mb-1 z-10">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold tracking-wide">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span>SPEEDOMETER HUD</span>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${speedState.bg} ${speedState.color}`}>
          <StatusIcon className="w-3 h-3" />
          <span>{speedState.label}</span>
        </div>
      </div>

      {/* Gauge SVG Dial */}
      <div className="relative w-full max-w-[260px] aspect-[4/3] flex items-center justify-center my-1 z-10">
        <svg viewBox="0 0 200 160" className="w-full h-full overflow-visible">
          <defs>
            {/* Gradient untuk busur kecepatan aktif */}
            <linearGradient id="speedGaugeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="40%" stopColor="#06b6d4" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>

            {/* Filter glow neon */}
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 35.05 137.5 A 75 75 0 1 1 164.95 137.5"
            fill="none"
            stroke="rgba(30, 41, 59, 0.7)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Active Speed Arc with Smooth Transition */}
          <path
            d="M 35.05 137.5 A 75 75 0 1 1 164.95 137.5"
            fill="none"
            stroke="url(#speedGaugeGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={totalLength}
            strokeDashoffset={strokeDashoffset}
            filter="url(#gaugeGlow)"
            className="transition-all duration-500 ease-out"
          />

          {/* Tick Marks & Teks Skala */}
          {ticks.map((val) => {
            const tickProg = val / maxScale;
            const deg = -120 + tickProg * 240;
            const rad = ((deg - 90) * Math.PI) / 180;
            const rInner = 60;
            const rOuter = 65;
            const rText = 50;

            const x1 = 100 + rInner * Math.cos(rad);
            const y1 = 100 + rInner * Math.sin(rad);
            const x2 = 100 + rOuter * Math.cos(rad);
            const y2 = 100 + rOuter * Math.sin(rad);
            const xt = 100 + rText * Math.cos(rad);
            const yt = 100 + rText * Math.sin(rad);

            const isPassed = displaySpeed >= val;

            return (
              <g key={val}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isPassed ? "#38bdf8" : "rgba(100, 116, 139, 0.5)"}
                  strokeWidth={val % 40 === 0 ? "2" : "1.2"}
                  className="transition-colors duration-300"
                />
                <text
                  x={xt}
                  y={yt + 3}
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="600"
                  fill={isPassed ? "#e2e8f0" : "rgba(100, 116, 139, 0.7)"}
                  className="transition-colors duration-300 font-mono select-none"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Rotating Speedometer Needle */}
          <g
            transform={`rotate(${needleAngle}, 100, 100)`}
            className="transition-transform duration-500 ease-out origin-[100px_100px]"
          >
            {/* Needle Line with glowing tip */}
            <polygon
              points="98,100 102,100 100.5,35 99.5,35"
              fill="#38bdf8"
              filter="drop-shadow(0 0 4px #0ea5e9)"
            />
            {/* Center Pivot Hub */}
            <circle cx="100" cy="100" r="7" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
            <circle cx="100" cy="100" r="3" fill="#38bdf8" />
          </g>
        </svg>

        {/* Digital Speed Readout in Center */}
        <div className="absolute bottom-2 flex flex-col items-center justify-center pointer-events-none select-none">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
              {displaySpeed.toFixed(1)}
            </span>
            <span className="text-[11px] font-bold text-cyan-400 font-mono">KM/H</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-[-2px]">
            Real-Time Speed
          </span>
        </div>
      </div>

      {/* Footer Stats: Max Speed & Average Speed */}
      <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 z-10">
        <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/60 text-center">
          <span className="block text-[10px] text-slate-400 font-medium">MAX RECORD</span>
          <span className="text-xs sm:text-sm font-bold text-cyan-300 font-mono">
            {maxSpeed.toFixed(1)} <span className="text-[9px] font-normal text-slate-400">km/h</span>
          </span>
        </div>
        <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/60 text-center">
          <span className="block text-[10px] text-slate-400 font-medium">AVG SPEED</span>
          <span className="text-xs sm:text-sm font-bold text-emerald-300 font-mono">
            {avgSpeed.toFixed(1)} <span className="text-[9px] font-normal text-slate-400">km/h</span>
          </span>
        </div>
      </div>
    </div>
  );
}
