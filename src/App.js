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

const CONTEST = 'President - DEM';

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

const computeOverallResults = (turnoutData, contest) => {
  const results = {};
  for (const precinct of Object.keys(turnoutData)) {
    for (const candidate of Object.keys(turnoutData[precinct][contest])) {
      if (candidate in results) {
        results[candidate] += turnoutData[precinct][contest][candidate];
      } else {
        results[candidate] = turnoutData[precinct][contest][candidate];
      }
    }
  }
  return results;
};

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
      let tooltipTurnoutData;
      if (tooltipPrecinct) {
        const tooltipPrecinctNum = tooltipPrecinct.properties['PREC_2012'];
        tooltipTurnoutData = turnoutData[tooltipPrecinctNum];
      }

      if (tooltipTurnoutData) {
        ReactDOM.render(
          React.createElement(Tooltip, {
            precinctData: tooltipPrecinct,
            turnoutData: tooltipTurnoutData,
            contest: CONTEST,
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
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [LONG, LAT],
      zoom: ZOOM,
    });

    setMap(map);
  }, []);

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

      const overallResults = computeOverallResults(turnoutData, CONTEST);
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
        } else if (precinctTurnoutData['total_voters'] === 0) {
          continue;
        }

        const candidate0Votes =
          precinctTurnoutData[CONTEST][topCandidates[0].candidate];
        const candidate1Votes =
          precinctTurnoutData[CONTEST][topCandidates[1].candidate];
        const totalVotes = Object.keys(precinctTurnoutData[CONTEST]).reduce(
          (total, candidate) => total + precinctTurnoutData[CONTEST][candidate],
          0,
        );

        // TODO: Need to check logic makes sense here
        const margin = ((candidate0Votes - candidate1Votes) / totalVotes) * 100;
        let color;
        for (let i = 0; i < THRESHOLDS.length; i++) {
          if (margin <= THRESHOLDS[i]) {
            color = COLORS[i];
            break;
          }
          if (i === THRESHOLDS.length - 1) {
            color = COLORS[i + 1];
          }
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
  }, [map, precinctData, turnoutData, tooltipContainer]);

  return (
    <div className={classes.app}>
      <div className={classes.mapContainer} ref={mapContainerRef} />
    </div>
  );
}

export default App;
