import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

(function(){
  var hero = document.querySelector('.hero');
  var canvas = document.getElementById('hero-3d-canvas');
  if (!hero || !canvas) return;

  var isSmallScreen = window.matchMedia('(max-width: 640px)').matches;
  if (isSmallScreen) return; // keep the plain CSS blobs on mobile

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) {
    return; // WebGL unavailable — CSS blobs remain visible
  }

  var scene = new THREE.Scene();
  // Fog fades distant shapes into the background so the field reads as an
  // immersive, deep backdrop rather than a flat cluster — and keeps far
  // shapes from competing with the hero text for attention.
  scene.fog = new THREE.Fog(0x000000, 18, 42);
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 22);

  function cssVar(name, fallback){
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  var ambient = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambient);
  var key = new THREE.PointLight(0xffffff, 120, 90);
  key.position.set(10, 12, 16);
  scene.add(key);
  var fill = new THREE.PointLight(0xffffff, 60, 90);
  fill.position.set(-12, -6, 10);
  scene.add(fill);

  var group = new THREE.Group();
  scene.add(group);

  var paletteVars = ['--accent', '--primary', '--secondary', '--accent-soft'];
  var paletteFallback = ['#C9962C', '#A8451C', '#6B3A22', '#E8C873'];
  function readPalette(){
    return paletteVars.map(function(name, i){ return cssVar(name, paletteFallback[i]); });
  }
  var palette = readPalette();

  // A shared pool of low-poly geometries reused across the whole field so
  // we can scatter many shapes cheaply (instances share geometry buffers).
  var geoPool = [
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.SphereGeometry(1, 24, 24),
    new THREE.TorusGeometry(0.8, 0.3, 16, 40),
    new THREE.OctahedronGeometry(1, 0)
  ];

  // Scatter shapes across a wide volume covering the full hero, biased
  // toward the back (negative z) so most float behind the text plane.
  var COUNT = 26;
  var SPREAD_X = 18, SPREAD_Y = 11;
  var meshes = [];
  function rand(min, max){ return min + Math.random() * (max - min); }
  for (var i = 0; i < COUNT; i++){
    var geo = geoPool[i % geoPool.length];
    var material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(palette[i % palette.length]),
      metalness: 0.2,
      roughness: 0.35,
      transmission: 0.6,
      thickness: 1.0,
      transparent: true,
      opacity: 0.5,
      clearcoat: 0.5
    });
    var mesh = new THREE.Mesh(geo, material);
    var depth = rand(-26, -7); // all shapes sit well behind the text plane
    var scale = rand(0.3, 0.85);
    mesh.position.set(rand(-SPREAD_X, SPREAD_X), rand(-SPREAD_Y, SPREAD_Y), depth);
    mesh.scale.setScalar(scale);
    mesh.rotation.set(rand(0, Math.PI), rand(0, Math.PI), 0);
    mesh.userData.baseY = mesh.position.y;
    mesh.userData.baseX = mesh.position.x;
    mesh.userData.floatOffset = rand(0, Math.PI * 2);
    mesh.userData.floatAmp = rand(0.35, 0.9);
    mesh.userData.driftSpeed = rand(0.12, 0.32);
    mesh.userData.rotSpeed = rand(0.14, 0.34);
    group.add(mesh);
    meshes.push(mesh);
  }

  var pointer = { x: 0, y: 0 };
  var targetRotX = 0, targetRotY = 0;
  var targetPanX = 0, targetPanY = 0;

  function onPointerMove(e){
    var rect = hero.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    // subtle whole-field parallax + tilt toward the cursor
    targetRotY = pointer.x * 0.12;
    targetRotX = pointer.y * 0.08;
    targetPanX = pointer.x * 1.6;
    targetPanY = -pointer.y * 1.0;
  }
  window.addEventListener('mousemove', onPointerMove, { passive: true });

  function resize(){
    var rect = hero.getBoundingClientRect();
    var width = Math.max(rect.width, 1);
    var height = Math.max(rect.height, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(hero);
  } else {
    window.addEventListener('resize', resize, { passive: true });
  }

  var running = false;
  var clock = new THREE.Clock();

  function renderFrame(){
    var t = clock.getElapsedTime();
    meshes.forEach(function(mesh){
      var d = mesh.userData;
      mesh.rotation.x += d.rotSpeed * 0.008;
      mesh.rotation.y += d.rotSpeed * 0.012;
      mesh.position.y = d.baseY + Math.sin(t * d.driftSpeed * 3 + d.floatOffset) * d.floatAmp;
      mesh.position.x = d.baseX + Math.cos(t * d.driftSpeed * 2 + d.floatOffset) * d.floatAmp * 0.6;
    });
    group.rotation.y += (targetRotY - group.rotation.y) * 0.04;
    group.rotation.x += (targetRotX - group.rotation.x) * 0.04;
    group.position.x += (targetPanX - group.position.x) * 0.03;
    group.position.y += (targetPanY - group.position.y) * 0.03;
    renderer.render(scene, camera);
  }

  function animate(){
    if (!running) return;
    renderFrame();
    requestAnimationFrame(animate);
  }

  function start(){
    if (running) return;
    running = true;
    if (reduceMotion) {
      renderFrame(); // single static frame, no loop
    } else {
      requestAnimationFrame(animate);
    }
  }
  function stop(){
    running = false;
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) start(); else stop();
      });
    }, { threshold: 0.05 });
    io.observe(hero);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', function(){
    if (document.hidden) stop(); else if (!reduceMotion) start();
  });

  // Re-tint shapes when the light/dark theme toggle flips the CSS custom
  // properties, so colors don't stay stuck on whichever theme was active
  // when the page first loaded.
  var themeObserver = new MutationObserver(function(){
    var refreshed = readPalette();
    meshes.forEach(function(mesh, i){
      mesh.material.color.set(refreshed[i % refreshed.length]);
    });
    if (reduceMotion) renderFrame();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();
