"use client";

import { useState, useRef, useEffect } from "react";

type FuelType = "gasoline" | "diesel" | "lpg" | "electric" | "hybrid";

const fuelTypes: { value: FuelType; label: string }[] = [
  { value: "gasoline", label: "Benzin" },
  { value: "diesel", label: "Dizel" },
  { value: "lpg", label: "LPG" },
  { value: "hybrid", label: "Hybrid" },
  { value: "electric", label: "Elektrik" },
];

type FuelTypeSelectProps = {
  value: FuelType;
  onChange: (fuelType: FuelType) => void;
};

export default function FuelTypeSelect({ value, onChange }: FuelTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedFuel = fuelTypes.find((f) => f.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-left flex items-center justify-between bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition text-gray-900"
      >
        <span>{selectedFuel?.label || "Yakıt türü seçin"}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {fuelTypes.map((fuel) => (
            <button
              key={fuel.value}
              type="button"
              onClick={() => {
                onChange(fuel.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition ${
                value === fuel.value ? "bg-gray-50" : ""
              }`}
            >
              <span className="text-gray-900">{fuel.label}</span>
              {value === fuel.value && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-black shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
