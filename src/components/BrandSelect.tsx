"use client";

import { useState, useRef, useEffect } from "react";

type Brand = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

type BrandSelectProps = {
  brands: Brand[];
  value: string;
  onChange: (brandId: string) => void;
  error?: string;
  touched?: boolean;
};

export default function BrandSelect({ brands, value, onChange, error, touched }: BrandSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedBrand = brands.find((b) => b.id === value);

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
        className={`w-full border rounded-lg px-4 py-2.5 text-left flex items-center gap-3 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${
          error && touched ? "border-red-500 focus:ring-red-500" : "border-gray-300"
        }`}
      >
        {selectedBrand ? (
          <>
            {selectedBrand.logoUrl ? (
              <img
                src={selectedBrand.logoUrl}
                alt={selectedBrand.name}
                className="w-6 h-6 object-contain shrink-0"
              />
            ) : (
              <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium shrink-0">
                {selectedBrand.name.slice(0, 2)}
              </span>
            )}
            <span className="flex-1 text-gray-900">{selectedBrand.name}</span>
          </>
        ) : (
          <span className="flex-1 text-gray-400">Marka seçin</span>
        )}
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
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {brands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => {
                onChange(brand.id);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition ${
                value === brand.id ? "bg-gray-50" : ""
              }`}
            >
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  className="w-6 h-6 object-contain shrink-0"
                />
              ) : (
                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium shrink-0">
                  {brand.name.slice(0, 2)}
                </span>
              )}
              <span className="text-gray-900">{brand.name}</span>
              {value === brand.id && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-black ml-auto shrink-0"
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

      {touched && error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
