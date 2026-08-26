import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import React, {
    useEffect,
    useMemo,
} from 'react';
import {
    CircleMarker,
    MapContainer,
    Polyline,
    TileLayer,
    useMap,
} from 'react-leaflet';

import type { LocationPing } from '@/src/types';

/*
 * ================================================================
 * LOCATION PATH MAP (WEB)
 * ================================================================
 *
 * This is the web build's version of LocationPathMap -- Metro
 * automatically prefers a `.web.tsx` file over the plain `.tsx`
 * sibling when bundling for web, and falls back to the plain file
 * (the self-relative react-native-svg version, no base map) on
 * native. Nothing importing `@/src/components/LocationPathMap`
 * needs to change; the platform-specific file is picked
 * automatically.
 *
 * Uses Leaflet + OpenStreetMap tiles: free, no API key, and Leaflet
 * is a plain DOM/JS library so it renders fine here since this file
 * only ever runs in a browser. It would NOT work if imported into a
 * native build -- that's exactly why it's isolated to `.web.tsx`
 * rather than replacing the shared component.
 */

const MAP_HEIGHT = 280;

/*
 * Leaflet's default marker icons reference image files via relative
 * URLs that don't resolve correctly through Metro's bundler. Not an
 * issue here since we draw CircleMarkers (plain SVG circles, no
 * icon images) instead of the default pin markers, but this is the
 * standard leaflet+bundler gotcha to know about if default markers
 * are ever added later.
 */

function FitBounds({
  positions,
}: {
  positions: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) {
      return;
    }

    if (positions.length === 1) {
      map.setView(
        positions[0],
        16,
      );
      return;
    }

    map.fitBounds(
      L.latLngBounds(
        positions,
      ),
      { padding: [24, 24] },
    );
  }, [map, positions]);

  return null;
}

export function LocationPathMap({
  pings,
}: {
  pings: LocationPing[];
}) {
  const positions =
    useMemo<
      [number, number][]
    >(
      () =>
        pings.map((p) => [
          p.latitude,
          p.longitude,
        ]),
      [pings],
    );

  if (positions.length === 0) {
    return null;
  }

  const first = positions[0];
  const last =
    positions[
      positions.length - 1
    ];

  return (
    <div
      style={{
        width: '100%',
        height: MAP_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <MapContainer
        center={first}
        zoom={15}
        style={{
          width: '100%',
          height: '100%',
        }}
        scrollWheelZoom={
          false
        }
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds
          positions={
            positions
          }
        />

        {positions.length >
          1 && (
          <Polyline
            positions={
              positions
            }
            pathOptions={{
              color:
                '#2563eb',
              weight: 3,
            }}
          />
        )}

        <CircleMarker
          center={first}
          radius={7}
          pathOptions={{
            color: '#16a34a',
            fillColor:
              '#16a34a',
            fillOpacity: 1,
          }}
        />

        {positions.length >
          1 && (
          <CircleMarker
            center={last}
            radius={7}
            pathOptions={{
              color:
                '#dc2626',
              fillColor:
                '#dc2626',
              fillOpacity: 1,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}