import React from 'react';
import ReactDOM from 'react-dom';
import { createUseStyles } from 'react-jss';
import Measure from 'react-measure';

import { capitalizeName, TURNOUT_CONTEST } from './util';

const useStyles = createUseStyles({
  tooltip: {
    backgroundColor: 'white',
    padding: '10px',
    borderRadius: '3px',
  },
});

const Tooltip = ({ precinct, electionData, contest, onResize, container }) => {
  const classes = useStyles();

  const turnoutRate = (
    (electionData.ballotsCast / electionData.registeredVoters) *
    100
  ).toFixed(2);

  const sortedCandidates =
    contest === TURNOUT_CONTEST
      ? []
      : Object.keys(electionData[contest])
          .sort(
            (c1, c2) => electionData[contest][c1] - electionData[contest][c2],
          )
          .reverse();

  const totalVotes =
    contest === TURNOUT_CONTEST
      ? 0
      : Object.values(electionData[contest]).reduce((t, v) => t + v, 0);

  return ReactDOM.createPortal(
    <Measure
      bounds
      onResize={contentRect => {
        onResize(contentRect);
      }}
    >
      {({ measureRef }) => (
        <div ref={measureRef} className={classes.tooltip}>
          <div>Precinct #{precinct}</div>
          <div>Registered Voters: {electionData.registeredVoters}</div>
          <div>Ballots Cast: {electionData.ballotsCast}</div>
          <div>Turnout: {turnoutRate}%</div>
          {sortedCandidates
            .filter(c => electionData[contest][c] > 0)
            .slice(0, 5)
            .map(candidate => {
              const votes = electionData[contest][candidate];
              const percent = ((votes / totalVotes) * 100).toFixed(2);
              return (
                <div key={candidate}>
                  {capitalizeName(candidate)}: {percent}% ({votes})
                </div>
              );
            })}
        </div>
      )}
    </Measure>,
    container,
  );
};

export default Tooltip;
