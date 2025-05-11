// Prowim3Dmodel.js

import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const Prowim3Dmodel = ({ bOverD, cOverD, D, propLocation }) => {
  const mountRef = useRef(null);
  const wingMeshRef = useRef(null);
  const propellerMeshRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const animationIdRef = useRef(null);
  const controlsRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // NACA 0012 airfoil coordinates
  const airfoilCoords = [
    [0.0000000, 0.0000000],
    [0.0005839, 0.0042603],
    [0.0023342, 0.0084289],
    [0.0052468, 0.0125011],
    [0.0093149, 0.0164706],
    [0.0145291, 0.0203300],
    [0.0208771, 0.0240706],
    [0.0283441, 0.0276827],
    [0.0369127, 0.0311559],
    [0.0465628, 0.0344792],
    [0.0572720, 0.0376414],
    [0.0690152, 0.0406310],
    [0.0817649, 0.0434371],
    [0.0954915, 0.0460489],
    [0.1101628, 0.0484567],
    [0.1257446, 0.0506513],
    [0.1422005, 0.0526251],
    [0.1594921, 0.0543715],
    [0.1775789, 0.0558856],
    [0.1964187, 0.0571640],
    [0.2159676, 0.0582048],
    [0.2361799, 0.0590081],
    [0.2570083, 0.0595755],
    [0.2784042, 0.0599102],
    [0.3003177, 0.0600172],
    [0.3226976, 0.0599028],
    [0.3454915, 0.0595747],
    [0.3686463, 0.0590419],
    [0.3921079, 0.0583145],
    [0.4158215, 0.0574033],
    [0.4397317, 0.0563200],
    [0.4637826, 0.0550769],
    [0.4879181, 0.0536866],
    [0.5120819, 0.0521620],
    [0.5362174, 0.0505161],
    [0.5602683, 0.0487619],
    [0.5841786, 0.0469124],
    [0.6078921, 0.0449802],
    [0.6313537, 0.0429778],
    [0.6545085, 0.0409174],
    [0.6773025, 0.0388109],
    [0.6996823, 0.0366700],
    [0.7215958, 0.0345058],
    [0.7429917, 0.0323294],
    [0.7638202, 0.0301515],
    [0.7840324, 0.0279828],
    [0.8035813, 0.0258337],
    [0.8224211, 0.0237142],
    [0.8405079, 0.0216347],
    [0.8577995, 0.0196051],
    [0.8742554, 0.0176353],
    [0.8898372, 0.0157351],
    [0.9045085, 0.0139143],
    [0.9182351, 0.0121823],
    [0.9309849, 0.0105485],
    [0.9427280, 0.0090217],
    [0.9534372, 0.0076108],
    [0.9630873, 0.0063238],
    [0.9716559, 0.0051685],
    [0.9791229, 0.0041519],
    [0.9854709, 0.0032804],
    [0.9906850, 0.0025595],
    [0.9947532, 0.0019938],
    [0.9976658, 0.0015870],
    [0.9994161, 0.0013419],
    [1.0000000, 0.0012600],
    [1.0000000, -0.0012600],
    [0.9994161, -0.0013419],
    [0.9976658, -0.0015870],
    [0.9947532, -0.0019938],
    [0.9906850, -0.0025595],
    [0.9854709, -0.0032804],
    [0.9791229, -0.0041519],
    [0.9716559, -0.0051685],
    [0.9630873, -0.0063238],
    [0.9534372, -0.0076108],
    [0.9427280, -0.0090217],
    [0.9309849, -0.0105485],
    [0.9182351, -0.0121823],
    [0.9045085, -0.0139143],
    [0.8898372, -0.0157351],
    [0.8742554, -0.0176353],
    [0.8577995, -0.0196051],
    [0.8405079, -0.0216347],
    [0.8224211, -0.0237142],
    [0.8035813, -0.0258337],
    [0.7840324, -0.0279828],
    [0.7638202, -0.0301515],
    [0.7429917, -0.0323294],
    [0.7215958, -0.0345058],
    [0.6996823, -0.0366700],
    [0.6773025, -0.0388109],
    [0.6545085, -0.0409174],
    [0.6313537, -0.0429778],
    [0.6078921, -0.0449802],
    [0.5841786, -0.0469124],
    [0.5602683, -0.0487619],
    [0.5362174, -0.0505161],
    [0.5120819, -0.0521620],
    [0.4879181, -0.0536866],
    [0.4637826, -0.0550769],
    [0.4397317, -0.0563200],
    [0.4158215, -0.0574033],
    [0.3921079, -0.0583145],
    [0.3686463, -0.0590419],
    [0.3454915, -0.0595747],
    [0.3226976, -0.0599028],
    [0.3003177, -0.0600172],
    [0.2784042, -0.0599102],
    [0.2570083, -0.0595755],
    [0.2361799, -0.0590081],
    [0.2159676, -0.0582048],
    [0.1964187, -0.0571640],
    [0.1775789, -0.0558856],
    [0.1594921, -0.0543715],
    [0.1422005, -0.0526251],
    [0.1257446, -0.0506513],
    [0.1101628, -0.0484567],
    [0.0954915, -0.0460489],
    [0.0817649, -0.0434371],
    [0.0690152, -0.0406310],
    [0.0572720, -0.0376414],
    [0.0465628, -0.0344792],
    [0.0369127, -0.0311559],
    [0.0283441, -0.0276827],
    [0.0208771, -0.0240706],
    [0.0145291, -0.0203300],
    [0.0093149, -0.0164706],
    [0.0052468, -0.0125011],
    [0.0023342, -0.0084289],
    [0.0005839, -0.0042603],
    [0.0000000, 0.0000000],
  ];

  // Update dimensions on mount and resize with padding
  useEffect(() => {
    const updateDimensions = () => {
      if (mountRef.current && mountRef.current.parentElement) {
        const container = mountRef.current.parentElement;
        const computedStyle = window.getComputedStyle(container);
        
        // Calculate available space considering padding
        const paddingX = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
        const paddingY = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
        
        const width = Math.max(0, container.clientWidth - paddingX);
        const height = Math.max(0, container.clientHeight - paddingY);
        
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  useEffect(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return;

    // Cleanup previous scene if it exists
    if (rendererRef.current && mountRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
      mountRef.current.removeChild(rendererRef.current.domElement);
    }

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('white');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, dimensions.width / dimensions.height, 0.1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(0,0,0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(dimensions.width, dimensions.height);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI;
    controls.minDistance = 1;
    controls.maxDistance = 100;
    controlsRef.current = controls;

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Add axes helper
    
    const axesHelper = new THREE.AxesHelper(1);
    scene.add(axesHelper);
    // Enhanced Axes Helper with Labels
    const axesSize = D *  1.5; // Scale axes based on propeller diameter
    const axesLineWidth = 3; // Thicker lines

    // Create colored lines for each axis
    const axes = [
      { color: 0xff0000, direction: new THREE.Vector3(1, 0, 0) }, // X - Red
      { color: 0x00ff00, direction: new THREE.Vector3(0, 1, 0) }, // Y - Green
      { color: 0x0000ff, direction: new THREE.Vector3(0, 0, 1) }  // Z - Blue
    ];

    const axesGroup = new THREE.Group();
    axes.forEach((axis) => {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3().copy(axis.direction).multiplyScalar(axesSize)
      ]);
      
      const lineMaterial = new THREE.LineBasicMaterial({
        color: axis.color,
        linewidth: axesLineWidth
      });
      
      const line = new THREE.Line(lineGeometry, lineMaterial);
      axesGroup.add(line);
    });

    // Add arrowheads
    const arrowheadSize = axesSize * 0.1;
    axes.forEach((axis) => {
      const arrowhead = new THREE.Mesh(
        new THREE.ConeGeometry(arrowheadSize * 0.2, arrowheadSize, 16),
        new THREE.MeshBasicMaterial({ color: axis.color })
      );
      arrowhead.position.copy(axis.direction).multiplyScalar(axesSize);
      arrowhead.lookAt(new THREE.Vector3(0, 0, 0));
      arrowhead.rotateX(-Math.PI/2); // Correct cone orientation
      axesGroup.add(arrowhead);
    });

    // Add labels
    const labelDistance = axesSize * 1.1;
    const createLabel = (text, color, position) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.font = 'Bold 40px Arial';
    context.fillStyle = `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 1)`;
    context.textAlign = 'center';
    context.fillText(text, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.5, 0.5, 0.5);
    sprite.position.copy(position);
    axesGroup.add(sprite);
  };

    createLabel('X', new THREE.Color(1, 0, 0), new THREE.Vector3(labelDistance, 0, 0));
    createLabel('Y', new THREE.Color(0, 1, 0), new THREE.Vector3(0, labelDistance, 0));
    createLabel('Z', new THREE.Color(0, 0, 1), new THREE.Vector3(0, 0, labelDistance));

    scene.add(axesGroup);

    // Convert airfoil to shape with chord length scaling
    const shape = new THREE.Shape();

    // Calculate scaling factor (original airfoil has chord length of 1.0)
    const chord = D * cOverD;
    const scaleFactor = chord; // Since original coordinates go from 0 to 1

    // Create scaled airfoil shape
    airfoilCoords.forEach(([x, y], i) => {
      const scaledX = x * scaleFactor;
      const scaledY = y * scaleFactor;
      if (i === 0) {
        shape.moveTo(scaledX, scaledY);
      } else {
        shape.lineTo(scaledX, scaledY);
      }
    });

    // Wing geometry
    const span = D * bOverD / 2;
    const extrudeSettings = { 
      depth: span, 
      bevelEnabled: false 
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateY(Math.PI / 2);  // Rotate to align with X-axis
    geometry.center();  // Center the geometry at origin

    const material = new THREE.MeshStandardMaterial({ 
      color: 0x0077ff,
      side: THREE.DoubleSide,
      metalness: 0.3,
      roughness: 0.7
    });

    const wingMesh = new THREE.Mesh(geometry, material);
    wingMeshRef.current = wingMesh;
    scene.add(wingMesh);

    // Propeller geometry
    const propRadius = (D / 2);
    const propThickness = 0.05;
    const propGeometry = new THREE.CylinderGeometry(propRadius, propRadius, propThickness, 64);
    const propMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.8
    });

    const propellerMesh = new THREE.Mesh(propGeometry, propMaterial);
    
    // Position propeller in front of wing (positive Z direction)
    // Wing leading edge is at -chord/2 after translation
    const xPos = span * (propLocation - 0.5); // Along Span
    const yPos = 0; // Along the vertical axis
    const zPos = chord/2 + 0.5; // Small offset in front of wing
    
    propellerMesh.position.set(xPos, yPos, zPos);
    propellerMesh.rotation.set(0, 0, 0);
    propellerMesh.rotateX(Math.PI/2); // Orient propeller disk to face forward
    
    propellerMeshRef.current = propellerMesh;
    scene.add(propellerMesh);


    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update(); // only required if controls.enableDamping = true
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('resize', handleResize);

      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      geometry.dispose();
      propGeometry.dispose();
      material.dispose();
      propMaterial.dispose();
    };
  }, [bOverD, D, propLocation]);

  return <div ref={mountRef} style={{ width: '100%', height: '500px', overflow: 'hidden', boxSizing: 'border-box' }} />;
};

export default Prowim3Dmodel;
