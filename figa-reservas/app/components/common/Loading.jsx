"use client";
export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/95 z-50">
      <div className="flex flex-col items-center gap-3">
        <svg
          className="animate-spin h-10 w-10 text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          ></path>
        </svg>
        <div className="text-lg font-medium text-gray-800">Cargando…</div>
      </div>
    </div>
  );
}
