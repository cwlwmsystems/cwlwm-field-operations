"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type DispatchRepPoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  activity: "active" | "recent" | "quiet";
  detail: string;
  locationId?: string;
  source: "gps" | "field_event";
};

export type DispatchActivityPoint = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
};

type Props = {
  reps: DispatchRepPoint[];
  activity: DispatchActivityPoint[];
  selectedRepId?: string;
  onSelectRep: (id: string) => void;
};

declare global {
  interface Window {
    L?: any;
  }
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("Map is only available in the browser."));
  if (window.L) return Promise.resolve(window.L);

  return new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load the map library.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Unable to load the map library."));
    document.body.appendChild(script);
  });
}

export function DispatchLiveMap({ reps, activity, selectedRepId, onSelectRep }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const repLayerRef = useRef<any>(null);
  const activityLayerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const points = useMemo(() => [...reps.map((rep) => [rep.latitude, rep.longitude] as [number, number]), ...activity.map((row) => [row.latitude, row.longitude] as [number, number])], [reps, activity]);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: true, preferCanvas: true }).setView([39.5, -98.35], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      activityLayerRef.current = L.layerGroup().addTo(map);
      repLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
      setTimeout(() => map.invalidateSize(), 50);
    }).catch((err) => setError(err instanceof Error ? err.message : "Unable to initialize map."));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !window.L || !activityLayerRef.current) return;
    const L = window.L;
    const layer = activityLayerRef.current;
    layer.clearLayers();
    for (const row of activity) {
      L.circleMarker([row.latitude, row.longitude], {
        radius: 4,
        weight: 1,
        color: "#ffffff",
        fillColor: "#57796b",
        fillOpacity: 0.38,
      }).bindTooltip(row.label).addTo(layer);
    }
  }, [activity, ready]);

  useEffect(() => {
    if (!ready || !window.L || !repLayerRef.current) return;
    const L = window.L;
    const layer = repLayerRef.current;
    layer.clearLayers();
    for (const rep of reps) {
      const selected = rep.id === selectedRepId;
      const initials = rep.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "R";
      const icon = L.divIcon({
        className: "dispatch-rep-marker-wrap",
        html: `<span class="dispatch-rep-marker ${rep.activity}${selected ? " selected" : ""}">${initials}</span>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });
      const marker = L.marker([rep.latitude, rep.longitude], { icon, title: rep.name });
      marker.bindTooltip(`<strong>${rep.name}</strong><br/>${rep.detail}<br/><small>${rep.source === "gps" ? "GPS location" : "Last field event"}</small>`, { direction: "top", offset: [0, -18] });
      marker.on("click", () => onSelectRep(rep.id));
      marker.addTo(layer);
    }
  }, [onSelectRep, ready, reps, selectedRepId]);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.L || points.length === 0) return;
    if (points.length === 1) mapRef.current.setView(points[0], 15);
    else mapRef.current.fitBounds(points, { padding: [45, 45], maxZoom: 14 });
  }, [points, ready]);

  return (
    <div className="dispatch-live-map-frame">
      <div ref={containerRef} className="dispatch-live-map-canvas" aria-label="Live representative activity map" />
      {!ready && !error && <div className="field-map-overlay">Loading live map…</div>}
      {error && <div className="field-map-overlay error">{error}</div>}
      {ready && reps.length === 0 && activity.length === 0 && <div className="field-map-overlay compact">No mapped live activity in this view yet.</div>}
    </div>
  );
}
