// Coordenadas fijas de lugares frecuentes y del garage (sin dependencias externas).

export const GARAGE_COORDS = {
  lat: 10.445556,
  lng: -84.570444,
};

export const KNOWN_PLACE_COORDS = {
  sjo:                         { lat: 9.9981657,  lng: -84.2047605 },
  lir:                         { lat: 10.5933,    lng: -85.5444 },
  planet_hollywood_papagayo:   { lat: 10.5839,    lng: -85.6731 },
  four_seasons_papagayo:       { lat: 10.5932,    lng: -85.6637 },
  andaz_papagayo:              { lat: 10.5879,    lng: -85.6628 },
  secrets_papagayo:            { lat: 10.5822,    lng: -85.6721 },
  riu_guanacaste:              { lat: 10.5792,    lng: -85.7058 },
  riu_palace_costarica:        { lat: 10.5773,    lng: -85.7065 },
  arenal_kioro:                { lat: 10.4827,    lng: -84.7012 },
  arenal_observatory:          { lat: 10.4614,    lng: -84.7128 },
  nayara_springs:              { lat: 10.4872,    lng: -84.6998 },
  tabacon_grand_spa:           { lat: 10.4891,    lng: -84.7183 },
  lomas_del_volcan:            { lat: 10.4861,    lng: -84.5872 },
  la_fortuna_center:           { lat: 10.4693,    lng: -84.6432 },
  monteverde_center:           { lat: 10.3018,    lng: -84.8266 },
  santa_elena_monteverde:      { lat: 10.3267,    lng: -84.8293 },
  jaco_center:                 { lat: 9.6142,     lng: -84.6285 },
  manuel_antonio:              { lat: 9.3908,     lng: -84.1517 },
  quepos:                      { lat: 9.4325,     lng: -84.1638 },
  liberia_center:              { lat: 10.6300,    lng: -85.4408 },
  tamarindo:                   { lat: 10.2994,    lng: -85.8447 },
  flamingo:                    { lat: 10.4328,    lng: -85.7884 },
  potrero:                     { lat: 10.4381,    lng: -85.7759 },
  playa_hermosa_guanacaste:    { lat: 10.5744,    lng: -85.7011 },
  nosara:                      { lat: 9.9789,     lng: -85.6530 },
  samara:                      { lat: 9.8782,     lng: -85.5286 },
  dominical:                   { lat: 9.2459,     lng: -83.8601 },
  uvita:                       { lat: 9.1636,     lng: -83.7342 },
  san_jose_center:             { lat: 9.9281,     lng: -84.0907 },
};

export function geocodeKnownPlace(rawText) {
  const n = String(rawText || "").trim().toLowerCase();
  if (!n) return null;

  // Airports
  if (/\bsjo\b/.test(n) || /aeropuerto\s+(internacional\s+)?juan\s+santamaria/.test(n))
    return KNOWN_PLACE_COORDS.sjo;
  if (/\blir\b/.test(n) || /aeropuerto\s+(internacional\s+)?daniel\s+oduber/.test(n))
    return KNOWN_PLACE_COORDS.lir;

  // Papagayo resorts
  if (/planet\s+hollywood/.test(n) || /royalton/.test(n))
    return KNOWN_PLACE_COORDS.planet_hollywood_papagayo;
  if (/four\s+seasons.*papagayo/.test(n) || /papagayo.*four\s+seasons/.test(n))
    return KNOWN_PLACE_COORDS.four_seasons_papagayo;
  if (/andaz.*papagayo/.test(n) || /papagayo.*andaz/.test(n))
    return KNOWN_PLACE_COORDS.andaz_papagayo;
  if (/secrets.*papagayo/.test(n))
    return KNOWN_PLACE_COORDS.secrets_papagayo;
  if (/riu\s+palace\s+costa\s+rica/.test(n) || /riu\s+palace.*guanacaste/.test(n))
    return KNOWN_PLACE_COORDS.riu_palace_costarica;
  if (/\briu\b.*guanacaste/.test(n) || /guanacaste.*\briu\b/.test(n))
    return KNOWN_PLACE_COORDS.riu_guanacaste;
  // Generic Peninsula Papagayo fallback
  if (/peninsula\s+papagayo/.test(n))
    return KNOWN_PLACE_COORDS.planet_hollywood_papagayo;

  // Arenal / La Fortuna area
  if (/kioro/.test(n))
    return KNOWN_PLACE_COORDS.arenal_kioro;
  if (/arenal\s+observatory/.test(n))
    return KNOWN_PLACE_COORDS.arenal_observatory;
  if (/nayara/.test(n))
    return KNOWN_PLACE_COORDS.nayara_springs;
  if (/tabacon/.test(n))
    return KNOWN_PLACE_COORDS.tabacon_grand_spa;
  if (/lomas\s+del\s+volcan/.test(n))
    return KNOWN_PLACE_COORDS.lomas_del_volcan;
  if (/la\s+fortuna/.test(n))
    return KNOWN_PLACE_COORDS.la_fortuna_center;

  // Monteverde
  if (/santa\s+elena.*monteverde/.test(n) || /monteverde.*santa\s+elena/.test(n))
    return KNOWN_PLACE_COORDS.santa_elena_monteverde;
  if (/monteverde/.test(n))
    return KNOWN_PLACE_COORDS.monteverde_center;

  // Pacific coast
  if (/manuel\s+antonio/.test(n))
    return KNOWN_PLACE_COORDS.manuel_antonio;
  if (/quepos/.test(n))
    return KNOWN_PLACE_COORDS.quepos;
  if (/\bjaco\b/.test(n))
    return KNOWN_PLACE_COORDS.jaco_center;
  if (/dominical/.test(n))
    return KNOWN_PLACE_COORDS.dominical;
  if (/uvita/.test(n))
    return KNOWN_PLACE_COORDS.uvita;

  // Guanacaste beaches
  if (/tamarindo/.test(n))
    return KNOWN_PLACE_COORDS.tamarindo;
  if (/flamingo/.test(n))
    return KNOWN_PLACE_COORDS.flamingo;
  if (/potrero/.test(n))
    return KNOWN_PLACE_COORDS.potrero;
  if (/playa\s+hermosa.*guanacaste/.test(n) || /hermosa.*liberia/.test(n))
    return KNOWN_PLACE_COORDS.playa_hermosa_guanacaste;
  if (/nosara/.test(n))
    return KNOWN_PLACE_COORDS.nosara;
  if (/samara/.test(n))
    return KNOWN_PLACE_COORDS.samara;
  if (/liberia/.test(n))
    return KNOWN_PLACE_COORDS.liberia_center;

  return null;
}
