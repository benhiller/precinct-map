import React from 'react';
import { createUseStyles } from 'react-jss';

import { capitalizeName } from './util';

const useStyles = createUseStyles({
  tooltip: {
    backgroundColor: 'white',
    padding: '10px',
    borderRadius: '3px',
  },
});

const Tooltip = ({ precinct, turnoutData, contest }) => {
  const classes = useStyles();

  const turnoutRate = (
    (turnoutData.ballotsCast / turnoutData.registeredVoters) *
    100
  ).toFixed(2);

  const sortedCandidates =
    contest === 'Turnout'
      ? []
      : Object.keys(turnoutData[contest])
          .sort((c1, c2) => turnoutData[contest][c1] - turnoutData[contest][c2])
          .reverse();

  const totalVotes =
    contest === 'Turnout'
      ? 0
      : Object.values(turnoutData[contest]).reduce((t, v) => t + v, 0);

  return (
    <div className={classes.tooltip}>
      <div>Precinct #{precinct}</div>
      <div>Registered Voters: {turnoutData.registeredVoters}</div>
      <div>Ballots Cast: {turnoutData.ballotsCast}</div>
      <div>Turnout: {turnoutRate}%</div>
      {sortedCandidates.slice(0, 2).map(candidate => {
        const votes = turnoutData[contest][candidate];
        const percent = ((votes / totalVotes) * 100).toFixed(2);
        return (
          <div key={candidate}>
            {capitalizeName(candidate)}: {percent}% ({votes})
          </div>
        );
      })}
    </div>
  );
};

export default Tooltip;
