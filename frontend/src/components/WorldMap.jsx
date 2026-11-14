import { useEffect, useMemo, useRef, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { MAP_HEIGHT, MAP_SCALE, MAP_WIDTH, cca3ForFeature, colorFor, worldFeatures } from '../lib/geo';

const WORLD = { coordinates: [12, 8], zoom: 1 };
const collection = { type: 'FeatureCollection', features: worldFeatures };
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export default function WorldMap({ byCcn3, byCode, selected, capital, onSelect, focus }) {
  const [position, setPosition] = useState(WORLD);
  const [tooltip, setTooltip] = useState(null);
  const posRef = useRef(position);
  const frame = useRef(0);
  const wrapRef = useRef(null);
  const handlers = useRef({});
  posRef.current = position;
  handlers.current = { onSelect, byCcn3, byCode };

  const flyTo = (target) => {
    cancelAnimationFrame(frame.current);
    const from = posRef.current;
    const start = performance.now();
    const duration = 900;
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const k = easeInOut(t);
      // Interpolate zoom geometrically so the motion feels uniform.
      const zoom = from.zoom * (target.zoom / from.zoom) ** k;
      const coordinates = [
        from.coordinates[0] + (target.coordinates[0] - from.coordinates[0]) * k,
        from.coordinates[1] + (target.coordinates[1] - from.coordinates[1]) * k,
      ];
      setPosition({ coordinates, zoom });
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    if (!focus) return;
    flyTo(focus.center ? { coordinates: focus.center, zoom: focus.zoom } : WORLD);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  useEffect(() => setTooltip(null), [selected]);

  const zoomBy = (factor) => {
    const p = posRef.current;
    flyTo({ coordinates: p.coordinates, zoom: Math.min(Math.max(p.zoom * factor, 1), 40) });
  };

  const geographies = useMemo(
    () => (
      <Geographies geography={collection}>
        {({ geographies: geos }) =>
          geos.map((geo, i) => {
            const code = cca3ForFeature(geo, byCcn3);
            const isSelected = selected && code === selected;
            const dim = selected && !isSelected;
            const fill = colorFor(i);
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                className={`country${isSelected ? ' selected' : ''}${dim ? ' dim' : ''}`}
                onMouseMove={(e) => {
                  const rect = wrapRef.current.getBoundingClientRect();
                  const c = code && handlers.current.byCode.get(code);
                  setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, name: c?.name || geo.properties.name, flag: c?.flag, capital: c?.capital });
                }}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => code && handlers.current.onSelect(code, geo)}
                style={{
                  default: { fill, outline: 'none' },
                  hover: { fill, outline: 'none', filter: 'brightness(1.12) saturate(1.2)', cursor: code ? 'pointer' : 'default' },
                  pressed: { fill, outline: 'none' },
                }}
              />
            );
          })
        }
      </Geographies>
    ),
    [byCcn3, selected]
  );

  const z = position.zoom;

  return (
    <div className="map-wrap" ref={wrapRef}>
      <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: MAP_SCALE }} width={MAP_WIDTH} height={MAP_HEIGHT} className="world-map">
        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          minZoom={1}
          maxZoom={40}
          onMoveStart={() => cancelAnimationFrame(frame.current)}
          onMoveEnd={(p) => setPosition(p)}
        >
          {geographies}
          {capital?.latlng && (
            <Marker coordinates={[capital.latlng[1], capital.latlng[0]]}>
              <circle r={9 / z} className="capital-pulse" />
              <circle r={4 / z} className="capital-dot" strokeWidth={1.5 / z} />
              <text y={-10 / z} textAnchor="middle" className="capital-label" style={{ fontSize: 13 / z, strokeWidth: 3 / z }}>
                ★ {capital.name}
              </text>
            </Marker>
          )}
        </ZoomableGroup>
      </ComposableMap>

      {tooltip && (
        <div className="map-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <span className="flag">{tooltip.flag}</span>
          <div>
            <strong>{tooltip.name}</strong>
            {tooltip.capital && <small>Capital: {tooltip.capital}</small>}
          </div>
        </div>
      )}

      <div className="zoom-controls">
        <button onClick={() => zoomBy(1.8)} aria-label="Zoom in">+</button>
        <button onClick={() => zoomBy(1 / 1.8)} aria-label="Zoom out">−</button>
        <button onClick={() => flyTo(WORLD)} aria-label="Reset view" title="Whole world">⟲</button>
      </div>
    </div>
  );
}
