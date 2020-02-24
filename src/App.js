import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { createUseStyles } from 'react-jss';
import mapboxgl from 'mapbox-gl';
import bbox from '@turf/bbox';

import Tooltip from './Tooltip';
import { TURNOUT_CONTEST } from './util';

import precinctDataUrl from './data/precincts2012.txt';
import primaryElectionDataUrl from './data/election2016primary.txt';
import generalElectionDataUrl from './data/election2016general.txt';

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
const TURNOUT_THRESHOLDS = [-1, -1, -1, -1, -1, -1, 50, 55, 60, 65];

const PRIMARY_DEFAULT_CONTEST = 'President - DEM';
const GENERAL_DEFAULT_CONTEST =
  'President and Vice President - CALIFORNIA (100)';

const PRECINCT_SOURCE = 'precincts';
const PRECINCT_LAYER = 'precinct-borders';
const PRECINCT_HIGHLIGHT_LAYER = 'precinct-highlight';

const PRIMARY_2016 = '2016 Primary Election';
const GENERAL_2016 = '2016 General Election';
const elections = [PRIMARY_2016, GENERAL_2016];
const electionsToDataUrls = {
  [PRIMARY_2016]: primaryElectionDataUrl,
  [GENERAL_2016]: generalElectionDataUrl,
};
const electionsToDefaultContests = {
  [PRIMARY_2016]: PRIMARY_DEFAULT_CONTEST,
  [GENERAL_2016]: GENERAL_DEFAULT_CONTEST,
};

const useStyles = createUseStyles({
  app: {},
  contestControl: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: '1 !important',
    '& select': {
      marginRight: '10px',
    },
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
  },
});

const computeOverallResults = (electionData, contest) => {
  const results = {};
  for (const precinct of Object.keys(electionData)) {
    if (contest in electionData[precinct]) {
      for (const candidate of Object.keys(electionData[precinct][contest])) {
        if (candidate in results) {
          results[candidate] += electionData[precinct][contest][candidate];
        } else {
          results[candidate] = electionData[precinct][contest][candidate];
        }
      }
    }
  }
  return results;
};

function App() {
  const classes = useStyles();

  // User controls
  const [election, setElection] = useState(elections[0]);
  const [contest, setContest] = useState(PRIMARY_DEFAULT_CONTEST);
  const [tooltipPrecinct, setTooltipPrecinct] = useState(null);

  // Data
  const [electionData, setElectionData] = useState(null);
  const [contests, setContests] = useState(null);
  const [precinctData, setPrecinctData] = useState(null);

  // Loading
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);

  // UI elements
  const [map, setMap] = useState(null);
  const [tooltipContainer, setTooltipContainer] = useState(null);
  const [tooltipMarker, setTooltipMarker] = useState(null);

  const mapContainerRef = useRef();

  useEffect(() => {
    fetch(electionsToDataUrls[election])
      .then(response => response.text())
      .then(text => {
        const electionData = JSON.parse(text);
        setElectionData(electionData['precinct_data']);
        setContests(electionData['contests']);
      });
  }, [election]);

  useEffect(() => {
    fetch(precinctDataUrl)
      .then(response => response.text())
      .then(text => {
        const precinctData = JSON.parse(text);
        setPrecinctData(precinctData);
      });
  }, []);

  useEffect(() => {
    if (tooltipContainer) {
      let tooltipElectionData;
      if (tooltipPrecinct) {
        tooltipElectionData = electionData[tooltipPrecinct];
      }

      if (
        tooltipElectionData &&
        (contest in tooltipElectionData || contest === TURNOUT_CONTEST)
      ) {
        ReactDOM.render(
          React.createElement(Tooltip, {
            precinct: tooltipPrecinct,
            electionData: tooltipElectionData,
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
  }, [electionData, tooltipContainer, tooltipPrecinct, tooltipMarker, contest]);

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
      const features = map.queryRenderedFeatures(e.point);
      const filteredFeature = features.filter(
        f => f.source === PRECINCT_SOURCE,
      )[0];
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

    map.addSource(PRECINCT_SOURCE, {
      type: 'geojson',
      data: precinctData,
    });

    map.addLayer({
      id: PRECINCT_LAYER,
      type: 'fill',
      source: PRECINCT_SOURCE,
      paint: {
        'fill-color': '#fff',
      },
      filter: ['==', '$type', 'Polygon'],
    });

    map.addLayer({
      id: PRECINCT_HIGHLIGHT_LAYER,
      type: 'line',
      source: PRECINCT_SOURCE,
      filter: ['==', 'PREC_2012', '0'],
      visibility: 'none',
      paint: {
        'line-width': 2,
      },
    });

    setMapInitialized(true);
  }, [precinctData, map, mapLoaded]);

  useEffect(() => {
    if (!mapInitialized) {
      return;
    }

    if (!tooltipPrecinct) {
      map.setLayoutProperty(PRECINCT_HIGHLIGHT_LAYER, 'visibility', 'none');
    } else {
      map.setLayoutProperty(PRECINCT_HIGHLIGHT_LAYER, 'visibility', 'visible');
      map.setFilter(PRECINCT_HIGHLIGHT_LAYER, [
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

    if (!electionData) {
      return;
    }

    const expression = ['match', ['get', 'PREC_2012']];

    const overallResults = computeOverallResults(electionData, contest);
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
        // console.log('no precinct', precinct);
        continue;
      }
      const precinctElectionData =
        electionData[precinct['properties']['PREC_2012']];
      if (!precinctElectionData) {
        // console.log('no turnout data', precinct);
        continue;
      } else if (
        contest !== TURNOUT_CONTEST &&
        !(contest in precinctElectionData)
      ) {
        continue;
      }

      let margin;
      let thresholds;
      if (contest === TURNOUT_CONTEST) {
        margin =
          (precinctElectionData.ballotsCast /
            precinctElectionData.registeredVoters) *
          100;
        thresholds = TURNOUT_THRESHOLDS;
      } else {
        const candidate0Votes =
          precinctElectionData[contest][topCandidates[0].candidate];
        const candidate1Votes =
          precinctElectionData[contest][topCandidates[1].candidate];
        const totalVotes = Object.keys(precinctElectionData[contest]).reduce(
          (total, candidate) =>
            total + precinctElectionData[contest][candidate],
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

    map.setPaintProperty(PRECINCT_LAYER, 'fill-color', expression);
  }, [map, mapInitialized, precinctData, electionData, election, contest]);

  const changeElection = election => {
    setElectionData(null);
    setElection(election);
    setContest(electionsToDefaultContests[election]);
  };

  return (
    <div className={classes.app}>
      <div className={classes.contestControl}>
        <select onChange={e => changeElection(e.target.value)} value={election}>
          {elections.map(innerElection => (
            <option key={innerElection} value={innerElection}>
              {innerElection}
            </option>
          ))}
        </select>
        {contests && (
          <select onChange={e => setContest(e.target.value)} value={contest}>
            {[TURNOUT_CONTEST, ...contests].map(innerContest => (
              <option key={innerContest} value={innerContest}>
                {innerContest}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className={classes.mapContainer} ref={mapContainerRef} />
    </div>
  );
}

export default App;
