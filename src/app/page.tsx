"use client";

import { useState, useCallback } from "react";
import CitySearch from "@/components/CitySearch";
import RainfallChart from "@/components/RainfallChart";
import {
  fetchCityRainfall,
  reverseGeocode,
  CityData,
  GeocodingResult,
  CITY_COLORS,
  SUGGESTED_CITIES,
} from "@/lib/weather";

export default function Home() {
  const [cities, setCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("");

  const addCity = useCallback(async (city: GeocodingResult, label?: string) => {
    const id = `${city.latitude.toFixed(4)}_${city.longitude.toFixed(4)}`;
    setCities((prev) => {
      if (prev.some((c) => c.id === id)) return prev;
      return prev;
    });

    setLoading(true);
    setLoadingLabel(label || city.name);
    try {
      const data = await fetchCityRainfall(city);
      setCities((prev) => {
        if (prev.some((c) => c.id === data.id)) return prev;
        return [...prev, data];
      });
    } catch (err) {
      console.error("Failed to fetch rainfall data:", err);
    } finally {
      setLoading(false);
      setLoadingLabel("");
    }
  }, []);

  const handleLocationClick = useCallback(() => {
    if (!navigator.geolocation) return;
    setLoading(true);
    setLoadingLabel("your location");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const city = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (city) {
            await addCity(city, "your location");
          }
        } catch (err) {
          console.error("Failed to get location:", err);
        } finally {
          setLoading(false);
          setLoadingLabel("");
        }
      },
      () => {
        setLoading(false);
        setLoadingLabel("");
      }
    );
  }, [addCity]);

  const removeCity = useCallback((id: string) => {
    setCities((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const hasCities = cities.length > 0;

  return (
    <main className="relative h-screen w-screen bg-white">
      <RainfallChart cities={cities} />

      {/* Header + controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {hasCities && (
            <h1 className="text-lg font-semibold text-slate-700 mr-1">
              Days of Rainfall
            </h1>
          )}
          <CitySearch onCitySelect={addCity} disabled={loading} />
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Loading {loadingLabel}...
            </div>
          )}
        </div>

        {hasCities && (
          <div className="flex flex-wrap gap-2">
            {cities.map((city, i) => (
              <button
                key={city.id}
                onClick={() => removeCity(city.id)}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                           bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm
                           hover:bg-red-50 hover:border-red-200 transition-colors"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CITY_COLORS[i % CITY_COLORS.length] }}
                />
                <span className="text-slate-600 group-hover:text-red-600 transition-colors">
                  {city.displayName}
                </span>
                <span className="text-slate-300 group-hover:text-red-400 ml-1 transition-colors">
                  &times;
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Landing page */}
      {!hasCities && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-8 max-w-md px-6">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-slate-800 tracking-tight">
                Days of Rainfall
              </h1>
              <p className="mt-3 text-slate-400 text-lg">
                Historical precipitation probability for any city, by day of year.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 w-full">
              <button
                onClick={handleLocationClick}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                           bg-blue-500 text-white text-sm font-medium
                           hover:bg-blue-600 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                My Location
              </button>

              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="h-px w-8 bg-slate-200" />
                or try
                <span className="h-px w-8 bg-slate-200" />
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_CITIES.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => addCity(city)}
                    className="px-4 py-2 rounded-xl text-sm text-slate-600
                               bg-slate-50 border border-slate-200
                               hover:bg-slate-100 hover:border-slate-300 transition-colors"
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state on landing */}
      {!hasCities && loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-800 tracking-tight">
              Days of Rainfall
            </h1>
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Loading {loadingLabel}...
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 right-4 text-xs text-slate-300">
        Data from Open-Meteo Historical Weather API
      </div>
    </main>
  );
}
