import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { DEFAULT_MAP_CENTER } from "../lib/constants";

const GEOCODE_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const MIN_QUERY_LENGTH = 2;
const SEARCH_RESULT_LIMIT = 6;

function ClickHandler({ onChange }) {
  useMapEvents({
    click(event) {
      onChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng
      });
    }
  });

  return null;
}

function Recenter({ latitude, longitude }) {
  const map = useMapEvents({});

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      map.flyTo([latitude, longitude], map.getZoom(), {
        duration: 0.5
      });
    }
  }, [latitude, longitude, map]);

  return null;
}

export default function MapPicker({ latitude, longitude, onChange }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const debounceTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const skipNextSearchRef = useRef(false);

  const hasLocation = latitude !== null && longitude !== null;
  const center = hasLocation ? [latitude, longitude] : DEFAULT_MAP_CENTER;

  function normalizeResults(geocodeResults) {
    return geocodeResults
      .map((result, index) => ({
        id: result.place_id ?? `${index}-${result.lat}-${result.lon}`,
        label: result.display_name,
        latitude: Number(result.lat),
        longitude: Number(result.lon)
      }))
      .filter((result) => Number.isFinite(result.latitude) && Number.isFinite(result.longitude));
  }

  function applySelection(result) {
    skipNextSearchRef.current = true;
    onChange({
      latitude: result.latitude,
      longitude: result.longitude
    });
    setQuery(result.label);
    setSearchError("");
    setShowResults(false);
    setResults([]);
    setActiveResultIndex(-1);
  }

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return undefined;
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setShowResults(false);
      setActiveResultIndex(-1);
      setSearchError("");
      setSearching(false);
      return undefined;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setSearching(true);
      setSearchError("");

      try {
        const url = `${GEOCODE_ENDPOINT}?q=${encodeURIComponent(trimmedQuery)}&format=jsonv2&limit=${SEARCH_RESULT_LIMIT}`;
        const response = await fetch(url, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Location lookup failed.");
        }

        const geocodeResults = await response.json();
        const normalizedResults = normalizeResults(geocodeResults);
        setResults(normalizedResults);

        if (normalizedResults.length === 0) {
          setShowResults(false);
          setActiveResultIndex(-1);
          setSearchError("No matching locations found.");
          return;
        }

        setShowResults(true);
        setActiveResultIndex(0);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setResults([]);
          setShowResults(false);
          setActiveResultIndex(-1);
          setSearchError("Location search is unavailable right now. Try again.");
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setSearching(false);
        }
      }
    }, 350);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  function handleInputChange(event) {
    setQuery(event.target.value);
    setSearchError("");
  }

  function handleInputKeyDown(event) {
    if (event.key === "Escape") {
      setShowResults(false);
      return;
    }

    if (results.length === 0) {
      if (event.key === "Enter") {
        event.preventDefault();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setShowResults(true);
      setActiveResultIndex((current) => {
        const nextIndex = current + 1;
        return nextIndex >= results.length ? 0 : nextIndex;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setShowResults(true);
      setActiveResultIndex((current) => {
        const nextIndex = current - 1;
        return nextIndex < 0 ? results.length - 1 : nextIndex;
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const selectedResult =
        activeResultIndex >= 0 ? results[activeResultIndex] : results[0];
      if (selectedResult) {
        applySelection(selectedResult);
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200">
      <div className="space-y-3 border-b border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Search location
        </p>
        <div className="space-y-2">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onFocus={() => {
              if (results.length > 0) {
                setShowResults(true);
              }
            }}
            placeholder="Search like Google Maps (e.g., New York, Times Square)"
            className="input-field"
          />
          {searching ? <p className="text-xs text-slate-500">Searching locations...</p> : null}
        </div>
        {searchError ? <p className="text-sm text-rose-600">{searchError}</p> : null}
        {showResults && results.length > 0 ? (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
            {results.map((result, index) => (
              <button
                key={result.id}
                type="button"
                onClick={() => applySelection(result)}
                className={`block w-full rounded-xl px-3 py-2 text-left text-xs transition ${
                  index === activeResultIndex
                    ? "bg-slate-100 text-slate-950"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {result.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <MapContainer center={center} zoom={13} className="h-[320px] w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        <Recenter latitude={latitude} longitude={longitude} />
        {hasLocation ? <Marker position={[latitude, longitude]} /> : null}
      </MapContainer>
    </div>
  );
}
