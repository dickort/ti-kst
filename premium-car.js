import * as THREE from "https://esm.sh/three@0.169.0";
import { GLTFLoader } from "https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js";

const stage = document.getElementById("stageWrap");
if (!stage || !window.WebGLRenderingContext) {
  // The procedural scene remains the fallback.
} else {
  const canvas = document.createElement("canvas");
  canvas.className = "premium-car-canvas";
  canvas.setAttribute("aria-label", "Интерактивная 3D-модель автомобиля");
  stage.appendChild(canvas);

  const loading = document.createElement("div");
  loading.className = "premium-car-loading";
  loading.textContent = "Loading 3D / 0%";
  stage.appendChild(loading);
  stage.classList.add("premium-loading");

  const credit = document.createElement("a");
  credit.className = "model-credit";
  credit.href = "https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept";
  credit.target = "_blank";
  credit.rel = "noopener";
  credit.textContent = "3D asset · CarConcept · CC BY 4.0";
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
      setDirection(key);
      const tab = document.querySelector(`.direction-tab[data-direction="${key}"]`);
      if (tab) tab.click();
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
  renderer.toneMappingExposure = 1.14;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 820 ? 1.2 : 1.55));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080808, 0.035);

  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 80);
  let targetDistance = window.innerWidth < 820 ? 8.5 : 7.6;
  let currentDistance = targetDistance;

  scene.add(new THREE.HemisphereLight(0xb8c2da, 0x090a08, 2.0));

  const keyLight = new THREE.SpotLight(0xffffff, 150, 32, Math.PI / 5.2, 0.55, 1.2);
  keyLight.position.set(4.5, 8.5, 5.5);
  keyLight.target.position.set(0, 0.7, 0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight, keyLight.target);

  const rimLight = new THREE.SpotLight(0x7995ff, 95, 28, Math.PI / 4.2, 0.62, 1.25);
  rimLight.position.set(-5.5, 4.8, -4.5);
  rimLight.target.position.set(0, 0.9, 0);
  scene.add(rimLight, rimLight.target);

  const stripLight = new THREE.RectAreaLight(0xd8ff3e, 5.5, 2.2, 0.45);
  stripLight.position.set(3.4, 1.2, -1.4);
  stripLight.lookAt(0, 0.8, 0);
  scene.add(stripLight);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(15, 96),
    new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 0.62, metalness: 0.12 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.13;
  floor.receiveShadow = true;
  scene.add(floor);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(3.55, 3.82, 0.18, 96),
    new THREE.MeshPhysicalMaterial({ color: 0x0f1011, roughness: 0.25, metalness: 0.82, clearcoat: 0.55 })
  );
  platform.position.y = -0.04;
  platform.receiveShadow = true;
  platform.castShadow = true;
  scene.add(platform);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.62, 0.012, 8, 128),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.055;
  scene.add(ring);

  const carRig = new THREE.Group();
  carRig.position.y = 0.08;
  scene.add(carRig);

  let carModel = null;
  let targetRotation = -0.42;
  let currentRotation = -0.42;
  let pointerDown = false;
  let lastX = 0;
  let userHasInteracted = false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const directionAngles = {
    preserve: -0.48,
    restore: 0.46,
    tune: 1.16
  };

  function setDirection(key) {
    if (!(key in directionAngles)) return;
    targetRotation = directionAngles[key];
    targetDistance = window.innerWidth < 820 ? 7.9 : 6.95;
    userHasInteracted = true;
    Object.entries(hotspots).forEach(([name, element]) => element.classList.toggle("active", name === key));
  }

  document.addEventListener("click", (event) => {
    const directionTarget = event.target.closest("[data-direction]");
    if (directionTarget?.dataset.direction) setDirection(directionTarget.dataset.direction);
    if (event.target.closest(".panel-close")) {
      targetDistance = window.innerWidth < 820 ? 8.5 : 7.6;
      Object.values(hotspots).forEach(el => el.classList.remove("active"));
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    pointerDown = true;
    lastX = event.clientX;
    userHasInteracted = true;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!pointerDown) return;
    const dx = event.clientX - lastX;
    targetRotation += dx * 0.008;
    lastX = event.clientX;
  });
  const endPointer = (event) => {
    pointerDown = false;
    if (event?.pointerId != null && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  const loader = new GLTFLoader();
  const modelUrl = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/GLB/CarConcept.glb";

  loader.load(
    modelUrl,
    (gltf) => {
      carModel = gltf.scene;
      carModel.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
        if (/khronos/i.test(node.name || "")) node.visible = false;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.filter(Boolean).forEach((material) => {
          if (/paint/i.test(material.name || "")) {
            material.color?.set(0x111317);
            if ("metalness" in material) material.metalness = Math.max(material.metalness ?? 0, 0.72);
            if ("roughness" in material) material.roughness = 0.18;
            if ("clearcoat" in material) material.clearcoat = 1;
            if ("clearcoatRoughness" in material) material.clearcoatRoughness = 0.08;
            material.needsUpdate = true;
          }
        });
      });

      // Fit the production model into the existing hero composition.
      let bounds = new THREE.Box3().setFromObject(carModel);
      const size = bounds.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.z);
      const scale = 5.15 / Math.max(longest, 0.001);
      carModel.scale.setScalar(scale);
      bounds = new THREE.Box3().setFromObject(carModel);
      const center = bounds.getCenter(new THREE.Vector3());
      carModel.position.x -= center.x;
      carModel.position.z -= center.z;
      carModel.position.y -= bounds.min.y;
      carRig.add(carModel);

      stage.classList.remove("premium-loading");
      stage.classList.add("premium-ready");
      Object.values(hotspots).forEach(el => {
        el.style.opacity = "1";
        el.style.pointerEvents = "auto";
      });
    },
    (event) => {
      if (event.total) {
        const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
        loading.textContent = `Loading 3D / ${percent}%`;
      } else {
        loading.textContent = "Loading 3D";
      }
    },
    (error) => {
      console.warn("Premium car model could not load; procedural fallback remains active.", error);
      stage.classList.remove("premium-loading");
      canvas.remove();
      loading.remove();
      credit.remove();
      Object.values(hotspots).forEach(el => el.remove());
    }
  );

  const anchorMap = {
    preserve: new THREE.Vector3(0.82, 0.9, -1.45),
    restore: new THREE.Vector3(-0.72, 1.08, 0.18),
    tune: new THREE.Vector3(0.9, 0.48, 1.42)
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
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  const clock = new THREE.Clock();
  function render() {
    const delta = Math.min(clock.getDelta(), 0.05);
    const ease = reducedMotion ? 1 : 1 - Math.pow(0.0015, delta);
    currentRotation += (targetRotation - currentRotation) * ease;
    currentDistance += (targetDistance - currentDistance) * ease;

    if (!reducedMotion && !pointerDown && !userHasInteracted && carModel) {
      targetRotation = -0.42 + Math.sin(performance.now() * 0.00022) * 0.09;
    }

    carRig.rotation.y = currentRotation;
    if (!reducedMotion) platform.rotation.y += delta * 0.01;

    const mobile = window.innerWidth < 820;
    camera.position.set(mobile ? 0.15 : 0.35, mobile ? 2.25 : 2.45, currentDistance);
    camera.lookAt(0, mobile ? 0.78 : 0.88, 0);

    renderer.render(scene, camera);
    updateHotspots();
  }
  renderer.setAnimationLoop(render);
}
