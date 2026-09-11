import * as THREE from "https://esm.sh/three@0.169.0";
import { GLTFLoader } from "https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js";

const stage = document.getElementById("stageWrap");
if (!stage || !window.WebGLRenderingContext) {
  // The original procedural scene remains the fallback.
} else {
  const mobile = () => window.innerWidth < 820;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.className = "premium-car-canvas";
  canvas.setAttribute("aria-label", "Интерактивная 3D-модель Mercedes-AMG GT 63 S");
  canvas.style.touchAction = "none";
  stage.appendChild(canvas);

  const loading = document.createElement("div");
  loading.className = "premium-car-loading";
  loading.textContent = "AMG 3D / 0%";
  stage.appendChild(loading);
  stage.classList.add("premium-loading");

  const credit = document.createElement("div");
  credit.className = "model-credit";
  credit.textContent = "3D · Mercedes-AMG GT 63 S";
  stage.appendChild(credit);

  const hotspotData = {
    preserve: { index: "01", label: "Сохранить" },
    restore: { index: "02", label: "Восстановить" },
    tune: { index: "03", label: "Тюнинг" }
  };

  const hotspots = {};
  Object.entries(hotspotData).forEach(([key, item]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "premium-hotspot";
    button.dataset.direction = key;
    button.setAttribute("aria-label", item.label);
    button.innerHTML = `<span class="dot"></span><span class="label"><b>${item.index}</b>${item.label}</span>`;
    button.style.opacity = "0";
    button.style.pointerEvents = "none";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const tab = document.querySelector(`.direction-tab[data-direction="${key}"]`);
      if (tab) tab.click();
      else setDirection(key);
    });
    stage.appendChild(button);
    hotspots[key] = button;
  });

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.15 : 1.25));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080808, 0.032);

  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 80);

  // Front-facing opening composition. The imported AMG points forward on +Z.
  let targetRotation = 0;
  let currentRotation = 0;
  let targetDistance = mobile() ? 7.35 : 6.65;
  let currentDistance = targetDistance;
  let targetCameraX = 0;
  let currentCameraX = 0;
  let targetCameraY = mobile() ? 2.15 : 2.28;
  let currentCameraY = targetCameraY;
  let targetLookX = 0;
  let currentLookX = 0;
  let targetLookY = mobile() ? 0.73 : 0.80;
  let currentLookY = targetLookY;
  let motionTween = null;

  scene.add(new THREE.HemisphereLight(0xb8c2da, 0x090a08, 1.85));

  const keyLight = new THREE.SpotLight(0xffffff, 140, 30, Math.PI / 5.1, 0.58, 1.25);
  keyLight.position.set(4.2, 8.2, 5.0);
  keyLight.target.position.set(0, 0.75, 0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight, keyLight.target);

  const rimLight = new THREE.SpotLight(0x7995ff, 88, 28, Math.PI / 4.2, 0.65, 1.25);
  rimLight.position.set(-5.0, 4.8, -4.2);
  rimLight.target.position.set(0, 0.9, 0);
  scene.add(rimLight, rimLight.target);

  const stripLight = new THREE.RectAreaLight(0xd8ff3e, 4.8, 2.1, 0.42);
  stripLight.position.set(3.2, 1.25, -1.3);
  stripLight.lookAt(0, 0.8, 0);
  scene.add(stripLight);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(15, 72),
    new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 0.64, metalness: 0.1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.13;
  floor.receiveShadow = true;
  scene.add(floor);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(3.55, 3.82, 0.18, 72),
    new THREE.MeshPhysicalMaterial({ color: 0x0f1011, roughness: 0.27, metalness: 0.82, clearcoat: 0.5 })
  );
  platform.position.y = -0.04;
  platform.receiveShadow = true;
  platform.castShadow = true;
  scene.add(platform);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.62, 0.012, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.055;
  scene.add(ring);

  const carRig = new THREE.Group();
  carRig.position.y = 0.08;
  scene.add(carRig);

  let carModel = null;
  let pointerDown = false;
  let lastX = 0;
  let lastY = 0;

  const directionAngles = {
    preserve: -0.58,
    restore: 0.62,
    tune: 1.38
  };

  function smootherStep(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * x * (x * (x * 6 - 15) + 10);
  }

  function shortestTargetAngle(from, to) {
    const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
    return from + delta;
  }

  function startCameraMotion({ rotation, distance, cameraX, cameraY, lookX = 0, lookY, duration = 1600 }) {
    targetRotation = rotation;
    targetDistance = distance;
    targetCameraX = cameraX;
    targetCameraY = cameraY;
    targetLookX = lookX;
    targetLookY = lookY;

    if (reducedMotion) {
      currentRotation = rotation;
      currentDistance = distance;
      currentCameraX = cameraX;
      currentCameraY = cameraY;
      currentLookX = lookX;
      currentLookY = lookY;
      motionTween = null;
      return;
    }

    motionTween = {
      fromRotation: currentRotation,
      toRotation: shortestTargetAngle(currentRotation, rotation),
      fromDistance: currentDistance,
      toDistance: distance,
      fromCameraX: currentCameraX,
      toCameraX: cameraX,
      fromCameraY: currentCameraY,
      toCameraY: cameraY,
      fromLookX: currentLookX,
      toLookX: lookX,
      fromLookY: currentLookY,
      toLookY: lookY,
      start: performance.now(),
      duration
    };
  }

  function setDirection(key) {
    if (!(key in directionAngles)) return;

    const isMobile = mobile();
    const targets = {
      preserve: {
        x: isMobile ? 0.02 : -0.10,
        y: isMobile ? 2.10 : 2.22,
        lookX: 0.06,
        lookY: isMobile ? 0.72 : 0.78
      },
      restore: {
        x: isMobile ? 0.08 : 0.16,
        y: isMobile ? 2.18 : 2.34,
        lookX: -0.02,
        lookY: isMobile ? 0.76 : 0.82
      },
      tune: {
        x: isMobile ? 0.14 : 0.28,
        y: isMobile ? 2.08 : 2.20,
        lookX: -0.08,
        lookY: isMobile ? 0.72 : 0.78
      }
    };
    const target = targets[key];

    startCameraMotion({
      rotation: directionAngles[key],
      distance: isMobile ? 6.55 : 5.72,
      cameraX: target.x,
      cameraY: target.y,
      lookX: target.lookX,
      lookY: target.lookY,
      duration: isMobile ? 1480 : 1650
    });

    flashParkingLights();
    Object.entries(hotspots).forEach(([name, element]) => element.classList.toggle("active", name === key));
  }

  document.addEventListener("click", (event) => {
    const directionTarget = event.target.closest("[data-direction]");
    if (directionTarget?.dataset.direction) setDirection(directionTarget.dataset.direction);

    if (event.target.closest(".panel-close")) {
      const isMobile = mobile();
      startCameraMotion({
        rotation: currentRotation,
        distance: isMobile ? 7.35 : 6.65,
        cameraX: 0,
        cameraY: isMobile ? 2.15 : 2.28,
        lookX: 0,
        lookY: isMobile ? 0.73 : 0.80,
        duration: 1150
      });
      Object.values(hotspots).forEach(el => el.classList.remove("active"));
    }
  });

  function cancelGuidedMotion() {
    motionTween = null;
    targetRotation = currentRotation;
    targetDistance = currentDistance;
    targetCameraX = currentCameraX;
    targetCameraY = currentCameraY;
    targetLookX = currentLookX;
    targetLookY = currentLookY;
  }

  canvas.addEventListener("pointerdown", (event) => {
    pointerDown = true;
    lastX = event.clientX;
    lastY = event.clientY;
    cancelGuidedMotion();
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointerDown) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    targetRotation += dx * (mobile() ? 0.010 : 0.0082);
    targetCameraY = THREE.MathUtils.clamp(targetCameraY - dy * 0.006, 1.55, 3.15);
    targetLookY = THREE.MathUtils.clamp(targetLookY - dy * 0.0018, 0.58, 1.05);
    lastX = event.clientX;
    lastY = event.clientY;
  });

  const endPointer = (event) => {
    pointerDown = false;
    if (event?.pointerId != null && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    cancelGuidedMotion();
    targetDistance = THREE.MathUtils.clamp(targetDistance + event.deltaY * 0.004, 5.15, 9.1);
  }, { passive: false });

  const parkingLightMaterials = new Map();
  const parkingFx = [];
  let parkingFxGroup = null;
  let parkingFlashStartedAt = -Infinity;
  let lastParkingFlashAt = -Infinity;

  function registerParkingLightMaterial(material, nodeName = "") {
    const identity = `${material?.name || ""} ${nodeName || ""}`;
    if (!material || !/(headlight|brakelight|signallight|front_drl|tail_lights)/i.test(identity)) return;
    if (parkingLightMaterials.has(material.uuid)) return;
    parkingLightMaterials.set(material.uuid, {
      material,
      baseIntensity: Number.isFinite(material.emissiveIntensity) ? material.emissiveIntensity : 1
    });
  }

  function createParkingLightFx() {
    if (parkingFxGroup) carRig.remove(parkingFxGroup);
    parkingFx.length = 0;
    parkingFxGroup = new THREE.Group();

    const entries = [
      { x:  0.82, y: 0.78, z:  2.67, color: 0xf3f8ff },
      { x: -0.82, y: 0.78, z:  2.67, color: 0xf3f8ff },
      { x:  0.82, y: 0.76, z: -2.67, color: 0xff273a },
      { x: -0.82, y: 0.76, z: -2.67, color: 0xff273a }
    ];

    entries.forEach((item) => {
      const mat = new THREE.MeshBasicMaterial({
        color: item.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 8), mat);
      glow.position.set(item.x, item.y, item.z);
      glow.renderOrder = 30;

      const light = new THREE.PointLight(item.color, 0, 2.5, 2);
      light.position.copy(glow.position);
      parkingFxGroup.add(glow, light);
      parkingFx.push({ glow, light });
    });

    carRig.add(parkingFxGroup);
  }

  function flashParkingLights() {
    if (reducedMotion) return;
    const now = performance.now();
    if (now - lastParkingFlashAt < 220) return;
    lastParkingFlashAt = now;
    parkingFlashStartedAt = now;
  }

  function updateParkingLights(now) {
    const elapsed = now - parkingFlashStartedAt;
    let pulse = 0;
    if (elapsed >= 0 && elapsed < 900) {
      const bell = (center, width) => Math.exp(-Math.pow((elapsed - center) / width, 2));
      pulse = Math.max(bell(120, 70), bell(430, 90));
    }

    parkingLightMaterials.forEach(({ material, baseIntensity }) => {
      material.emissiveIntensity = baseIntensity + pulse * 6.5;
    });

    parkingFx.forEach(({ glow, light }) => {
      glow.material.opacity = pulse * 0.82;
      glow.scale.setScalar(0.75 + pulse * 0.9);
      light.intensity = pulse * 10;
    });
  }

  const loader = new GLTFLoader();
  // The lighter LOD is intentionally used on desktop too: it is visibly close,
  // but materially smoother during guided camera moves and manual rotation.
  const modelUrl = "./assets/mercedes_amg_gt63s_mobile.glb";

  loader.load(
    modelUrl,
    (gltf) => {
      carModel = gltf.scene;
      carModel.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;

        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.filter(Boolean).forEach((material) => {
          registerParkingLightMaterial(material, node.name || "");

          if (/(paint|carpaint)/i.test(`${material.name || ""} ${node.name || ""}`)) {
            material.color?.set(0x10151c);
            if ("metalness" in material) material.metalness = Math.max(material.metalness ?? 0, 0.78);
            if ("roughness" in material) material.roughness = 0.16;
            if ("clearcoat" in material) material.clearcoat = 1;
            if ("clearcoatRoughness" in material) material.clearcoatRoughness = 0.06;
            material.needsUpdate = true;
          }

          if (/glass/i.test(`${material.name || ""} ${node.name || ""}`)) {
            material.transparent = true;
            material.opacity = Math.min(material.opacity ?? 1, 0.72);
            material.depthWrite = false;
            material.needsUpdate = true;
          }
        });
      });

      let bounds = new THREE.Box3().setFromObject(carModel);
      const size = bounds.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.z);
      const scale = 5.72 / Math.max(longest, 0.001);
      carModel.scale.setScalar(scale);

      bounds = new THREE.Box3().setFromObject(carModel);
      const center = bounds.getCenter(new THREE.Vector3());
      carModel.position.x -= center.x;
      carModel.position.z -= center.z;
      carModel.position.y -= bounds.min.y;
      carRig.add(carModel);
      createParkingLightFx();

      stage.classList.remove("premium-loading");
      stage.classList.add("premium-ready");
      loading.textContent = "Mercedes-AMG GT 63 S";
      Object.values(hotspots).forEach(el => {
        el.style.opacity = "1";
        el.style.pointerEvents = "auto";
      });
    },
    (event) => {
      if (event.total) {
        const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
        loading.textContent = `AMG 3D / ${percent}%`;
      } else {
        loading.textContent = "AMG 3D";
      }
    },
    (error) => {
      console.warn("Mercedes-AMG model could not load; procedural fallback remains active.", error);
      stage.classList.remove("premium-loading");
      canvas.remove();
      loading.remove();
      credit.remove();
      Object.values(hotspots).forEach(el => el.remove());
    }
  );

  // These coordinates are in the fitted carRig space after the AMG has been centered.
  const anchorMap = {
    preserve: new THREE.Vector3(0.82, 1.02, 2.08),
    restore: new THREE.Vector3(-0.78, 1.20, 0.25),
    tune: new THREE.Vector3(0.82, 0.72, -1.95)
  };
  const projected = new THREE.Vector3();

  function updateHotspots() {
    if (!carModel || !stage.classList.contains("premium-ready")) return;
    const rect = stage.getBoundingClientRect();
    Object.entries(anchorMap).forEach(([name, anchor]) => {
      projected.copy(anchor);
      carRig.localToWorld(projected);
      projected.project(camera);
      const x = (projected.x * 0.5 + 0.5) * rect.width;
      const y = (-projected.y * 0.5 + 0.5) * rect.height;
      const visible = projected.z < 1 && x > 0 && x < rect.width && y > 0 && y < rect.height;
      const element = hotspots[name];
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.opacity = visible ? "1" : "0";
      element.style.pointerEvents = visible ? "auto" : "none";
    });
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.15 : 1.25));
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  const clock = new THREE.Clock();
  function render() {
    const delta = Math.min(clock.getDelta(), 0.05);
    const now = performance.now();

    if (motionTween && !reducedMotion) {
      const progress = Math.max(0, Math.min(1, (now - motionTween.start) / motionTween.duration));
      const eased = smootherStep(progress);
      currentRotation = THREE.MathUtils.lerp(motionTween.fromRotation, motionTween.toRotation, eased);
      currentDistance = THREE.MathUtils.lerp(motionTween.fromDistance, motionTween.toDistance, eased);
      currentCameraX = THREE.MathUtils.lerp(motionTween.fromCameraX, motionTween.toCameraX, eased);
      currentCameraY = THREE.MathUtils.lerp(motionTween.fromCameraY, motionTween.toCameraY, eased);
      currentLookX = THREE.MathUtils.lerp(motionTween.fromLookX, motionTween.toLookX, eased);
      currentLookY = THREE.MathUtils.lerp(motionTween.fromLookY, motionTween.toLookY, eased);

      if (progress >= 1) {
        currentRotation = motionTween.toRotation;
        currentDistance = motionTween.toDistance;
        currentCameraX = motionTween.toCameraX;
        currentCameraY = motionTween.toCameraY;
        currentLookX = motionTween.toLookX;
        currentLookY = motionTween.toLookY;
        targetRotation = currentRotation;
        targetDistance = currentDistance;
        targetCameraX = currentCameraX;
        targetCameraY = currentCameraY;
        targetLookX = currentLookX;
        targetLookY = currentLookY;
        motionTween = null;
      }
    } else {
      const rotLambda = pointerDown ? 16 : 9;
      currentRotation = THREE.MathUtils.damp(currentRotation, targetRotation, rotLambda, delta);
      currentDistance = THREE.MathUtils.damp(currentDistance, targetDistance, 8, delta);
      currentCameraX = THREE.MathUtils.damp(currentCameraX, targetCameraX, 8, delta);
      currentCameraY = THREE.MathUtils.damp(currentCameraY, targetCameraY, 8, delta);
      currentLookX = THREE.MathUtils.damp(currentLookX, targetLookX, 8, delta);
      currentLookY = THREE.MathUtils.damp(currentLookY, targetLookY, 8, delta);
    }

    carRig.rotation.y = currentRotation;
    if (!reducedMotion) platform.rotation.y += delta * 0.006;

    camera.position.set(currentCameraX, currentCameraY, currentDistance);
    camera.lookAt(currentLookX, currentLookY, 0);

    updateParkingLights(now);
    renderer.render(scene, camera);
    updateHotspots();
  }

  renderer.setAnimationLoop(render);
}
