import React, { useEffect, useRef, useState } from 'react';
import { createUseStyles } from 'react-jss';
import mapboxgl from 'mapbox-gl';
import bbox from '@turf/bbox';

import Tooltip from './Tooltip';
import { TURNOUT_CONTEST, capitalizeName } from './util';

import precinct2012DataUrl from './data/precincts2012.txt';
import precinct2017DataUrl from './data/precincts2017.txt';
import precinct2019DataUrl from './data/precincts2019.txt';
import primary2020ElectionDataUrl from './data/election2020primary.txt';
import municipal2019ElectionDataUrl from './data/election2019municipal.txt';
import general2018ElectionDataUrl from './data/election2018general.txt';
import primary2018ElectionDataUrl from './data/election2018primary.txt';
import general2016ElectionDataUrl from './data/election2016general.txt';
import primary2016ElectionDataUrl from './data/election2016primary.txt';
import municipal2015ElectionDataUrl from './data/election2015municipal.txt';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const BOUNDS = [
  [-122.51, 37.7],
  [-122.36, 37.82],
];

// https://gka.github.io/palettes/
const BLUE_COLORS = [
  // #3bd1d9
  'rgba(255, 255, 255, 0.75)',
  'rgba(216, 246, 247, 0.75)',
  'rgba(177, 237, 240, 0.75)',
  'rgba(137, 227, 232, 0.75)',
  'rgba(98, 218, 225, 0.75)',
  'rgba(59, 209, 217, 0.75)',
];
const RED_COLORS = [
  // #d93b60
  'rgba(255, 255, 255, 0.75)',
  'rgba(247, 216, 223, 0.75)',
  'rgba(240, 177, 191, 0.75)',
  'rgba(232, 137, 160, 0.75)',
  'rgba(225, 98, 128, 0.75)',
  'rgba(217, 59, 96, 0.75)',
];
const GREEN_COLORS = [
  // #3bd948
  'rgba(255, 255, 255, 0.75)',
  'rgba(216, 247, 218, 0.75)',
  'rgba(177, 240, 182, 0.75)',
  'rgba(137, 232, 145, 0.75)',
  'rgba(98, 225, 109, 0.75)',
  'rgba(59, 217, 72, 0.75)',
];
const YELLOW_COLORS = [
  // #d9d93b
  'rgba(255, 255, 255, 0.75)',
  'rgba(247, 247, 216, 0.75)',
  'rgba(240, 240, 177, 0.75)',
  'rgba(232, 232, 137, 0.75)',
  'rgba(225, 225, 98, 0.75)',
  'rgba(217, 217, 59, 0.75)',
];
const PINK_COLORS = [
  // #a73bd9
  'rgba(255, 255, 255, 0.75)',
  'rgba(237, 216, 247, 0.75)',
  'rgba(220, 177, 240, 0.75)',
  'rgba(202, 137, 232, 0.75)',
  'rgba(185, 95, 225, 0.75)',
  'rgba(167, 59, 217, 0.75)',
];
const COLORS = [
  BLUE_COLORS,
  RED_COLORS,
  GREEN_COLORS,
  YELLOW_COLORS,
  PINK_COLORS,
];

const THRESHOLDS = [0.5, 5, 10, 15, 20];
const TURNOUT_THRESHOLDS = [0, 50, 55, 60, 65];

const PRECINCT_SOURCE = 'precincts';
const PRECINCT_LAYER = 'precinct-borders';
const PRECINCT_HIGHLIGHT_LAYER = 'precinct-highlight';

const DEFAULT_ELECTION = 'PRIMARY_2020';
const ELECTIONS = {
  PRIMARY_2020: {
    name: '2020 Primary Election',
    dataUrl: primary2020ElectionDataUrl,
    precinctUrl: precinct2019DataUrl,
    precinctKey: 'PREC_2019',
    defaultContest: 'President DEM',
  },
  MUNICIPAL_2019: {
    name: '2019 Municipal Election',
    dataUrl: municipal2019ElectionDataUrl,
    precinctUrl: precinct2019DataUrl,
    precinctKey: 'PREC_2019',
    defaultContest: 'MAYOR',
  },
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
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    padding: '5px',
    borderRadius: '2px',
    '& > div': {
      marginBottom: '3px',
    },
    '& > div:last-child': {
      marginBottom: '0px',
    },
  },
  candidateBadge: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '2px',
  },
  candidateResult: {
    float: 'right',
    paddingLeft: '15px',
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
      bounds: BOUNDS,
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
    const overallOrderedCandidates = Object.keys(overallResults).sort(
      (c1, c2) => overallResults[c2] - overallResults[c1],
    );

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
      let colors;
      if (contest === TURNOUT_CONTEST) {
        margin =
          (precinctElectionData.ballotsCast /
            precinctElectionData.registeredVoters) *
          100;
        thresholds = TURNOUT_THRESHOLDS;
        colors = GREEN_COLORS;
      } else if (overallOrderedCandidates.length > 1) {
        const totalVotes = Object.keys(precinctElectionData[contest]).reduce(
          (acc, val) => acc + precinctElectionData[contest][val],
          0,
        );
        const precinctOrderedCandidates = Object.keys(
          precinctElectionData[contest],
        ).sort(
          (c1, c2) =>
            precinctElectionData[contest][c2] -
            precinctElectionData[contest][c1],
        );

        thresholds = THRESHOLDS;
        if (precinctOrderedCandidates.length === 0 || totalVotes === 0) {
          margin = 0;
          colors = GREEN_COLORS;
        } else if (precinctOrderedCandidates.length === 1) {
          margin = 100;
          colors =
            COLORS[
              overallOrderedCandidates.indexOf(precinctOrderedCandidates[0])
            ];
        } else {
          const colorIdx = overallOrderedCandidates.indexOf(
            precinctOrderedCandidates[0],
          );
          if (colorIdx < COLORS.length) {
            margin =
              ((precinctElectionData[contest][precinctOrderedCandidates[0]] -
                precinctElectionData[contest][precinctOrderedCandidates[1]]) /
                totalVotes) *
              100;
            colors = COLORS[colorIdx];
          } else {
            margin = 0;
            colors = COLORS[0];
          }
        }
      } else {
        // TODO - maybe count undervotes here? maybe filter out uncontested elections
        margin = 100;
        thresholds = TURNOUT_THRESHOLDS;
        colors = GREEN_COLORS;
      }

      let color;
      for (let i = 0; i < thresholds.length; i++) {
        if (margin <= thresholds[i]) {
          color = colors[i];
          break;
        }
        if (i === thresholds.length - 1) {
          color = colors[i + 1];
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
            .slice(0, COLORS.length)
            .map(([c, r], i) => (
              <div key={c} className={classes.candidateRow}>
                {i < COLORS.length && (
                  <div
                    style={{ backgroundColor: COLORS[i][COLORS[i].length - 1] }}
                    className={classes.candidateBadge}
                  />
                )}{' '}
                <span>{capitalizeName(c)}</span>{' '}
                <span className={classes.candidateResult}>
                  {((r / totalVotes) * 100).toFixed(2)}%
                </span>
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
