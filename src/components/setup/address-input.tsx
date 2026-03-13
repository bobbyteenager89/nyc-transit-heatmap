"use client";

import { useState, useCallback } from "react";
import { geocodeAddress } from "@/lib/geocode";
import type { LatLng } from "@/lib/types";

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (address: string, location: LatLng | null) => void;
}

export function AddressInput({ label, value, onChange }: AddressInputProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleBlur = useCallback(async () => {
    if (!value.trim()) return;
    setIsGeocoding(true);
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    const result = await geocodeAddress(value, token);
    setIsGeocoding(false);
    if (result) {
      onChange(result.displayName, result.location);
    }
  }, [value, onChange]);

  return (
    <div className="flex flex-col gap-2">
      <label className="font-bold uppercase text-xs tracking-widest">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value, null)}
        onBlur={handleBlur}
        placeholder="Enter address..."
        className="bg-transparent border-3 border-red text-red font-body text-base p-3 outline-none placeholder:text-red/50 focus:bg-red focus:text-pink"
      />
      {isGeocoding && <span className="text-xs opacity-50">Geocoding...</span>}
    </div>
  );
}
