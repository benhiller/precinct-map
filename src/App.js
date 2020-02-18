import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom'
import mapboxgl from 'mapbox-gl';

import './App.css';

import Tooltip from './Tooltip';

import precinctData from './precincts2012.json';
import turnoutData from './turnout.json';

const LAT = 37.758;
const LONG = -122.444;
const ZOOM = 12

function App() {
  const [map, setMap] = useState(null);
  const [tooltipContainer, setTooltipContainer] = useState(null);
  const mapContainerRef = useRef();

  const setTooltip = useCallback((precinctData) => {
    if (precinctData) {
      ReactDOM.render(
        React.createElement(
          Tooltip, {
            precinctData,
          }
        ),
        tooltipContainer
      );
    } else {
      ReactDOM.unmountComponentAtNode(tooltipContainer);
    }
  }, [tooltipContainer]);

  useEffect(() => {
    if (!tooltipContainer) {
      setTooltipContainer(document.createElement('div'));
    }
  }, [tooltipContainer]);

  useEffect(() => {
    const initializeMap = ((setMap, mapContainerRef) => {
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

        const expression = ['match', ['get', 'PREC_2012']];

        for (let idx in precinctData.features) {
          const precinct = precinctData.features[idx];
          if (!precinct['properties']['PREC_2012']) {
            console.log('no precinct', precinct);
            continue;
          }
          const precinctTurnoutData = turnoutData[precinct['properties']['PREC_2012']];
          let color;
          if (!precinctTurnoutData) {
            color = 'rgba(255,0,0,0.75)';
            console.log('no turnout data', precinct);
          } else if (precinctTurnoutData['total_voters'] === 0) {
            color = 'rgba(0,0,255,0.75)';
          } else {
            var green = (1 - (precinctTurnoutData['ballots_cast'] / precinctTurnoutData['total_voters'])) * 255;
            color = 'rgba(' + 0 + ', ' + green + ', ' + 0 + ', 0.75)';
          }
          expression.push(precinct['properties']['PREC_2012'], color);
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

      const tooltip = new mapboxgl.Marker(tooltipContainer, {
        offset: [0, -20],
      }).setLngLat([0,0]).addTo(map);

      map.on('mousemove', (e) => {
        const features = map.queryRenderedFeatures(e.point);
        const filteredFeature = features.filter(f => (
          f.source === 'precincts'
        ))[0];
        tooltip.setLngLat(e.lngLat);
        setTooltip(filteredFeature);
      });
    });

    if (!map) {
      initializeMap(setMap, mapContainerRef);
    }
  }, [map, tooltipContainer, setTooltip]);

  return (
    <div className="app">
      <div className="mapContainer" ref={mapContainerRef} />
    </div>
  );
}

export default App;
