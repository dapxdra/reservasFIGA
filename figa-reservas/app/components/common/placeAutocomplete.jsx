"use client";
import { useEffect, useRef, useState } from "react";
import { fetchPlacePredictions } from "@/app/utils/googlePlaces";

export default function PlaceAutocomplete({
  label,
  value,
  onSelect,
  placeholder = "Buscar lugar...",
  required = false,
  name = "",
}) {
  const [text, setText] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => setText(value || ""), [value]);

  const handleChange = async (e) => {
    const v = e.target.value;
    setText(v);
    onSelect(v);
    setSelectedIndex(-1);

    if (!v.trim()) {
      setOpen(false);
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setOpen(true);
    setLoading(true);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const preds = await fetchPlacePredictions(v);
      setSuggestions(preds);
      setLoading(false);
    }, 300);
  };

  const handleSelect = (name) => {
    setText(name);
    onSelect(name);
    setOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex].name);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Auto-scroll del item seleccionado con teclado
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[selectedIndex];
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleBlur = () => {
    setTimeout(() => {
      setOpen(false);
      setSelectedIndex(-1);
    }, 200);
  };

  return (
    <div className="relative">
      {label && (
        <label className="text-sm font-semibold block mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        name={name}
        value={text}
        onChange={handleChange}
        onFocus={() => text.trim() && setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
        type="text"
        required={required}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls="autocomplete-list"
        aria-expanded={open}
        aria-activedescendant={
          selectedIndex >= 0 ? `option-${selectedIndex}` : undefined
        }
      />

      {/* Lista de sugerencias */}
      {open && (
        <ul
          id="autocomplete-list"
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-72 overflow-y-auto overscroll-contain"
        >
          {loading && (
            <li className="px-3 py-2 text-sm text-gray-500 italic">
              Buscando lugares...
            </li>
          )}
          {!loading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500 italic">
              No se encontraron lugares
            </li>
          )}
          {!loading &&
            suggestions.map((s, idx) => (
              <li
                key={`${s.name}-${idx}`}
                id={`option-${idx}`}
                role="option"
                aria-selected={idx === selectedIndex}
                className={`px-3 py-2 cursor-pointer text-sm transition ${
                  idx === selectedIndex
                    ? "bg-blue-100 text-blue-900"
                    : "hover:bg-gray-100"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s.name)}
                onMouseEnter={() => setSelectedIndex(idx)}
                title={s.name}
              >
                {s.name}
              </li>
            ))}
        </ul>
      )}

      <small className="text-gray-500 text-xs block mt-1">
        Escribe y selecciona de la lista (usa ↑ ↓ Enter para seleccionar)
      </small>
    </div>
  );
}
