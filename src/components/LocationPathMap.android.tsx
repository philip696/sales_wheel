import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, {
  Callout,
  LatLng,
  Marker,
  Polyline,
  UrlTile,
} from 'react-native-maps';

import type { LocationPing } from '@/src/types';

/*
 * ================================================================
 * LOCATION PATH MAP (ANDROID)
 * ================================================================
 *
 * Metro resolves this ahead of the shared LocationPathMap.tsx
 * fallback when bundling for Android (`.android.tsx` > `.native.tsx`
 * > `.tsx`). iOS still gets the plain SVG fallback; web still gets
 * LocationPathMap.web.tsx (Leaflet). This file brings Android to
 * parity with the web version: real OpenStreetMap tiles, the same
 * green/blue/red numbered points, the same START/END pill labels,
 * the same popup fields, fit-to-bounds on the same GPS data.
 *
 * NOTE: react-native-maps on Android always renders through the
 * Google Maps SDK, even though the tiles drawn here are OSM's --
 * so a Google Maps API key is still required in app config
 * (android.config.googleMaps.apiKey) for this to render at all.
 */

type Props = {
  pings: LocationPing[];
};

const DEFAULT_CENTER = {
  latitude: -7.25,
  longitude: 112.75,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function LocationPathMap({ pings }: Props) {
  const mapRef = useRef<MapView | null>(null);

  /*
   * ----------------------------------------------------------
   * VALID GPS DATA
   * ----------------------------------------------------------
   */
  const validPings = useMemo(
    () =>
      (pings ?? []).filter(
        (ping) =>
          Number.isFinite(Number(ping.latitude)) &&
          Number.isFinite(Number(ping.longitude)),
      ),
    [pings],
  );

  /*
   * ----------------------------------------------------------
   * CONVERT GPS DATA TO MAP COORDINATES
   * ----------------------------------------------------------
   */
  const coordinates: LatLng[] = useMemo(
    () =>
      validPings.map((ping) => ({
        latitude: Number(ping.latitude),
        longitude: Number(ping.longitude),
      })),
    [validPings],
  );

  /*
   * ----------------------------------------------------------
   * FIT MAP TO GPS PATH
   * ----------------------------------------------------------
   * Mirrors the web version's fitBounds + invalidateSize-after-
   * timeout: give the map/markers a beat to lay out first.
   */
  useEffect(() => {
    if (coordinates.length === 0) return;

    const timeout = setTimeout(() => {
      if (!mapRef.current) return;

      if (coordinates.length === 1) {
        mapRef.current.animateToRegion(
          {
            ...coordinates[0],
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          300,
        );
        return;
      }

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [coordinates]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_CENTER}
      >
        {/*
         * ----------------------------------------------------------
         * SIMPLE MAP BACKGROUND (same OSM tile source as web)
         * ----------------------------------------------------------
         */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />

        {/*
         * ----------------------------------------------------------
         * ROUTE / PATH — rendered after the tile layer, drawn on top,
         * same as the web polyline.
         * ----------------------------------------------------------
         */}
        {coordinates.length > 1 && (
          <Polyline
            coordinates={coordinates}
            strokeColor="#2563eb"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/*
         * ----------------------------------------------------------
         * GPS POINTS
         * ----------------------------------------------------------
         * First location = green, last = red, others = blue --
         * same rule as the web circleMarker coloring.
         */}
        {validPings.map((ping, index) => {
          const latitude = Number(ping.latitude);
          const longitude = Number(ping.longitude);

          let fillColor = '#2563eb';
          if (index === 0) {
            fillColor = '#16a34a';
          } else if (index === validPings.length - 1) {
            fillColor = '#dc2626';
          }

          const date = ping.recorded_at
            ? new Date(ping.recorded_at)
            : null;
          const hasValidDate = date && !Number.isNaN(date.getTime());

          return (
            <Marker
              key={ping.id ?? index}
              coordinate={{ latitude, longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              {/* Numbered circle marker -- always-visible label, like
                  the web version's permanent bindTooltip. */}
              <View style={[styles.circleMarker, { backgroundColor: fillColor }]}>
                <Text style={styles.circleMarkerText}>{index + 1}</Text>
              </View>

              {/* Popup with the same fields as the Leaflet bindPopup. */}
              <Callout tooltip={false}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>
                    GPS Point {index + 1}
                  </Text>
                  <Text style={styles.calloutText}>
                    Latitude: {latitude.toFixed(6)}
                  </Text>
                  <Text style={styles.calloutText}>
                    Longitude: {longitude.toFixed(6)}
                  </Text>
                  {hasValidDate && (
                    <Text style={styles.calloutText}>
                      Time: {date!.toLocaleString()}
                    </Text>
                  )}
                  {ping.accuracy !== null && ping.accuracy !== undefined && (
                    <Text style={styles.calloutText}>
                      Accuracy: {Number(ping.accuracy).toFixed(1)} m
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/*
         * ----------------------------------------------------------
         * START / END LABELS
         * ----------------------------------------------------------
         */}
        {coordinates.length > 0 && (
          <Marker
            coordinate={coordinates[0]}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={[styles.pillMarker, { backgroundColor: '#16a34a' }]}>
              <Text style={styles.pillMarkerText}>START</Text>
            </View>
          </Marker>
        )}

        {coordinates.length > 1 && (
          <Marker
            coordinate={coordinates[coordinates.length - 1]}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={[styles.pillMarker, { backgroundColor: '#dc2626' }]}>
              <Text style={styles.pillMarkerText}>END</Text>
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 500,
    minHeight: 500,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#e5e7eb',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  circleMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  circleMarkerText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  pillMarker: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 3,
  },
  pillMarkerText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  callout: {
    minWidth: 160,
    padding: 4,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  calloutText: {
    fontSize: 13,
  },
});

export default LocationPathMap;