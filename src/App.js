import React, { useEffect, useState, useRef } from 'react';
import logo from './logo.svg';
import './App.css';

import mapboxgl from 'mapbox-gl';

function App() {
  const mapContainerRef = useRef();
  const [ state, setState ] = useState({
    lng: 5,
    lat: 34,
    zoom: 2,
  });

  useEffect(() => {
    console.log(mapContainerRef)
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [state.lng, state.lat],
      zoom: state.zoom
    });
  });

  return (
    <div className="app">
      <div className="mapContainer" ref={mapContainerRef} />
    </div>
  );
}

export default App;
