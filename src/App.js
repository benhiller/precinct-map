import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { createUseStyles } from 'react-jss';
import mapboxgl from 'mapbox-gl';
import bbox from '@turf/bbox';

import Tooltip from './Tooltip';

import precinctDataUrl from './data/precincts2012.txt';
import turnoutDataUrl from './data/turnout.txt';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const LAT = 37.758;
const LONG = -122.444;
const ZOOM = 12;

const COLORS = [
  'rgba(0, 0, 255, 0.75)',
  'rgba(83, 83, 255, 0.75)',
  'rgba(129, 129, 255, 0.75)',
  'rgba(171, 171, 255, 0.75)',
  'rgba(213, 213, 255, 0.75)',
  'rgba(255, 255, 255, 0.75)',
  'rgba(255, 220, 220, 0.75)',
  'rgba(255, 184, 184, 0.75)',
  'rgba(255, 145, 145, 0.75)',
  'rgba(255, 99, 99, 0.75)',
  'rgba(255, 0, 0, 0.75)',
];

const THRESHOLDS = [-25, -20, -15, -10, -1, 1, 10, 15, 20, 25];
const TURNOUT_THRESHOLDS = [-1, -1, -1, -1, -1, -1, 40, 50, 60, 70];

const DEFAULT_CONTEST = 'President - DEM';

const useStyles = createUseStyles({
  app: {},
  contestControl: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: '1 !important',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
  },
});

const computeOverallResults = (turnoutData, contest) => {
  const results = {};
  for (const precinct of Object.keys(turnoutData)) {
    if (contest in turnoutData[precinct]) {
      for (const candidate of Object.keys(turnoutData[precinct][contest])) {
        if (candidate in results) {
          results[candidate] += turnoutData[precinct][contest][candidate];
        } else {
          results[candidate] = turnoutData[precinct][contest][candidate];
        }
      }
    }
  }
  return results;
};

function App() {
  const classes = useStyles();
  const [contest, setContest] = useState(DEFAULT_CONTEST);
  const [map, setMap] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [tooltipPrecinct, setTooltipPrecinct] = useState(null);
  const [turnoutData, setTurnoutData] = useState(null);
  const [fetchingTurnoutData, setFetchingTurnoutData] = useState(false);
  const [precinctData, setPrecinctData] = useState(null);
  const [fetchingPrecinctData, setFetchingPrecinctData] = useState(false);
  const [tooltipContainer, setTooltipContainer] = useState(null);
  const [tooltipMarker, setTooltipMarker] = useState(null);
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
      let tooltipTurnoutData;
      if (tooltipPrecinct) {
        tooltipTurnoutData = turnoutData[tooltipPrecinct];
      }

      if (
        tooltipTurnoutData &&
        (contest in tooltipTurnoutData || contest === 'Turnout')
      ) {
        ReactDOM.render(
          React.createElement(Tooltip, {
            precinct: tooltipPrecinct,
            turnoutData: tooltipTurnoutData,
            contest: contest,
            onResize: ({ bounds }) => {
              tooltipMarker.setOffset([
                0,
                -(bounds.height / window.devicePixelRatio + 10),
              ]);
            },
          }),
          tooltipContainer,
        );
      } else {
        ReactDOM.unmountComponentAtNode(tooltipContainer);
      }
    }
  }, [turnoutData, tooltipContainer, tooltipPrecinct, tooltipMarker, contest]);

  useEffect(() => {
    const tooltipDiv = document.createElement('div');

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [LONG, LAT],
      zoom: ZOOM,
    });

    const tooltip = new mapboxgl.Marker(tooltipDiv, {
      offset: [0, 0],
    })
      .setLngLat([0, 0])
      .addTo(map);

    map.on('mousemove', e => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['precinct-borders'],
      });
      const filteredFeature = features.filter(f => f.source === 'precincts')[0];
      if (filteredFeature) {
        const [minX /* minY */, , maxX, maxY] = bbox(filteredFeature.geometry);
        tooltip.setLngLat([(minX + maxX) / 2.0, maxY]);
      }
      setTooltipPrecinct(
        filteredFeature && filteredFeature.properties['PREC_2012'],
      );
    });

    map.on('load', () => {
      setMapLoaded(true);
    });

    setMap(map);
    setTooltipContainer(tooltipDiv);
    setTooltipMarker(tooltip);
  }, []);

  useEffect(() => {
    if (!mapLoaded) {
      return;
    }
    if (!precinctData) {
      return;
    }

    map.addSource('precincts', {
      type: 'geojson',
      data: precinctData,
    });

    map.addLayer({
      id: 'precinct-borders',
      type: 'fill',
      source: 'precincts',
      paint: {
        'fill-color': '#fff',
      },
      filter: ['==', '$type', 'Polygon'],
    });

    map.addLayer({
      id: 'tooltip-precinct-border',
      type: 'line',
      source: 'precincts',
      filter: ['==', 'PREC_2012', '0'],
      visibility: 'none',
      paint: {
        'line-width': 3,
      },
    });

    setMapInitialized(true);
  }, [precinctData, map, mapLoaded]);

  useEffect(() => {
    if (!mapInitialized) {
      return;
    }

    if (!tooltipPrecinct) {
      map.setLayoutProperty('tooltip-precinct-border', 'visibility', 'none');
    } else {
      map.setLayoutProperty('tooltip-precinct-border', 'visibility', 'visible');
      map.setFilter('tooltip-precinct-border', [
        '==',
        'PREC_2012',
        tooltipPrecinct,
      ]);
    }
  }, [mapInitialized, map, tooltipPrecinct]);

  useEffect(() => {
    if (!mapInitialized) {
      return;
    }

    if (!precinctData) {
      return;
    }

    if (!turnoutData) {
      return;
    }

    const expression = ['match', ['get', 'PREC_2012']];

    const overallResults = computeOverallResults(turnoutData, contest);
    const topCandidates = [];
    for (const candidate of Object.keys(overallResults)) {
      const votes = overallResults[candidate];
      if (topCandidates.length < 2) {
        topCandidates.push({ candidate, votes });
      } else {
        if (votes > topCandidates[0].votes) {
          if (topCandidates[0].votes > topCandidates[1].votes) {
            topCandidates[1] = topCandidates[0];
          }
          topCandidates[0] = { candidate, votes };
        } else if (votes > topCandidates[1].votes) {
          if (topCandidates[1].votes > topCandidates[0].votes) {
            topCandidates[0] = topCandidates[1];
          }
          topCandidates[1] = { candidate, votes };
        }
      }
    }

    for (let idx in precinctData.features) {
      const precinct = precinctData.features[idx];
      if (!precinct['properties']['PREC_2012']) {
        console.log('no precinct', precinct);
        continue;
      }
      const precinctTurnoutData =
        turnoutData[precinct['properties']['PREC_2012']];
      if (!precinctTurnoutData) {
        console.log('no turnout data', precinct);
        continue;
      } else if (contest !== 'Turnout' && !(contest in precinctTurnoutData)) {
        continue;
      }

      let margin;
      let thresholds;
      if (contest === 'Turnout') {
        margin =
          (precinctTurnoutData.ballotsCast /
            precinctTurnoutData.registeredVoters) *
          100;
        thresholds = TURNOUT_THRESHOLDS;
      } else {
        const candidate0Votes =
          precinctTurnoutData[contest][topCandidates[0].candidate];
        const candidate1Votes =
          precinctTurnoutData[contest][topCandidates[1].candidate];
        const totalVotes = Object.keys(precinctTurnoutData[contest]).reduce(
          (total, candidate) => total + precinctTurnoutData[contest][candidate],
          0,
        );
        // TODO: Need to check logic makes sense here
        margin = ((candidate0Votes - candidate1Votes) / totalVotes) * 100;
        thresholds = THRESHOLDS;
      }

      let color;
      for (let i = 0; i < thresholds.length; i++) {
        if (margin <= thresholds[i]) {
          color = COLORS[i];
          break;
        }
        if (i === thresholds.length - 1) {
          color = COLORS[i + 1];
        }
      }

      expression.push(precinct['properties']['PREC_2012'], color);
    }

    expression.push('rgba(0,0,0,0)');

    map.setPaintProperty('precinct-borders', 'fill-color', expression);
  }, [map, mapInitialized, precinctData, turnoutData, contest]);

  let contests = [];
  if (turnoutData) {
    contests = Object.keys(turnoutData[Object.keys(turnoutData)[0]]).filter(
      c => !(c === 'registeredVoters' || c === 'ballotsCast'),
    );
  }
  contests.unshift('Turnout');

  return (
    <div className={classes.app}>
      <div className={classes.contestControl}>
        <select onChange={e => setContest(e.target.value)} value={contest}>
          {contests.map(innerContest => (
            <option key={innerContest} value={innerContest}>
              {innerContest}
            </option>
          ))}
        </select>
      </div>
      <div className={classes.mapContainer} ref={mapContainerRef} />
    </div>
  );
}

export default App;
