"use client";

import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import type { LatLng } from "@/lib/types";

interface FriendInputProps {
  onSelect: (address: string, location: LatLng) => void;
  onRemove: () => void;
  initialValue?: string;
  hasResult: boolean;
}

export function FriendInput({ onSelect, onRemove, initialValue, hasResult }: FriendInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-display italic uppercase text-xs text-amber-500">
          Friend's Location
        </span>
        {hasResult && (
          <button
            onClick={onRemove}
            className="text-xs font-body text-red/50 hover:text-red cursor-pointer"
          >
            Remove
          </button>
        )}
      </div>
      <AddressAutocomplete
        label=""
        placeholder="Their address…"
        onSelect={onSelect}
        initialValue={initialValue ?? ""}
      />
      <p className="font-body text-[10px] text-red/40 leading-tight">
        See where your reachable areas overlap — the best place to meet.
      </p>
    </div>
  );
}
