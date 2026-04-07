"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import type { LatLng } from "@/lib/types";

interface AddressAutocompleteProps {
  label: string;
  placeholder?: string;
  onSelect: (address: string, location: LatLng) => void;
  initialValue?: string;
  autoFocus?: boolean;
}

/**
 * Address input with Mapbox Search autocomplete suggestions.
 * Uses the Mapbox Geocoding API directly for reliability with React 19 / Next.js 16.
 * Debounces at 300ms and restricts to NYC bounding box.
 */
export function AddressAutocomplete({
  label,
  placeholder = "Start typing an address…",
  onSelect,
  initialValue = "",
  autoFocus = false,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<
    { place_name: string; center: [number, number] }[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
  const NYC_BBOX = "-74.04,40.63,-73.87,40.83";

  const fetchSuggestions = useCallback(
    async (text: string) => {
      if (text.length < 3) {
        setSuggestions([]);
        return;
      }
      const encoded = encodeURIComponent(text);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&bbox=${NYC_BBOX}&limit=5&types=address,poi`;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(
          (data.features || []).map((f: { place_name: string; center: [number, number] }) => ({
            place_name: f.place_name,
            center: f.center,
          }))
        );
        setShowDropdown(true);
        setSelectedIndex(-1);
      } catch {
        // Silently ignore network errors
      }
    },
    [token]
  );

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
    },
    [fetchSuggestions]
  );

  const handleSelect = useCallback(
    (suggestion: { place_name: string; center: [number, number] }) => {
      setQuery(suggestion.place_name);
      setShowDropdown(false);
      setSuggestions([]);
      // Yield the main thread so the dropdown close paints BEFORE the heavy
      // parent work (Mapbox layer updates, isochrone fetch) runs. Double rAF
      // guarantees the browser has committed a frame before onSelect fires.
      // Fixes INP: click → ~300ms blocking.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          onSelect(suggestion.place_name, {
            lat: suggestion.center[1],
            lng: suggestion.center[0],
          });
        });
      });
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown || suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowDropdown(false);
      }
    },
    [showDropdown, suggestions, selectedIndex, handleSelect]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2">
      <label className="font-bold uppercase text-xs tracking-widest">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        name="address"
        autoComplete="off"
        autoFocus={autoFocus}
        className="bg-white/5 border border-white/20 text-white font-body text-base p-3 outline-none rounded-lg focus-visible:ring-1 focus-visible:ring-accent placeholder:text-white/30 focus:bg-white/10 focus:border-accent transition-colors"
      />
      {showDropdown && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 bg-surface-card border border-white/20 border-t-0 z-50 max-h-48 overflow-y-auto rounded-b-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.place_name}
              role="option"
              aria-selected={i === selectedIndex}
              onClick={() => handleSelect(s)}
              className={`px-3 py-2 text-sm cursor-pointer text-white ${
                i === selectedIndex ? "bg-accent/20 text-accent" : "hover:bg-white/10"
              }`}
            >
              {s.place_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
