import React from 'react';
import { createUseStyles } from 'react-jss'

const useStyles = createUseStyles({
  tooltip: {
    backgroundColor: 'white',
    padding: '10px',
    borderRadius: '3px',
  },
});

const Tooltip = ({ precinctData, turnoutData }) => {
  const classes = useStyles();

  return (
    <div className={classes.tooltip}>
      <div>Precinct #{precinctData.properties['PREC_2012']}</div>
      {turnoutData && <>
        <div>Registered Voters: {turnoutData['total_voters']}</div>
        <div>Ballots Cast: {turnoutData['ballots_cast']}</div>
        <div>Turnout: {((turnoutData['ballots_cast'] / turnoutData['total_voters']) * 100).toFixed(2)}%</div>
      </>}
    </div>
  );
};

export default Tooltip;
