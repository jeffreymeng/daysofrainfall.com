"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { searchCities, GeocodingResult } from "@/lib/weather";

interface CitySearchProps {
  onCitySelect: (city: GeocodingResult) => void;
  disabled?: boolean;
}

export default function CitySearch({ onCitySelect, disabled }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const cities = await searchCities(q);
    setResults(cities);
    setIsOpen(cities.length > 0);
    setHighlightedIndex(-1);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 250);
  };

  const handleSelect = (city: GeocodingResult) => {
    onCitySelect(city);
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatCityLabel = (city: GeocodingResult) => {
    const parts = [city.name];
    if (city.admin1) parts.push(city.admin1);
    parts.push(city.country);
    return parts.join(", ");
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        placeholder="Search for a city..."
        disabled={disabled}
        className="w-64 sm:w-80 px-4 py-2.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl
                   text-sm text-slate-700 placeholder-slate-400
                   focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
                   shadow-sm transition-all disabled:opacity-50"
      />
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-white/95 backdrop-blur-sm border border-slate-200
                        rounded-xl shadow-lg overflow-hidden z-50">
          {results.map((city, i) => (
            <button
              key={city.id}
              onClick={() => handleSelect(city)}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                ${i === highlightedIndex ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
            >
              <span className="font-medium">{city.name}</span>
              <span className="text-slate-400 ml-1">
                {city.admin1 ? `${city.admin1}, ` : ""}{city.country}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
