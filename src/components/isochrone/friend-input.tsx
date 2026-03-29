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
      {hasResult && (
        <div className="flex justify-end">
          <button
            onClick={onRemove}
            className="text-xs font-body text-white/40 hover:text-white cursor-pointer"
          >
            Remove
          </button>
        </div>
      )}
      <AddressAutocomplete
        label=""
        placeholder="Their address…"
        onSelect={onSelect}
        initialValue={initialValue ?? ""}
      />
      <p className="font-body text-[10px] text-white/30 leading-tight">
        See where your reachable areas overlap — the best place to meet.
      </p>
    </div>
  );
}
