"use client";

import { useState, useRef, useEffect } from "react";

type ModelSelectProps = {
  models: string[];
  value: string;
  onChange: (model: string) => void;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export default function ModelSelect({
  models,
  value,
  onChange,
  error,
  touched,
  disabled = false,
  placeholder = "Model seçin",
}: ModelSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full border rounded-lg px-4 py-2.5 text-left flex items-center justify-between bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition ${
          error && touched ? "border-red-500 focus:ring-red-500" : "border-gray-300"
        } ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-400" : "text-gray-900"}`}
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value || placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""} ${disabled ? "opacity-50" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {models.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Model bulunamadı
            </div>
          ) : (
            models.map((model) => (
              <button
                key={model}
                type="button"
                onClick={() => {
                  onChange(model);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition ${
                  value === model ? "bg-gray-50" : ""
                }`}
              >
                <span className="text-gray-900">{model}</span>
                {value === model && (
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
            ))
          )}
        </div>
      )}

      {touched && error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
