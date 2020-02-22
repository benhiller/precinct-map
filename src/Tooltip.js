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

const Tooltip = ({ precinctData, turnoutData, contest }) => {
  const classes = useStyles();

  const turnoutRate = (
    (turnoutData['ballots_cast'] / turnoutData['total_voters']) *
    100
  ).toFixed(2);

  const sortedCandidates = Object.keys(turnoutData[contest])
    .sort((c1, c2) => turnoutData[contest][c1] - turnoutData[contest][c2])
    .reverse();

  const totalVotes = Object.values(turnoutData[contest]).reduce(
    (t, v) => t + v,
    0,
  );

  return (
    <div className={classes.tooltip}>
      <div>Precinct #{precinctData.properties['PREC_2012']}</div>
      <div>Registered Voters: {turnoutData['total_voters']}</div>
      <div>Ballots Cast: {turnoutData['ballots_cast']}</div>
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
