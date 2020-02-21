import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { createUseStyles } from 'react-jss';
import mapboxgl from 'mapbox-gl';

import Tooltip from './Tooltip';

import precinctDataUrl from './data/precincts2012.txt';
import turnoutDataUrl from './data/turnout.txt';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const LAT = 37.758;
const LONG = -122.444;
const ZOOM = 12;

const useStyles = createUseStyles({
  app: {},
  mapContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
  },
});

function App() {
  const classes = useStyles();
  const [map, setMap] = useState(null);
  const [tooltipPrecinct, setTooltipPrecinct] = useState(null);
  const [turnoutData, setTurnoutData] = useState(null);
  const [fetchingTurnoutData, setFetchingTurnoutData] = useState(false);
  // const [turnoutDataStats, setTurnoutDataStats] = useState({ maxTurnout: 0, minTurnout: 0});
  const [precinctData, setPrecinctData] = useState(null);
  const [fetchingPrecinctData, setFetchingPrecinctData] = useState(false);
  const [tooltipContainer, setTooltipContainer] = useState(null);
  const mapContainerRef = useRef();

  useEffect(() => {
    if (fetchingTurnoutData) {
      return;
    }

    setFetchingTurnoutData(true);
    fetch(turnoutDataUrl)
      .then(response => response.text())
      .then(text => {
        const turnoutData = JSON.parse(text);
        setTurnoutData(turnoutData);

        // let maxTurnout = 0;
        // let minTurnout = 1;

        // for (const precinctNum of Object.keys(turnoutData)) {
        //   const turnout =
        //     turnoutData[precinctNum]['ballots_cast'] /
        //     turnoutData[precinctNum]['total_voters'];
        //   if (turnout > maxTurnout) {
        //     maxTurnout = turnout;
        //   }
        //   if (turnout < minTurnout) {
        //     minTurnout = turnout;
        //   }
        // }

        // setTurnoutDataStats({ minTurnout, maxTurnout });
      });
  }, [fetchingTurnoutData]);

  useEffect(() => {
    if (fetchingPrecinctData) {
      return;
    }

    setFetchingPrecinctData(true);
    fetch(precinctDataUrl)
      .then(response => response.text())
      .then(text => {
        const precinctData = JSON.parse(text);
        setPrecinctData(precinctData);
      });
  }, [fetchingPrecinctData]);

  useEffect(() => {
    if (tooltipContainer) {
      if (tooltipPrecinct) {
        const tooltipPrecinctNum = tooltipPrecinct.properties['PREC_2012'];
        const tooltipTurnoutData = turnoutData[tooltipPrecinctNum];
        ReactDOM.render(
          React.createElement(Tooltip, {
            precinctData: tooltipPrecinct,
            turnoutData: tooltipTurnoutData,
          }),
          tooltipContainer,
        );
      } else {
        ReactDOM.unmountComponentAtNode(tooltipContainer);
      }
    }
  }, [turnoutData, tooltipContainer, tooltipPrecinct]);

  useEffect(() => {
    if (!tooltipContainer) {
      setTooltipContainer(document.createElement('div'));
    }
  }, [tooltipContainer]);

  useEffect(() => {
    const initializeMap = (setMap, mapContainerRef) => {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/light-v10',
        center: [LONG, LAT],
        zoom: ZOOM,
      });

      setMap(map);
    };

    if (!map) {
      initializeMap(setMap, mapContainerRef);
    }
  }, [map, tooltipContainer]);

  useEffect(() => {
    if (!map) {
      return;
    }

    if (!precinctData) {
      return;
    }

    if (!turnoutData) {
      return;
    }

    if (!tooltipContainer) {
      return;
    }

    const tooltip = new mapboxgl.Marker(tooltipContainer, {
      offset: [0, -70],
    })
      .setLngLat([0, 0])
      .addTo(map);

    map.on('mousemove', e => {
      const features = map.queryRenderedFeatures(e.point);
      const filteredFeature = features.filter(f => f.source === 'precincts')[0];
      tooltip.setLngLat(e.lngLat);
      setTooltipPrecinct(filteredFeature);
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
        const precinctTurnoutData =
          turnoutData[precinct['properties']['PREC_2012']];
        let color;
        if (!precinctTurnoutData) {
          console.log('no turnout data', precinct);
          continue;
        } else if (precinctTurnoutData['total_voters'] === 0) {
          continue;
        }

        const bernieVotes =
          precinctTurnoutData['President - DEM']['BERNIE SANDERS'];
        const hillaryVotes =
          precinctTurnoutData['President - DEM']['HILLARY CLINTON'];
        const margin =
          (bernieVotes - hillaryVotes) / (bernieVotes + hillaryVotes);
        // const turnout = precinctTurnoutData['ballots_cast'] / precinctTurnoutData['total_voters'];
        // const adjustedTurnout = (turnout - minTurnout) / (maxTurnout - minTurnout);
        // var green = adjustedTurnout * 255;
        const green = 0;
        const red = margin > 0 ? Math.floor((margin / 0.5) * 255, 255) : 0;
        const blue = margin < 0 ? Math.floor((margin / 0.5) * -255, 255) : 0;
        color = 'rgba(' + red + ', ' + green + ', ' + blue + ', 0.75)';
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
  }, [map, precinctData, turnoutData, tooltipContainer]);

  return (
    <div className={classes.app}>
      <div className={classes.mapContainer} ref={mapContainerRef} />
    </div>
  );
}

export default App;
