const COMMON_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.8,
};

const ICONS = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" {...COMMON_PROPS} />
      <path d="M16 16l4 4" {...COMMON_PROPS} />
    </>
  ),
  filter: <path d="M4 5h16l-6.8 7.5v5.5l-2.4 1.5v-7L4 5z" {...COMMON_PROPS} />,
  fileText: (
    <>
      <path d="M8 3.5h6l4 4V20H8z" {...COMMON_PROPS} />
      <path d="M14 3.5V8h4" {...COMMON_PROPS} />
      <path d="M10.5 11.5h5" {...COMMON_PROPS} />
      <path d="M10.5 15h5" {...COMMON_PROPS} />
    </>
  ),
  download: (
    <>
      <path d="M12 4.5v10" {...COMMON_PROPS} />
      <path d="M8.5 11l3.5 3.5 3.5-3.5" {...COMMON_PROPS} />
      <path d="M5 19.5h14" {...COMMON_PROPS} />
    </>
  ),
  trash: (
    <>
      <path d="M5 7.5h14" {...COMMON_PROPS} />
      <path d="M9 7.5V5h6v2.5" {...COMMON_PROPS} />
      <path d="M7.5 7.5l1 12h7l1-12" {...COMMON_PROPS} />
      <path d="M10 11v5" {...COMMON_PROPS} />
      <path d="M14 11v5" {...COMMON_PROPS} />
    </>
  ),
  undo: (
    <>
      <path d="M9 7L4.5 11.5 9 16" {...COMMON_PROPS} />
      <path d="M5.5 11.5H14a5.5 5.5 0 110 11h-2" {...COMMON_PROPS} />
    </>
  ),
  arrowRightCircle: (
    <>
      <circle cx="12" cy="12" r="9" {...COMMON_PROPS} />
      <path d="M10 8.5l3.5 3.5L10 15.5" {...COMMON_PROPS} />
      <path d="M9 12h5" {...COMMON_PROPS} />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" {...COMMON_PROPS} />
      <path d="M5 12h14" {...COMMON_PROPS} />
    </>
  ),
  power: (
    <>
      <path d="M12 3.5v8" {...COMMON_PROPS} />
      <path d="M7 6.5a7 7 0 1010 0" {...COMMON_PROPS} />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" {...COMMON_PROPS} />
      <path d="M4 12h16" {...COMMON_PROPS} />
      <path d="M4 17h16" {...COMMON_PROPS} />
    </>
  ),
  pencil: (
    <>
      <path d="M5 19l3.5-.8L18 8.7 14.3 5 4.8 14.5 4 18z" {...COMMON_PROPS} />
      <path d="M12.8 6.5l3.7 3.7" {...COMMON_PROPS} />
    </>
  ),
  circleDot: (
    <>
      <circle cx="12" cy="12" r="7" {...COMMON_PROPS} />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  mapPin: (
    <>
      <path d="M12 20s6-5.6 6-10a6 6 0 10-12 0c0 4.4 6 10 6 10z" {...COMMON_PROPS} />
      <circle cx="12" cy="10" r="2" {...COMMON_PROPS} />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" {...COMMON_PROPS} />
      <path d="M12 8v4.5l3 1.5" {...COMMON_PROPS} />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="9" r="2.5" {...COMMON_PROPS} />
      <circle cx="16" cy="10" r="2" {...COMMON_PROPS} />
      <path d="M4.5 18a4.5 4.5 0 019 0" {...COMMON_PROPS} />
      <path d="M13 18a3.5 3.5 0 017 0" {...COMMON_PROPS} />
    </>
  ),
  car: (
    <>
      <path d="M6.5 16.5L8 11h8l1.5 5.5" {...COMMON_PROPS} />
      <path d="M5 16.5h14" {...COMMON_PROPS} />
      <path d="M7.5 16.5v2" {...COMMON_PROPS} />
      <path d="M16.5 16.5v2" {...COMMON_PROPS} />
      <circle cx="8" cy="16.5" r="1.5" {...COMMON_PROPS} />
      <circle cx="16" cy="16.5" r="1.5" {...COMMON_PROPS} />
    </>
  ),
  check: <path d="M5.5 12.5l4 4L18.5 7" {...COMMON_PROPS} />,
  settings: (
    <>
      <circle cx="12" cy="12" r="2.6" {...COMMON_PROPS} />
      <path d="M12 4.5v2" {...COMMON_PROPS} />
      <path d="M12 17.5v2" {...COMMON_PROPS} />
      <path d="M4.5 12h2" {...COMMON_PROPS} />
      <path d="M17.5 12h2" {...COMMON_PROPS} />
      <path d="M6.7 6.7l1.4 1.4" {...COMMON_PROPS} />
      <path d="M15.9 15.9l1.4 1.4" {...COMMON_PROPS} />
      <path d="M6.7 17.3l1.4-1.4" {...COMMON_PROPS} />
      <path d="M15.9 8.1l1.4-1.4" {...COMMON_PROPS} />
    </>
  ),
  mail: (
    <>
      <path d="M4.5 7.5h15v9h-15z" {...COMMON_PROPS} />
      <path d="M5.5 8.5l6.5 5 6.5-5" {...COMMON_PROPS} />
    </>
  ),
};

export default function DashboardIcon({ name, size = 18, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
    >
      {ICONS[name] || null}
    </svg>
  );
}
