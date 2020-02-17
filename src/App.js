import React, { useEffect, useRef } from 'react';
import './App.css';

import mapboxgl from 'mapbox-gl';

import precinctData from './precincts.json';

const LAT = 37.758;
const LONG = -122.444;
const ZOOM = 12

function App() {
  const mapContainerRef = useRef();

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [LONG, LAT],
      zoom: ZOOM,
    });

    map.on('load', function() {
      map.addSource('precincts', {
        type: 'geojson',
        data: precinctData,
      });

      map.addLayer({
        id: 'precinct-borders',
        type: 'line',
        source: 'precincts',
        paint: {
          'line-color': '#888',
          'line-opacity': 0.4,
        },
        filter: ['==', '$type', 'Polygon'],
      });
    });
  });

  return (
    <div className="app">
      <div className="mapContainer" ref={mapContainerRef} />
    </div>
  );
}

export default App;
