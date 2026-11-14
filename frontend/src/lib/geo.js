import { feature } from 'topojson-client';
import { geoEqualEarth, geoPath, geoArea, geoCentroid, geoDistance } from 'd3-geo';
import topology from 'world-atlas/countries-50m.json';

export const MAP_WIDTH = 980;
export const MAP_HEIGHT = 520;
export const MAP_SCALE = 175;

const NAME_TO_CCA3 = { Kosovo: 'UNK', Somaliland: 'SOM', 'N. Cyprus': 'CYP', 'Siachen Glacier': 'IND', 'Indian Ocean Ter.': 'AUS' };

export const projection = geoEqualEarth().scale(MAP_SCALE).translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
const path = geoPath(projection);

export const worldFeatures = feature(topology, topology.objects.countries).features.filter((f) => f.properties.name !== 'Antarctica');

// Golden-angle hue spacing gives each country a distinct, vivid color.
export function colorFor(index) {
  const hue = (index * 137.508 + 12) % 360;
  const sat = 62 + ((index * 7) % 3) * 8;
  const light = 60 + ((index * 11) % 3) * 5;
  return `hsl(${hue.toFixed(1)} ${sat}% ${light}%)`;
}

export function cca3ForFeature(f, byCcn3) {
  return byCcn3.get(f.id)?.cca3 || NAME_TO_CCA3[f.properties.name] || null;
}

// The main landmass plus sizeable nearby parts, skipping remote territories and specks
// (e.g. Alaska for the USA, French Guiana for France, tiny Pacific islets for Japan).
export function mainLand(f) {
  if (f.geometry.type !== 'MultiPolygon') return f;
  const parts = f.geometry.coordinates.map((coords) => {
    const part = { type: 'Feature', geometry: { type: 'Polygon', coordinates: coords } };
    return { coords, area: geoArea(part), centroid: geoCentroid(part) };
  });
  const largest = parts.reduce((a, b) => (b.area > a.area ? b : a));
  const keep = parts.filter(
    (p) => p === largest || (p.area >= largest.area * 0.03 && geoDistance(p.centroid, largest.centroid) < 0.3)
  );
  return { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: keep.map((p) => p.coords) } };
}

// Center + zoom that frames a country's main landmass in the map viewport.
// leftCover is the fraction of the viewport width hidden by the side panel.
export function frameFeature(f, leftCover = 0) {
  const main = mainLand(f);
  const [[x0, y0], [x1, y1]] = path.bounds(main);
  const dx = Math.max(x1 - x0, 4);
  const dy = Math.max(y1 - y0, 4);
  const visible = 1 - leftCover;
  const zoom = Math.min(Math.max(0.5 / Math.max(dx / (MAP_WIDTH * visible), dy / MAP_HEIGHT), 1.5), 40);
  const shift = (leftCover * MAP_WIDTH) / 2 / zoom;
  const center = projection.invert([(x0 + x1) / 2 - shift, (y0 + y1) / 2]) || geoCentroid(main);
  return { center, zoom };
}
