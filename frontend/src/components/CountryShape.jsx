import { useMemo } from 'react';
import { geoAzimuthalEqualArea, geoCentroid, geoPath } from 'd3-geo';
import { mainLand } from '../lib/geo';

const W = 260;
const H = 170;

export default function CountryShape({ feature, capitalLatLng, color }) {
  const { d, capital } = useMemo(() => {
    if (!feature) return {};
    const main = mainLand(feature);
    const [lon, lat] = geoCentroid(main);
    const proj = geoAzimuthalEqualArea().rotate([-lon, -lat]).fitExtent([[14, 14], [W - 14, H - 14]], main);
    const path = geoPath(proj);
    return { d: path(feature), capital: capitalLatLng ? proj([capitalLatLng[1], capitalLatLng[0]]) : null };
  }, [feature, capitalLatLng]);

  if (!d) return null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="country-shape" role="img" aria-label="Country outline">
      <defs>
        <linearGradient id="shapeFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#845ef7" />
        </linearGradient>
        <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="rgba(255,255,255,0.06)" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />
      <path d={d} fill="url(#shapeFill)" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
      {capital && (
        <g transform={`translate(${capital[0]},${capital[1]})`}>
          <circle r="7" fill="rgba(255,212,59,0.35)" />
          <circle r="3.5" fill="#ffd43b" stroke="#1a1b3a" strokeWidth="1.2" />
        </g>
      )}
    </svg>
  );
}
