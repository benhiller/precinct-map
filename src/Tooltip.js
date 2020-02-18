import React from 'react';

import './Tooltip.css';

const Tooltip = ({ precinctData, turnoutData }) => {
  return (
    <div className="tooltip">
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
