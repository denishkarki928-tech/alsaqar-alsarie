import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

(function(){
  var hero = document.querySelector('.hero');
  var canvas = document.getElementById('hero-3d-canvas');
  if (!hero || !canvas) return;

  // The 3D layer now runs on mobile too, just lighter: fewer shapes and a
  // capped pixel ratio so phones stay smooth and don't cook the battery.
  var isSmallScreen = window.matchMedia('(max-width: 640px)').matches;
  var maxPixelRatio = isSmallScreen ? 1.5 : 2;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) {
    return; // WebGL unavailable — CSS blobs remain visible
  }

  function cssVar(name, fallback){
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  var scene = new THREE.Scene();
  // Fog fades distant shapes into the page background so the field reads as
  // deep and immersive. Tinting it to --bg (not black) keeps shapes from
  // going muddy-grey in light mode; it's refreshed on theme toggle below.
  scene.fog = new THREE.Fog(new THREE.Color(cssVar('--bg', '#FBF2E4')), 20, 44);
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 22);

  var ambient = new THREE.AmbientLight(0xffffff, 1.1);
  scene.add(ambient);
  var key = new THREE.PointLight(0xffffff, 180, 120);
  key.position.set(10, 12, 16);
  scene.add(key);
  var fill = new THREE.PointLight(0xffffff, 80, 120);
  fill.position.set(-12, -6, 10);
  scene.add(fill);
  // Warm colored rim lights give the glassy shapes a rich, jewel-like glow.
  var rimWarm = new THREE.PointLight(0xffb26b, 90, 100);
  rimWarm.position.set(-14, 8, -6);
  scene.add(rimWarm);
  var rimGold = new THREE.PointLight(0xffe3a3, 70, 100);
  rimGold.position.set(14, -8, -4);
  scene.add(rimGold);

  var group = new THREE.Group();
  scene.add(group);

  var paletteVars = ['--accent', '--primary', '--secondary', '--accent-soft'];
  var paletteFallback = ['#C9962C', '#A8451C', '#6B3A22', '#E8C873'];
  function readPalette(){
    return paletteVars.map(function(name, i){ return cssVar(name, paletteFallback[i]); });
  }
  var palette = readPalette();

  // A shared pool of smoother, higher-detail geometries reused across the
  // field (instances share geometry buffers so many shapes stay cheap).
  var geoPool = [
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.SphereGeometry(1, 48, 48),
    new THREE.TorusGeometry(0.75, 0.32, 32, 80),
    new THREE.OctahedronGeometry(1, 0),
    new THREE.TorusKnotGeometry(0.6, 0.22, 90, 16)
  ];

  // Scatter shapes across a wide volume covering the full hero, biased
  // toward the back (negative z) so they float behind the text plane.
  var COUNT = isSmallScreen ? 16 : 32;
  var SPREAD_X = isSmallScreen ? 10 : 19;
  var SPREAD_Y = isSmallScreen ? 14 : 11;
  var meshes = [];
  function rand(min, max){ return min + Math.random() * (max - min); }
  for (var i = 0; i < COUNT; i++){
    var geo = geoPool[i % geoPool.length];
    var color = new THREE.Color(palette[i % palette.length]);
    var material = new THREE.MeshPhysicalMaterial({
      color: color,
      metalness: 0.35,
      roughness: 0.12,
      transmission: 0.65,
      thickness: 1.6,
      ior: 1.4,
      transparent: true,
      opacity: 0.58,
      clearcoat: 1.0,
      clearcoatRoughness: 0.15,
      emissive: color.clone(),
      emissiveIntensity: 0.18,
      // Iridescence adds a soft oil-slick sheen that shifts as shapes rotate.
      iridescence: 0.5,
      iridescenceIOR: 1.3
    });
    var mesh = new THREE.Mesh(geo, material);
    var depth = rand(-24, -9); // kept behind the text plane for readability
    // Bigger shapes overall, with a few standout large ones for drama.
    var scale = (Math.random() < 0.2) ? rand(1.5, 2.2) : rand(0.6, 1.3);
    mesh.position.set(rand(-SPREAD_X, SPREAD_X), rand(-SPREAD_Y, SPREAD_Y), depth);
    mesh.scale.setScalar(scale);
    mesh.rotation.set(rand(0, Math.PI), rand(0, Math.PI), 0);
    mesh.userData.baseY = mesh.position.y;
    mesh.userData.baseX = mesh.position.x;
    mesh.userData.floatOffset = rand(0, Math.PI * 2);
    mesh.userData.floatAmp = rand(0.5, 1.3);
    mesh.userData.driftSpeed = rand(0.14, 0.36);
    mesh.userData.rotSpeed = rand(0.18, 0.42);
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
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
      var c = refreshed[i % refreshed.length];
      mesh.material.color.set(c);
      mesh.material.emissive.set(c);
    });
    scene.fog.color.set(cssVar('--bg', '#FBF2E4'));
    if (reduceMotion) renderFrame();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();
