"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  buildSatelliteDiagnostics,
  SATELLITE_GPS_REQUIRED_MESSAGE,
  SATELLITE_PROVIDER_DISABLED_MESSAGE,
  SATELLITE_TOKEN_FORMAT_MESSAGE,
  SATELLITE_STATUS_COLORS,
  satelliteProviderConfig,
  type SatelliteDiagnostics,
  type SatelliteMapOverlayModel,
} from "@/lib/drilling/satellite-map";

type Props = {
  overlay: SatelliteMapOverlayModel;
  onSelectHole: (holeId: string) => void;
  onSwitchToLocal: () => void;
  active?: boolean;
  selectedHoleId?: string | null;
  demoHoleId?: string | null;
  onSelectDemoHole?: (holeId: string) => void;
};

type MarkerProperties = {
  holeId: string;
  kind: string;
  color: string;
  radius: number;
  highlighted: boolean;
};

type LineProperties = {
  holeId: string;
  color: string;
  highlighted: boolean;
  related: boolean;
  dashed: boolean;
};

type MarkerFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: MarkerProperties;
};

type LineFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: LineProperties;
};

function buildGeoJson(overlay: SatelliteMapOverlayModel) {
  const markers: MarkerFeature[] = [];
  const traces: LineFeature[] = [];
  const motherTraces: LineFeature[] = [];

  for (const layer of overlay.layers) {
    const color = SATELLITE_STATUS_COLORS[layer.status];
    const highlighted = layer.highlighted;

    const addMarker = (
      point: { lat: number; lng: number } | null,
      kind: string,
      radius: number
    ) => {
      if (!point) return;
      markers.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [point.lng, point.lat] },
        properties: { holeId: layer.holeId, kind, color, radius, highlighted },
      });
    };

    addMarker(layer.collar, "collar", highlighted ? 9 : 7);
    addMarker(layer.target, "target", highlighted ? 8 : 6);
    addMarker(layer.kickoff, "kickoff", highlighted ? 8 : 6);

    if (layer.trace?.coordinates.length) {
      traces.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: layer.trace.coordinates },
        properties: { holeId: layer.holeId, color, highlighted, related: layer.related, dashed: false },
      });
    }

    if (layer.motherTrace?.coordinates.length) {
      motherTraces.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: layer.motherTrace.coordinates },
        properties: {
          holeId: layer.holeId,
          color: "#94a3b8",
          highlighted: false,
          related: true,
          dashed: true,
        },
      });
    }
  }

  return {
    markers: { type: "FeatureCollection" as const, features: markers },
    traces: { type: "FeatureCollection" as const, features: traces },
    motherTraces: { type: "FeatureCollection" as const, features: motherTraces },
  };
}

function diagLabel(ok: boolean) {
  return ok ? "yes" : "no";
}

function SatelliteDiagnosticsPanel({
  diagnostics,
  mapContainerMounted,
  lastMapError,
}: {
  diagnostics: SatelliteDiagnostics;
  mapContainerMounted: boolean;
  lastMapError: string | null;
}) {
  return (
    <details className="planner-satellite-diagnostics">
      <summary>Satellite diagnostics</summary>
      <dl className="planner-satellite-diagnostics-list">
        <div>
          <dt>Mapbox token detected</dt>
          <dd className={diagnostics.mapboxTokenDetected ? "ok" : "warn"}>
            {diagLabel(diagnostics.mapboxTokenDetected)}
          </dd>
        </div>
        <div>
          <dt>Token format valid (pk.)</dt>
          <dd className={diagnostics.mapboxTokenFormatValid ? "ok" : "warn"}>
            {diagLabel(diagnostics.mapboxTokenFormatValid)}
          </dd>
        </div>
        <div>
          <dt>Provider configured</dt>
          <dd className={diagnostics.providerConfigured ? "ok" : "warn"}>
            {diagLabel(diagnostics.providerConfigured)}
          </dd>
        </div>
        <div>
          <dt>Collar GPS available</dt>
          <dd className={diagnostics.collarGpsAvailable ? "ok" : "warn"}>
            {diagLabel(diagnostics.collarGpsAvailable)}
          </dd>
        </div>
        <div>
          <dt>Satellite center resolved</dt>
          <dd className={diagnostics.satelliteCenterResolved ? "ok" : "warn"}>
            {diagLabel(diagnostics.satelliteCenterResolved)}
          </dd>
        </div>
        <div>
          <dt>Map container mounted</dt>
          <dd className={mapContainerMounted ? "ok" : "warn"}>
            {diagLabel(mapContainerMounted)}
          </dd>
        </div>
        {lastMapError ? (
          <div className="planner-satellite-diagnostics-error">
            <dt>Last map error</dt>
            <dd>{lastMapError}</dd>
          </div>
        ) : null}
      </dl>
    </details>
  );
}

export function PlannerSatelliteMap({
  overlay,
  onSelectHole,
  onSwitchToLocal,
  active = true,
  selectedHoleId,
  demoHoleId,
  onSelectDemoHole,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const onSelectRef = useRef(onSelectHole);
  onSelectRef.current = onSelectHole;

  const [mapContainerMounted, setMapContainerMounted] = useState(false);
  const [lastMapError, setLastMapError] = useState<string | null>(null);

  const provider = satelliteProviderConfig();
  const diagnostics = useMemo(
    () => buildSatelliteDiagnostics(overlay, selectedHoleId),
    [overlay, selectedHoleId]
  );
  const geoJson = useMemo(() => buildGeoJson(overlay), [overlay]);
  const geoJsonRef = useRef(geoJson);
  geoJsonRef.current = geoJson;

  const canShowMap = provider.ready && Boolean(overlay.center);

  const syncSources = useCallback(
    (map: Map) => {
      (map.getSource("satellite-markers") as GeoJSONSource | undefined)?.setData(geoJson.markers);
      (map.getSource("satellite-traces") as GeoJSONSource | undefined)?.setData(geoJson.traces);
      (map.getSource("satellite-mother-traces") as GeoJSONSource | undefined)?.setData(
        geoJson.motherTraces
      );
    },
    [geoJson]
  );

  const resizeMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    requestAnimationFrame(() => map.resize());
  }, []);

  useEffect(() => {
    if (!canShowMap || !containerRef.current) {
      setMapContainerMounted(false);
      return;
    }

    setMapContainerMounted(true);
    const token = provider.token!;
    const initialCenter = overlay.center!;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "mapbox-satellite": {
            type: "raster",
            tiles: [
              `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${token}`,
            ],
            tileSize: 512,
            attribution:
              '© <a href="https://www.mapbox.com/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        },
        layers: [
          {
            id: "satellite-base",
            type: "raster",
            source: "mapbox-satellite",
          },
        ],
      },
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: overlay.zoom,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("error", (event) => {
      const message =
        event.error?.message ??
        (typeof event.error === "string" ? event.error : "Map failed to load tiles");
      setLastMapError(message);
    });

    map.on("load", () => {
      setLastMapError(null);
      map.addSource("satellite-traces", { type: "geojson", data: geoJson.traces });
      map.addSource("satellite-mother-traces", { type: "geojson", data: geoJson.motherTraces });
      map.addSource("satellite-markers", { type: "geojson", data: geoJson.markers });

      map.addLayer({
        id: "satellite-mother-traces-line",
        type: "line",
        source: "satellite-mother-traces",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2,
          "line-opacity": 0.55,
          "line-dasharray": [4, 3],
        },
      });

      map.addLayer({
        id: "satellite-traces-line",
        type: "line",
        source: "satellite-traces",
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["get", "highlighted"], 4, 3],
          "line-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "satellite-markers-circle",
        type: "circle",
        source: "satellite-markers",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["get", "radius"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": ["case", ["get", "highlighted"], 2, 1],
        },
      });

      map.on("click", "satellite-markers-circle", (e) => {
        const holeId = e.features?.[0]?.properties?.holeId;
        if (typeof holeId === "string") onSelectRef.current(holeId);
      });
      map.on("mouseenter", "satellite-markers-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "satellite-markers-circle", () => {
        map.getCanvas().style.cursor = "";
      });

      const data = geoJsonRef.current;
      (map.getSource("satellite-traces") as GeoJSONSource | undefined)?.setData(data.traces);
      (map.getSource("satellite-mother-traces") as GeoJSONSource | undefined)?.setData(
        data.motherTraces
      );
      (map.getSource("satellite-markers") as GeoJSONSource | undefined)?.setData(data.markers);

      resizeMap();
    });

    mapRef.current = map;
    resizeMap();

    return () => {
      map.remove();
      mapRef.current = null;
      setMapContainerMounted(false);
    };
  }, [
    canShowMap,
    provider.token,
    overlay.center?.latitude,
    overlay.center?.longitude,
    overlay.zoom,
    resizeMap,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncSources(map);
  }, [geoJson, syncSources]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !overlay.center) return;
    map.flyTo({
      center: [overlay.center.longitude, overlay.center.latitude],
      zoom: overlay.zoom,
      duration: 600,
    });
  }, [overlay.center?.latitude, overlay.center?.longitude, overlay.zoom]);

  useEffect(() => {
    if (!active) return;
    resizeMap();
  }, [active, resizeMap]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !canShowMap) return;
    const observer = new ResizeObserver(() => resizeMap());
    observer.observe(el);
    return () => observer.disconnect();
  }, [canShowMap, resizeMap]);

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map || !overlay.center) return;
    map.flyTo({
      center: [overlay.center.longitude, overlay.center.latitude],
      zoom: overlay.zoom,
      duration: 400,
    });
  };

  return (
    <div className="planner-satellite-map-wrap">
      <SatelliteDiagnosticsPanel
        diagnostics={diagnostics}
        mapContainerMounted={mapContainerMounted}
        lastMapError={lastMapError}
      />

      {!provider.ready ? (
        <div className="planner-satellite-empty planner-satellite-disabled" role="status">
          <p>
            {provider.token ? SATELLITE_TOKEN_FORMAT_MESSAGE : SATELLITE_PROVIDER_DISABLED_MESSAGE}
          </p>
          <p className="targetlock-helper">
            In <code>packages/starterkit/.env.local</code>, put the full token on one line:{" "}
            <code>NEXT_PUBLIC_MAPBOX_TOKEN=pk.…</code> then restart <code>npm run dev</code>.
          </p>
          <button
            type="button"
            className="targetlock-btn targetlock-btn-sm"
            onClick={onSwitchToLocal}
          >
            Open in Local Plan View
          </button>
        </div>
      ) : !overlay.center ? (
        <div className="planner-satellite-empty" role="status">
          <p>{SATELLITE_GPS_REQUIRED_MESSAGE}</p>
          {demoHoleId && onSelectDemoHole ? (
            <button
              type="button"
              className="targetlock-btn targetlock-btn-sm targetlock-btn-primary"
              onClick={() => onSelectDemoHole(demoHoleId)}
            >
              Select GPS demo hole
            </button>
          ) : null}
          <button
            type="button"
            className="targetlock-btn targetlock-btn-sm"
            onClick={onSwitchToLocal}
          >
            Open in Local Plan View
          </button>
        </div>
      ) : (
        <>
          <div className="planner-map-toolbar planner-satellite-toolbar">
            <button
              type="button"
              className="targetlock-btn targetlock-btn-sm"
              onClick={handleRecenter}
            >
              Recenter
            </button>
            <button
              type="button"
              className="targetlock-btn targetlock-btn-sm"
              onClick={onSwitchToLocal}
            >
              Open in Local Plan View
            </button>
          </div>
          <div ref={containerRef} className="planner-satellite-map" aria-label="Satellite plan map" />
        </>
      )}
    </div>
  );
}
