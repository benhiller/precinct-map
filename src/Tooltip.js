import React from 'react';

const Tooltip = ({ precinctData }) => {
  return <div>{precinctData.properties['PREC_2012']}</div>;
};

export default Tooltip;
