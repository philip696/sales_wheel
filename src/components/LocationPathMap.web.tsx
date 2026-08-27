import React, { useEffect, useRef } from 'react';

import type { LocationPing } from '@/src/types';

type Props = {
  pings: LocationPing[];
};

export function LocationPathMap({ pings }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const renderMap = async () => {
      if (typeof window === 'undefined') return;
      if (!mapContainerRef.current) return;

      // Load Leaflet CSS in the browser.
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');

        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href =
          'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

        document.head.appendChild(link);
      }

      // Load Leaflet only in the browser.
      const leafletModule = await import('leaflet');

      if (cancelled || !mapContainerRef.current) {
        return;
      }

      const L = leafletModule.default;

      // Remove previous map.
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Create map.
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
      });

      mapRef.current = map;

      /*
       * ----------------------------------------------------------
       * SIMPLE MAP BACKGROUND
       * ----------------------------------------------------------
       *
       * OpenStreetMap provides the actual geographic map.
       */
      L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,

          attribution:
            '&copy; OpenStreetMap contributors',
        },
      ).addTo(map);

      /*
       * ----------------------------------------------------------
       * VALID GPS DATA
       * ----------------------------------------------------------
       */
      const validPings = (pings ?? []).filter(
        (ping) =>
          Number.isFinite(Number(ping.latitude)) &&
          Number.isFinite(Number(ping.longitude)),
      );

      /*
       * No coordinates.
       */
      if (validPings.length === 0) {
        map.setView([-7.25, 112.75], 13);
        return;
      }

      /*
       * ----------------------------------------------------------
       * CONVERT GPS DATA TO LEAFLET COORDINATES
       * ----------------------------------------------------------
       */
      const coordinates: [number, number][] =
        validPings.map((ping) => [
          Number(ping.latitude),
          Number(ping.longitude),
        ]);

      /*
       * ----------------------------------------------------------
       * ROUTE / PATH
       * ----------------------------------------------------------
       *
       * This is drawn AFTER the tile layer, so it appears
       * directly ON TOP of the map.
       */
      if (coordinates.length > 1) {
        L.polyline(coordinates, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }

      /*
       * ----------------------------------------------------------
       * GPS POINTS
       * ----------------------------------------------------------
       *
       * Every recorded coordinate is displayed on top of
       * the actual map.
       */
      validPings.forEach((ping, index) => {
        const latitude = Number(ping.latitude);
        const longitude = Number(ping.longitude);

        /*
         * First location = green.
         * Last location = red.
         * Other GPS points = blue.
         */
        let fillColor = '#2563eb';

        if (index === 0) {
          fillColor = '#16a34a';
        } else if (index === validPings.length - 1) {
          fillColor = '#dc2626';
        }

        const marker = L.circleMarker(
          [latitude, longitude],
          {
            radius: 6,
            color: '#ffffff',
            weight: 2,
            fillColor,
            fillOpacity: 1,
          },
        ).addTo(map);

        /*
         * Popup containing the actual coordinates.
         */
        let popup = `
          <div style="font-size:13px">
            <strong>GPS Point ${index + 1}</strong>
            <br/>
            Latitude: ${latitude.toFixed(6)}
            <br/>
            Longitude: ${longitude.toFixed(6)}
        `;

        if (ping.recorded_at) {
          const date = new Date(
            ping.recorded_at,
          );

          if (!Number.isNaN(date.getTime())) {
            popup += `
              <br/>
              Time: ${date.toLocaleString()}
            `;
          }
        }

        if (
          ping.accuracy !== null &&
          ping.accuracy !== undefined
        ) {
          popup += `
            <br/>
            Accuracy: ${Number(
              ping.accuracy,
            ).toFixed(1)} m
          `;
        }

        popup += '</div>';

        marker.bindPopup(popup);

        /*
         * Always show the coordinate number.
         */
        marker.bindTooltip(
          `${index + 1}`,
          {
            permanent: true,
            direction: 'center',
            className:
              'sales-wheel-gps-label',
          },
        );
      });

      /*
       * ----------------------------------------------------------
       * START / END LABELS
       * ----------------------------------------------------------
       */
      if (coordinates.length > 0) {
        L.marker(coordinates[0], {
          icon: L.divIcon({
            className: 'sales-wheel-start-marker',
            html: `
              <div style="
                background:#16a34a;
                color:white;
                border-radius:999px;
                padding:5px 9px;
                font-size:11px;
                font-weight:700;
                white-space:nowrap;
                border:2px solid white;
                box-shadow:0 1px 5px rgba(0,0,0,.3);
              ">
                START
              </div>
            `,
            iconSize: [60, 28],
            iconAnchor: [30, 14],
          }),
        }).addTo(map);
      }

      if (coordinates.length > 1) {
        const last =
          coordinates[coordinates.length - 1];

        L.marker(last, {
          icon: L.divIcon({
            className: 'sales-wheel-end-marker',
            html: `
              <div style="
                background:#dc2626;
                color:white;
                border-radius:999px;
                padding:5px 9px;
                font-size:11px;
                font-weight:700;
                white-space:nowrap;
                border:2px solid white;
                box-shadow:0 1px 5px rgba(0,0,0,.3);
              ">
                END
              </div>
            `,
            iconSize: [45, 28],
            iconAnchor: [22, 14],
          }),
        }).addTo(map);
      }

      /*
       * ----------------------------------------------------------
       * FIT MAP TO GPS PATH
       * ----------------------------------------------------------
       */
      const bounds =
        L.latLngBounds(coordinates);

      map.fitBounds(bounds, {
        padding: [50, 50],
      });

      /*
       * Make sure Leaflet knows the container size.
       */
      setTimeout(() => {
        if (!cancelled && mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 300);
    };

    renderMap();

    return () => {
      cancelled = true;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [pings]);

  return (
    <div
      style={{
        width: '100%',
        height: 500,
        minHeight: 500,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#e5e7eb',
      }}
    >
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}

export default LocationPathMap;