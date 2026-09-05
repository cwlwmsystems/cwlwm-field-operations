"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type FieldMapLocation = {
  id: string;
  address: string;
  latitude?: number;
  longitude?: number;
  disposition: string;
  serviceStatus?: string;
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
const CLUSTER_CSS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
const CLUSTER_DEFAULT_CSS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
const CLUSTER_JS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";

function hasCoordinates(location: FieldMapLocation) {
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
}

function markerState(disposition: string, serviceStatus?: string) {
  if (serviceStatus === "current_customer") return "current-customer";
  if (serviceStatus === "do_not_knock") return "do-not-knock";
  if (serviceStatus === "vacant") return "vacant";
  if (serviceStatus === "business") return "business";
  const value = disposition.toLowerCase();
  if (["sale", "sold", "installed", "activated"].some((word) => value.includes(word))) return "sale";
  if (["follow", "interested", "callback", "return"].some((word) => value.includes(word))) return "followup";
  if (["unvisited", "new", "not worked"].some((word) => value.includes(word))) return "unvisited";
  return "visited";
}

function ensureStylesheet(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((existing as any).dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.body.appendChild(script);
  });
}

async function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") throw new Error("Map is only available in the browser.");

  ensureStylesheet(LEAFLET_CSS);
  ensureStylesheet(CLUSTER_CSS);
  ensureStylesheet(CLUSTER_DEFAULT_CSS);

  if (!window.L) await loadScript(LEAFLET_JS);
  if (!window.L?.markerClusterGroup) await loadScript(CLUSTER_JS);

  if (!window.L?.markerClusterGroup) throw new Error("Unable to initialize map clustering.");
  return window.L;
}

export function FieldMap({ locations, routeIds, selectedId, currentPosition, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const gpsLayerRef = useRef<any>(null);
  const hasFitRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const mappedLocations = useMemo(() => locations.filter(hasCoordinates), [locations]);
  // Route highlighting only makes sense for a small, intentional route. A territory
  // with hundreds/thousands of addresses should remain a clean location map.
  const compactRouteIds = useMemo(
    () => new Set(routeIds.length <= 50 ? routeIds : []),
    [routeIds]
  );

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          zoomControl: true,
          preferCanvas: true,
        }).setView([39.5, -98.35], 4);

        const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });

        const satellite = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 19,
            attribution: "Tiles &copy; Esri and imagery providers",
          }
        );

        const satelliteLabels = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 19,
            attribution: "Labels &copy; Esri",
            pane: "overlayPane",
          }
        );

        satellite.addTo(map);
        satelliteLabels.addTo(map);

        L.control.layers(
          {
            "Satellite": satellite,
            "Street map": streets,
          },
          {
            "Place labels": satelliteLabels,
          },
          {
            position: "topright",
            collapsed: true,
          }
        ).addTo(map);

        layerRef.current = L.markerClusterGroup({
          chunkedLoading: true,
          chunkInterval: 100,
          chunkDelay: 25,
          maxClusterRadius: 48,
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          disableClusteringAtZoom: 17,
          removeOutsideVisibleBounds: true,
        }).addTo(map);

        gpsLayerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        setReady(true);
        setTimeout(() => map.invalidateSize(), 50);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to initialize map."));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !window.L || !mapRef.current || !layerRef.current) return;

    const L = window.L;
    const layer = layerRef.current;
    layer.clearLayers();

    const bounds: [number, number][] = [];
    const markers: any[] = [];

    for (const location of mappedLocations) {
      const lat = location.latitude as number;
      const lng = location.longitude as number;
      const isSelected = location.id === selectedId;
      const state = markerState(location.disposition, location.serviceStatus);
      const isCompactRouteStop = compactRouteIds.has(location.id);

      const icon = L.divIcon({
        className: "cwlwm-map-marker-wrap",
        html: `<span class="cwlwm-map-marker ${state}${isSelected ? " selected" : ""}${isCompactRouteStop ? " routed" : ""}" aria-hidden="true"></span>`,
        iconSize: isSelected ? [28, 28] : [20, 20],
        iconAnchor: isSelected ? [14, 14] : [10, 10],
      });

      const marker = L.marker([lat, lng], {
        icon,
        keyboard: true,
        title: location.address,
        riseOnHover: true,
      });

      marker.bindTooltip(
        `<strong>${location.address}</strong><br/>${(location.serviceStatus ?? "prospect").replaceAll("_", " ")} · ${location.disposition}`,
        { direction: "top", offset: [0, -10] }
      );
      marker.on("click", () => onSelect(location.id));
      markers.push(marker);
      bounds.push([lat, lng]);
    }

    if (markers.length) layer.addLayers(markers);

    // Fit once when the dataset/view changes, not every time a pin is selected.
    if (!hasFitRef.current && bounds.length === 1) {
      mapRef.current.setView(bounds[0], 16);
      hasFitRef.current = true;
    } else if (!hasFitRef.current && bounds.length > 1) {
      mapRef.current.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
      hasFitRef.current = true;
    }
  }, [compactRouteIds, mappedLocations, onSelect, ready, selectedId]);

  useEffect(() => {
    // A different filtered location set should be allowed to fit itself once.
    hasFitRef.current = false;
  }, [locations]);

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
    })
      .bindTooltip("Your location")
      .addTo(gpsLayerRef.current);
  }, [currentPosition, ready]);

  return (
    <div className="field-map-frame">
      <div ref={containerRef} className="field-map-canvas" aria-label="Field operations map" />
      {!ready && !error && <div className="field-map-overlay">Loading map…</div>}
      {error && <div className="field-map-overlay error">{error}</div>}
      {ready && mappedLocations.length === 0 && (
        <div className="field-map-overlay compact">
          No mapped locations in this view. Add latitude/longitude to locations to place them on the map.
        </div>
      )}
    </div>
  );
}
