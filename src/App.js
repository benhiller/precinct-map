import React, { useEffect, useRef, useState } from 'react';
import { createUseStyles } from 'react-jss';
import mapboxgl from 'mapbox-gl';
import bbox from '@turf/bbox';

import Tooltip from './Tooltip';
import { TURNOUT_CONTEST, capitalizeName } from './util';

import precinct2012DataUrl from './data/precincts2012.txt';
import precinct2017DataUrl from './data/precincts2017.txt';
// import precinct2019DataUrl from './data/precincts2019.txt';
import general2018ElectionDataUrl from './data/election2018general.txt';
import primary2018ElectionDataUrl from './data/election2018primary.txt';
import general2016ElectionDataUrl from './data/election2016general.txt';
import primary2016ElectionDataUrl from './data/election2016primary.txt';
import municipal2015ElectionDataUrl from './data/election2015municipal.txt';

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

const PRECINCT_SOURCE = 'precincts';
const PRECINCT_LAYER = 'precinct-borders';
const PRECINCT_HIGHLIGHT_LAYER = 'precinct-highlight';

const DEFAULT_ELECTION = 'PRIMARY_2016';
const ELECTIONS = {
  GENERAL_2018: {
    name: '2018 General Election',
    dataUrl: general2018ElectionDataUrl,
    precinctUrl: precinct2017DataUrl,
    precinctKey: 'PREC_2017',
    defaultContest: 'Governor - CALIFORNIA (100)',
  },
  PRIMARY_2018: {
    name: '2018 Primary Election',
    dataUrl: primary2018ElectionDataUrl,
    precinctUrl: precinct2017DataUrl,
    precinctKey: 'PREC_2017',
    defaultContest: 'Governor - CALIFORNIA (100)',
  },
  GENERAL_2016: {
    name: '2016 General Election',
    dataUrl: general2016ElectionDataUrl,
    precinctUrl: precinct2012DataUrl,
    precinctKey: 'PREC_2012',
    defaultContest: 'President and Vice President - CALIFORNIA (100)',
  },
  PRIMARY_2016: {
    name: '2016 Primary Election',
    dataUrl: primary2016ElectionDataUrl,
    precinctUrl: precinct2012DataUrl,
    precinctKey: 'PREC_2012',
    defaultContest: 'President - DEM',
  },
  MUNICIPAL_2015: {
    name: '2015 Municipal Election',
    dataUrl: municipal2015ElectionDataUrl,
    precinctUrl: precinct2012DataUrl,
    precinctKey: 'PREC_2012',
    defaultContest: 'Mayor - CITY/COUNTY OF SAN FRANCI (100)',
  },
};

const useStyles = createUseStyles({
  app: {
    fontFamily: 'sans-serif',
  },
  contestControl: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: '1 !important',
    '& select': {
      marginRight: '10px',
    },
  },
  '@media only screen and (min-device-width : 320px) and (max-device-width : 480px)': {
    contestControl: {
      '& select': {
        fontSize: '16px',
      },
    },
  },
  overallResults: {
    position: 'absolute',
    bottom: 25,
    right: 10,
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
  const [election, setElection] = useState(DEFAULT_ELECTION);
  const [contest, setContest] = useState(
    ELECTIONS[DEFAULT_ELECTION].defaultContest,
  );
  const [tooltipPrecinct, setTooltipPrecinct] = useState(null);

  // Data
  const [electionData, setElectionData] = useState(null);
  const [overallResults, setOverallResults] = useState(null);
  const [contests, setContests] = useState(null);
  const [precinctUrl, setPrecinctUrl] = useState(
    ELECTIONS[DEFAULT_ELECTION].precinctUrl,
  );
  const [precinctKey, setPrecinctKey] = useState(
    ELECTIONS[DEFAULT_ELECTION].precinctKey,
  );
  const [tooltipPrecinctKey, setTooltipPrecinctKey] = useState(null);
  const [precinctData, setPrecinctData] = useState({
    precinctData: null,
    loadedUrl: null,
  });
  const [mouseMoveListener, setMouseMoveListener] = useState(null);

  // Loading
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);

  // UI elements
  const [map, setMap] = useState(null);
  const [tooltipContainer, setTooltipContainer] = useState(null);
  const [tooltipMarker, setTooltipMarker] = useState(null);

  const mapContainerRef = useRef();

  useEffect(() => {
    fetch(ELECTIONS[election].dataUrl)
      .then(response => response.text())
      .then(text => {
        const electionData = JSON.parse(text);
        setElectionData(electionData['precinct_data']);
        setContests(electionData['contests']);
      });
  }, [election]);

  useEffect(() => {
    const tooltipDiv = document.createElement('div');

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/benhiller/ck6zv6a0m0dnd1jqo502sezzs',
      center: [LONG, LAT],
      zoom: ZOOM,
    });

    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    const tooltip = new mapboxgl.Marker(tooltipDiv, {
      offset: [0, 0],
    })
      .setLngLat([0, 0])
      .addTo(map);

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

    if (tooltipPrecinctKey === precinctKey) {
      return;
    }

    if (mouseMoveListener) {
      map.off('mousemove', mouseMoveListener.listener);
    }

    const listener = e => {
      const features = map.queryRenderedFeatures(e.point);
      const filteredFeature = features.filter(
        f => f.source === PRECINCT_SOURCE,
      )[0];
      if (filteredFeature) {
        const [minX /* minY */, , maxX, maxY] = bbox(filteredFeature.geometry);
        tooltipMarker.setLngLat([(minX + maxX) / 2.0, maxY]);
      }
      setTooltipPrecinct(
        filteredFeature && filteredFeature.properties[precinctKey],
      );
    };

    map.on('mousemove', listener);
    setMouseMoveListener({ listener });
    setTooltipPrecinctKey(precinctKey);
  }, [
    precinctKey,
    tooltipMarker,
    map,
    mapLoaded,
    mouseMoveListener,
    tooltipPrecinctKey,
  ]);

  useEffect(() => {
    setPrecinctData({ precinctData: null, loadedUrl: null });

    fetch(precinctUrl)
      .then(response => response.text())
      .then(text => {
        const precinctData = JSON.parse(text);
        setPrecinctData({ precinctData, loadedUrl: precinctUrl });
      });
  }, [precinctUrl]);

  useEffect(() => {
    if (!mapLoaded) {
      return;
    }
    if (precinctData.loadedUrl !== precinctUrl) {
      return;
    }

    const precinctSource = map.getSource(PRECINCT_SOURCE);
    if (precinctSource) {
      precinctSource.setData(precinctData.precinctData);
      map.setFilter(PRECINCT_HIGHLIGHT_LAYER, ['==', precinctKey, '0']);
    } else {
      map.addSource(PRECINCT_SOURCE, {
        type: 'geojson',
        data: precinctData.precinctData,
      });

      const layers = map.getStyle().layers;
      let firstSymbolId;
      for (let i = 0; i < layers.length; i++) {
        if (layers[i].id.endsWith('label')) {
          firstSymbolId = layers[i].id;
          break;
        }
      }

      map.addLayer(
        {
          id: PRECINCT_HIGHLIGHT_LAYER,
          type: 'line',
          source: PRECINCT_SOURCE,
          filter: ['==', precinctKey, '0'],
          visibility: 'none',
          paint: {
            'line-width': 2,
          },
        },
        firstSymbolId,
      );

      map.addLayer(
        {
          id: PRECINCT_LAYER,
          type: 'fill',
          source: PRECINCT_SOURCE,
          paint: {
            'fill-color': '#fff',
          },
          filter: ['==', '$type', 'Polygon'],
        },
        PRECINCT_HIGHLIGHT_LAYER,
      );

      setMapInitialized(true);
    }
  }, [precinctData, precinctUrl, precinctKey, map, mapLoaded]);

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
        precinctKey,
        tooltipPrecinct,
      ]);
    }
  }, [mapInitialized, map, tooltipPrecinct, precinctKey]);

  useEffect(() => {
    if (!mapInitialized) {
      return;
    }

    if (precinctData.loadedUrl !== precinctUrl) {
      return;
    }

    if (!electionData) {
      return;
    }

    const expression = ['match', ['get', precinctKey]];

    const overallResults = computeOverallResults(electionData, contest);
    setOverallResults(overallResults);
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

    for (let idx in precinctData.precinctData.features) {
      const precinct = precinctData.precinctData.features[idx];
      if (!precinct['properties'][precinctKey]) {
        // console.log('no precinct', precinct);
        continue;
      }
      const precinctElectionData =
        electionData[precinct['properties'][precinctKey]];
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

      expression.push(precinct['properties'][precinctKey], color);
    }

    expression.push('rgba(0,0,0,0)');

    map.setPaintProperty(PRECINCT_LAYER, 'fill-color', expression);
  }, [
    map,
    mapInitialized,
    precinctData,
    precinctUrl,
    precinctKey,
    electionData,
    election,
    contest,
  ]);

  const changeElection = election => {
    setElectionData(null);
    setElection(election);
    setContest(ELECTIONS[election].defaultContest);
    setPrecinctUrl(ELECTIONS[election].precinctUrl);
    setPrecinctKey(ELECTIONS[election].precinctKey);
  };

  const totalVotes =
    overallResults &&
    Object.entries(overallResults).reduce((sum, [c, r]) => sum + r, 0);

  let tooltipElectionData;
  if (
    tooltipPrecinct &&
    electionData &&
    electionData[tooltipPrecinct] &&
    (contest in electionData[tooltipPrecinct] || contest === TURNOUT_CONTEST)
  ) {
    tooltipElectionData = electionData[tooltipPrecinct];
  }

  return (
    <div className={classes.app}>
      <div className={classes.contestControl}>
        <select onChange={e => changeElection(e.target.value)} value={election}>
          {Object.entries(ELECTIONS).map(([innerElection, obj]) => (
            <option key={innerElection} value={innerElection}>
              {obj.name}
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
      <div className={classes.overallResults}>
        {overallResults &&
          Object.entries(overallResults)
            .sort(([c1, r1], [c2, r2]) => r2 - r1)
            .slice(0, 2)
            .map(([c, r]) => (
              <div key={c}>
                {capitalizeName(c)} - {((r / totalVotes) * 100).toFixed(2)}%
              </div>
            ))}
      </div>
      <div className={classes.mapContainer} ref={mapContainerRef} />
      {tooltipContainer && tooltipElectionData && (
        <Tooltip
          precinct={tooltipPrecinct}
          electionData={tooltipElectionData}
          contest={contest}
          container={tooltipContainer}
          onResize={({ bounds }) => {
            tooltipMarker.setOffset([
              0,
              -(bounds.height / window.devicePixelRatio + 10),
            ]);
          }}
        />
      )}
    </div>
  );
}

export default App;
