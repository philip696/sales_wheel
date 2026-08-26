import React, { useMemo } from 'react';
import Svg, {
  Circle,
  Line,
  Polyline,
} from 'react-native-svg';

import type { LocationPing } from '@/src/types';

/*
 * ================================================================
 * LOCATION PATH MAP (NATIVE / FALLBACK)
 * ================================================================
 *
 * This is the fallback used on native platforms (iOS/Android) and
 * anywhere LocationPathMap.web.tsx isn't picked up. Metro prefers
 * the `.web.tsx` sibling when bundling for web -- that version uses
 * Leaflet with real OpenStreetMap tiles. This one draws a
 * deliberately simple "map" instead: no tile provider, no API key.
 * It projects a set of pings onto an SVG canvas by normalizing
 * lat/lng against the min/max of that set's own points, then draws
 * them as a connected path -- enough to see the shape of a rep's
 * day, but with no real-world orientation, scale, or street context.
 *
 * Nothing importing `@/src/components/LocationPathMap` needs to
 * know which of the two files it's getting.
 */

const MAP_SIZE = 280;
const MAP_PADDING = 20;

export function LocationPathMap({
  pings,
}: {
  pings: LocationPing[];
}) {
  const projected =
    useMemo(() => {
      const lats = pings.map(
        (p) => p.latitude,
      );

      const lngs = pings.map(
        (p) => p.longitude,
      );

      const minLat = Math.min(
        ...lats,
      );
      const maxLat = Math.max(
        ...lats,
      );
      const minLng = Math.min(
        ...lngs,
      );
      const maxLng = Math.max(
        ...lngs,
      );

      /*
       * Guard against a single ping (or a set of pings all at the
       * same spot), where lat/lng range is 0 and normalizing would
       * divide by zero -- just center the point(s) instead.
       */

      const latRange =
        maxLat - minLat || 1;
      const lngRange =
        maxLng - minLng || 1;

      const usable =
        MAP_SIZE -
        MAP_PADDING * 2;

      return pings.map((p) => {
        const x =
          MAP_PADDING +
          ((p.longitude -
            minLng) /
            lngRange) *
            usable;

        /*
         * Screen Y grows downward but latitude grows northward, so
         * this is flipped (1 - ...) to keep north pointing up.
         */

        const y =
          MAP_PADDING +
          (1 -
            (p.latitude -
              minLat) /
              latRange) *
            usable;

        return { x, y, ping: p };
      });
    }, [pings]);

  const polylinePoints =
    projected
      .map(
        (p) => `${p.x},${p.y}`,
      )
      .join(' ');

  return (
    <Svg
      width={MAP_SIZE}
      height={MAP_SIZE}
      viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}
    >
      {/* Simple border so the canvas reads as a "map" area */}
      <Line
        x1={0}
        y1={0}
        x2={MAP_SIZE}
        y2={0}
        stroke="#e2e8f0"
      />

      {projected.length > 1 && (
        <Polyline
          points={
            polylinePoints
          }
          fill="none"
          stroke="#2563eb"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {projected.map((p, index) => {
        const isFirst =
          index === 0;
        const isLast =
          index ===
          projected.length - 1;

        return (
          <Circle
            key={
              p.ping.id ??
              index
            }
            cx={p.x}
            cy={p.y}
            r={
              isFirst || isLast
                ? 5
                : 3
            }
            fill={
              isFirst
                ? '#16a34a'
                : isLast
                  ? '#dc2626'
                  : '#2563eb'
            }
          />
        );
      })}
    </Svg>
  );
}