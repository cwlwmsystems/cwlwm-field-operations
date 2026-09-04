"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type FieldMapLocation = {
  id: string;
  address: string;
  latitude?: number;
  longitude?: number;
  disposition: string;
};

type Position = { latitude: number; longitude: number };

type Props = {
  locations: FieldMapLocation[];
  routeIds: string[];
  selectedId?: string;
  currentPosition?: Position;
  onSelect: (id: string) => void;
};

declare global {
  interface Window {
    L?: any;
  }
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function hasCoordinates(location: FieldMapLocation) {
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
}

function markerState(disposition: string) {
  const value = disposition.toLowerCase();
  if (["sale", "sold", "installed", "activated"].some((word) => value.includes(word))) return "sale";
  if (["follow", "interested", "callback", "return"].some((word) => value.includes(word))) return "followup";
  if (["unvisited", "new", "not worked"].some((word) => value.includes(word))) return "unvisited";
  return "visited";
}

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

export function FieldMap({ locations, routeIds, selectedId, currentPosition, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const gpsLayerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const mappedLocations = useMemo(() => locations.filter(hasCoordinates), [locations]);
  const byId = useMemo(() => new Map(mappedLocations.map((location) => [location.id, location])), [mappedLocations]);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, { zoomControl: true, preferCanvas: true }).setView([39.5, -98.35], 4);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        layerRef.current = L.layerGroup().addTo(map);
        routeLayerRef.current = L.layerGroup().addTo(map);
        gpsLayerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        setReady(true);
        setTimeout(() => map.invalidateSize(), 50);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to initialize map."));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !window.L || !mapRef.current || !layerRef.current) return;
    const L = window.L;
    const layer = layerRef.current;
    layer.clearLayers();

    const routePosition = new Map(routeIds.map((id, index) => [id, index + 1]));
    const bounds: [number, number][] = [];

    for (const location of mappedLocations) {
      const lat = location.latitude as number;
      const lng = location.longitude as number;
      const position = routePosition.get(location.id);
      const isSelected = location.id === selectedId;
      const state = markerState(location.disposition);
      const icon = L.divIcon({
        className: "cwlwm-map-marker-wrap",
        html: `<span class="cwlwm-map-marker ${state}${isSelected ? " selected" : ""}${position ? " routed" : ""}">${position ?? "•"}</span>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      const marker = L.marker([lat, lng], { icon, keyboard: true, title: location.address });
      marker.bindTooltip(`<strong>${location.address}</strong><br/>${location.disposition}`, { direction: "top", offset: [0, -16] });
      marker.on("click", () => onSelect(location.id));
      marker.addTo(layer);
      bounds.push([lat, lng]);
    }

    if (bounds.length === 1) mapRef.current.setView(bounds[0], 16);
    else if (bounds.length > 1) mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [mappedLocations, onSelect, ready, routeIds, selectedId]);

  useEffect(() => {
    if (!ready || !window.L || !routeLayerRef.current) return;
    const L = window.L;
    const layer = routeLayerRef.current;
    layer.clearLayers();
    const points = routeIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((location) => [location!.latitude as number, location!.longitude as number]);
    if (points.length > 1) {
      L.polyline(points, { color: "#174f3b", weight: 5, opacity: 0.88, dashArray: "12 8", lineCap: "round", lineJoin: "round" }).addTo(layer);
    }
  }, [byId, ready, routeIds]);

  useEffect(() => {
    if (!ready || !window.L || !gpsLayerRef.current) return;
    const L = window.L;
    gpsLayerRef.current.clearLayers();
    if (!currentPosition) return;
    L.circleMarker([currentPosition.latitude, currentPosition.longitude], {
      radius: 8,
      weight: 3,
      color: "#ffffff",
      fillColor: "#1d6fdc",
      fillOpacity: 1,
    }).bindTooltip("Your location").addTo(gpsLayerRef.current);
  }, [currentPosition, ready]);

  return (
    <div className="field-map-frame">
      <div ref={containerRef} className="field-map-canvas" aria-label="Field operations map" />
      {!ready && !error && <div className="field-map-overlay">Loading map…</div>}
      {error && <div className="field-map-overlay error">{error}</div>}
      {ready && mappedLocations.length === 0 && <div className="field-map-overlay compact">No mapped locations in this view. Add latitude/longitude to locations to place them on the map.</div>}
    </div>
  );
}
