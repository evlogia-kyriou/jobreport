/**
 * LocationMapPicker
 * Uses Leaflet + OpenStreetMap tiles ✅
 * Nominatim geocoding from address ✅
 * Falls back to Jakarta center if geocoding fails ✅
 * Admin can drag pin or click map to reposition ✅
 */
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";

// Fix Leaflet default icon path for Vite ✅
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url,
  ).href,
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url)
    .href,
});

// ── Jakarta default ───────────────────────────────────────────────────────────
const JAKARTA_CENTER: [number, number] = [-6.2088, 106.8456];
const DEFAULT_ZOOM = 15;
const SEARCH_ZOOM = 17;

// ── Nominatim geocoding ───────────────────────────────────────────────────────
async function geocode(address: string): Promise<[number, number] | null> {
  if (!address.trim()) return null;
  try {
    const params = new URLSearchParams({
      q: address,
      format: "json",
      addressdetails: "1",
      limit: "1",
      countrycodes: "id", // Indonesia only ✅
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "Accept-Language": "id",
          "User-Agent": "JobReport-MILBA/1.0",
        },
      },
    );
    const data = await res.json();
    if (data?.[0]) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch {
    // Geocoding failed — fall through to null ✅
  }
  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface LocationMapPickerProps {
  lat?: number;
  lng?: number;
  address?: string; // used for auto-geocoding ✅
  onChange: (lat: number, lng: number) => void;
  height?: string; // default "300px"
  readonly?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function LocationMapPicker({
  lat,
  lng,
  address,
  onChange,
  height = "300px",
  readonly = false,
}: LocationMapPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [noResult, setNoResult] = useState(false);
  const [coords, setCoords] = useState<[number, number] | null>(
    lat && lng ? [lat, lng] : null,
  );

  // ── Initialize map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = coords ?? JAKARTA_CENTER;
    const map = L.map(containerRef.current, {
      center,
      zoom: coords ? SEARCH_ZOOM : DEFAULT_ZOOM,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    if (coords) {
      const marker = L.marker(coords, { draggable: !readonly }).addTo(map);
      if (!readonly) {
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          setCoords([p.lat, p.lng]);
          onChange(p.lat, p.lng);
        });
      }
      markerRef.current = marker;
    }

    if (!readonly) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat: la, lng: lo } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([la, lo]);
        } else {
          const m = L.marker([la, lo], { draggable: true }).addTo(map);
          m.on("dragend", () => {
            const p = m.getLatLng();
            setCoords([p.lat, p.lng]);
            onChange(p.lat, p.lng);
          });
          markerRef.current = m;
        }
        setCoords([la, lo]);
        onChange(la, lo);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // run once ✅

  // ── Auto-geocode when address changes (no existing coords) ─────────────────
  useEffect(() => {
    if (coords || !address || !mapRef.current) return;
    setGeocoding(true);
    setNoResult(false);

    geocode(address).then((result) => {
      setGeocoding(false);
      if (!result) {
        setNoResult(true);
        return;
      }

      setCoords(result);
      onChange(result[0], result[1]);

      const map = mapRef.current!;
      map.flyTo(result, SEARCH_ZOOM);

      if (markerRef.current) {
        markerRef.current.setLatLng(result);
      } else {
        const m = L.marker(result, { draggable: !readonly }).addTo(map);
        m.on("dragend", () => {
          const p = m.getLatLng();
          setCoords([p.lat, p.lng]);
          onChange(p.lat, p.lng);
        });
        markerRef.current = m;
      }
    });
  }, [address]);

  // ── Manual geocode button ──────────────────────────────────────────────────
  async function handleGeocode() {
    if (!address || !mapRef.current) return;
    setGeocoding(true);
    setNoResult(false);
    const result = await geocode(address);
    setGeocoding(false);

    if (!result) {
      setNoResult(true);
      return;
    }

    setCoords(result);
    onChange(result[0], result[1]);

    const map = mapRef.current;
    map.flyTo(result, SEARCH_ZOOM);

    if (markerRef.current) {
      markerRef.current.setLatLng(result);
    } else {
      const m = L.marker(result, { draggable: !readonly }).addTo(map);
      m.on("dragend", () => {
        const p = m.getLatLng();
        setCoords([p.lat, p.lng]);
        onChange(p.lat, p.lng);
      });
      markerRef.current = m;
    }
  }

  return (
    <div className="space-y-2">
      {/* Map container ✅ */}
      <div
        ref={containerRef}
        style={{ height, width: "100%", borderRadius: 8, overflow: "hidden" }}
        className="border border-slate-200"
      />

      {/* Controls ✅ */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          {coords
            ? `📍 ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`
            : "Belum ada koordinat — klik peta atau cari otomatis"}
        </div>
        {!readonly && (
          <div className="flex items-center gap-2">
            {noResult && (
              <span className="text-xs text-amber-600">
                Alamat tidak ditemukan — geser pin secara manual ✅
              </span>
            )}
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocoding || !address}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              {geocoding ? "Mencari..." : "Cari dari alamat"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
