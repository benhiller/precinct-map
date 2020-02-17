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

      const expression = ['match', ['get', 'PREC_2019']];

      for (let idx in precinctData.features) {
        const precinct = precinctData.features[idx];
        if (!precinct['properties']['PREC_2019']) {
          console.log(precinct);
          continue;
        }
        var green = Math.random() * 255;
        var color = 'rgba(' + 0 + ', ' + green + ', ' + 0 + ', 1)';
        expression.push(precinct['properties']['PREC_2019'], color);
      }

      expression.push('rgba(0,0,0,0)');

      map.addLayer({
        id: 'precinct-borders',
        type: 'fill',
        source: 'precincts',
        paint: {
          'fill-color': expression,
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
