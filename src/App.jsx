import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import classes from './App.module.css';

function App() {
  const [stlUrl, setStlUrl] = useState("https://cdn.thingiverse.com/assets/4b/f9/8c/6f/80/88db7d53-6f57-4832-8f2b-0c5c4da0e16a.stl");
  const [modelLoad, setModelLoad] = useState(false);
  const [dimensions, setDimensions] = useState(null);
  const [printTime, setPrintTime] = useState(null);
  const [printSpeed, setPrintSpeed] = useState(50);
  const [layerHeight, setLayerHeight] = useState(0.2);
  const [infillDensity, setInfillDensity] = useState(20);
  const [scrollPosition, setScrollPosition] = useState(0); // Додаємо стан для прокручування
  const mountRef = useRef(null);
  const sceneRef = useRef(null);

  const loadSTL = (url) => {
    setModelLoad(true)
    const loader = new STLLoader();
    loader.load(url, (geometry) => {
      const material = new THREE.MeshNormalMaterial();
      const mesh = new THREE.Mesh(geometry, material);

      const boundingBox = new THREE.Box3().setFromObject(mesh);
      const width = boundingBox.max.x - boundingBox.min.x;
      const height = boundingBox.max.y - boundingBox.min.y;
      const length = boundingBox.max.z - boundingBox.min.z;
      setDimensions({ width, height, length });

      mesh.geometry.center(); // Центрування моделі
      loadSTLModel(mesh, height);
    });
  };

  const handleUrlChange = (e) => {
    setStlUrl(e.target.value);
  };

  const handleLayerHeightChange = (e) => {
    setLayerHeight(e.target.value);
  };
  const handleInfillDensityChange = (e) => {
    setInfillDensity(e.target.value);
  };
  const handlePrintSpeedChange = (e) => {
    setPrintSpeed(e.target.value);
  };

  const calculatePrintTime = () => {
    if (!dimensions) {
      alert("Please load an STL file first.");
      return;
    }

    const volume = dimensions.width * dimensions.height * dimensions.length;
    const layerHeightValue = parseFloat(layerHeight);

    const layers = dimensions.height / layerHeightValue;
    const lineLength = (dimensions.width + dimensions.height + dimensions.length) * 2;

    const totalLineLength = layers * lineLength;

    const supportTimeFactor = 1.7;
    const smallDetailsFactor = 1.25;
    const infillDensityFactor = infillDensity / 100 + 1;

    const largeObjectSpeed = printSpeed * 0.8;
    const smallObjectSpeed = printSpeed * 0.6;


    const adjustedLineLength = totalLineLength * supportTimeFactor * smallDetailsFactor;
    const printTimeInSeconds = adjustedLineLength / ((largeObjectSpeed + smallObjectSpeed) / 2) * infillDensityFactor;

    const hours = Math.floor(printTimeInSeconds / 3600);
    const minutes = Math.floor((printTimeInSeconds % 3600) / 60);

    setPrintTime({ hours, minutes });
  };

  const loadSTLModel = (mesh, height) => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    scene.background = new THREE.Color(0xf2f2f2);


    camera.position.z = height;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.update();

    sceneRef.current = scene;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    setModelLoad(false)

    sceneRef.current.add(mesh);

    return () => {
      mountRef.current.removeChild(renderer.domElement);
    };
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = window.innerHeight * 0.75; // 75% від висоти
      const position = Math.min(scrollY, maxScroll);
      setScrollPosition(scrollY);

    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollUp = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const scrollDown = () => {
    if (scrollPosition < 300) {
      window.scrollTo({ top: 5000, behavior: 'smooth' });
    }
  }

  return (
    <div>
      <div
        className={classes.overlay}
        style={{ backgroundColor: `rgba(60,60,60,${scrollPosition / 500})`, pointerEvents: scrollPosition == 0 ? 'none' : "all" }}
        onClick={scrollUp}
      ></div>
      <main>
        <div className={classes.input_container}>
          <div className={classes.input_box}>
            <input type="text" value={stlUrl} onChange={handleUrlChange} placeholder="URL" />
            <button onClick={() => loadSTL(stlUrl)}>Load STL</button>
          </div>
        </div>

        {mountRef != null && (
          <div ref={mountRef} className={classes.model_container}>
            {modelLoad && (<div className={classes.loader}>
              Load...
            </div>)}
          </div>
        )}

      </main>
      <div className={classes.empty_box}></div>

      <div className={classes.info_container} onClick={scrollDown}>
        {dimensions && (
          <div>
            <h3>Dimensions (мм):</h3>
            <p>Width: {dimensions.width.toFixed(2)}</p>
            <p>Height: {dimensions.height.toFixed(2)}</p>
            <p>Length: {dimensions.length.toFixed(2)}</p>
          </div>
        )}

        <div>
          <label htmlFor="layerHeight">Висота шару (мм): </label>
          <input
            id="layerHeight"
            type="number"
            value={layerHeight}
            onChange={handleLayerHeightChange}
            step="0.01"
            min="0.05"
            required
          />
          <label htmlFor="printSpeed">Швидкісь друку (мм/с)</label>
          <input
            id="printSpeed"
            type="number"
            value={printSpeed}
            onChange={handlePrintSpeedChange}
            step="1"
            min="1"
            required
          />
          <label htmlFor="infillDensity">Заповнення (%)</label>
          <input
            id="infillDensity"
            type="number"
            value={infillDensity}
            onChange={handleInfillDensityChange}
            step="1"
            min="1"
            required
          />
        </div>

        <button onClick={calculatePrintTime}>Розрахувати час друку</button>
        {printTime && (
          <div>
            <h3>Приблизний час друку:</h3>
            <p>{printTime.hours} годин {printTime.minutes} хвилин</p>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
