from pathlib import Path

path = Path('premium-car.js')
text = path.read_text(encoding='utf-8')

# ---------------------------------------------------------------------------
# TI Detailing interior interaction prototype.
# The driver door is separated at runtime from the optimized AMG GLB, so no
# additional binary asset is required. Selecting "Салон" rotates the car,
# moves the camera closer, opens the door and reveals interior-service links.
# ---------------------------------------------------------------------------

text = text.replace(
'''  let carModel = null;
  let pointerDown = false;''',
'''  let carModel = null;
  let driverDoorPivot = null;
  let driverDoorOpen = false;
  let doorTween = null;
  let pointerDown = false;''',
1)

renderer_marker = '''  const renderer = new THREE.WebGLRenderer({'''
if renderer_marker not in text:
    raise SystemExit('Interior door: renderer marker not found')

ui = '''  const interiorDoorTrigger = document.createElement("button");
  interiorDoorTrigger.type = "button";
  interiorDoorTrigger.className = "interior-door-trigger";
  interiorDoorTrigger.setAttribute("aria-label", "Открыть салон");
  interiorDoorTrigger.setAttribute("aria-pressed", "false");
  interiorDoorTrigger.innerHTML = `<span class="interior-door-dot"></span><span class="interior-door-label">Салон</span>`;
  interiorDoorTrigger.style.opacity = "0";
  interiorDoorTrigger.style.pointerEvents = "none";
  stage.appendChild(interiorDoorTrigger);

  const interiorPanel = document.createElement("aside");
  interiorPanel.className = "interior-service-panel";
  interiorPanel.setAttribute("aria-hidden", "true");
  interiorPanel.innerHTML = `
    <button class="interior-panel-close" type="button" aria-label="Закрыть салон">×</button>
    <div class="interior-panel-index">INTERIOR / 01</div>
    <div class="interior-panel-kicker">Салон</div>
    <h3>Уход и восстановление интерьера</h3>
    <p>Выберите зону или услугу. Дверь и камера помогают показать, с какой частью автомобиля связана работа.</p>
    <nav class="interior-service-links" aria-label="Услуги салона">
      <a href="./service.html?service=interior-clean"><span>Химчистка салона</span><b>↗</b></a>
      <a href="./service.html?service=leather"><span>Восстановление кожи</span><b>↗</b></a>
      <a href="./service.html?service=plastic"><span>Восстановление пластика</span><b>↗</b></a>
      <a href="./service.html?service=steering"><span>Перешив руля</span><b>↗</b></a>
      <a href="./service.html?service=interior-trim"><span>Перешив элементов салона</span><b>↗</b></a>
      <a href="./service.html?service=soundproof"><span>Шумоизоляция</span><b>↗</b></a>
      <a href="./service.html?service=ambient"><span>Ambient-подсветка</span><b>↗</b></a>
    </nav>`;
  document.querySelector(".hero")?.appendChild(interiorPanel);

'''
text = text.replace(renderer_marker, ui + renderer_marker, 1)

loader_marker = '''  const loader = new GLTFLoader();'''
if loader_marker not in text:
    raise SystemExit('Interior door: loader marker not found')

helpers = r'''  function buildGeometryFromTriangles(source, selectedTriangles, keepSelected) {
    const src = source.index ? source.toNonIndexed() : source.clone();
    const position = src.getAttribute("position");
    if (!position || position.count < 3) return null;

    const attributes = {};
    Object.entries(src.attributes).forEach(([name, attr]) => {
      attributes[name] = { itemSize: attr.itemSize, normalized: attr.normalized, values: [] };
    });

    let copied = 0;
    const triCount = Math.floor(position.count / 3);
    for (let tri = 0; tri < triCount; tri++) {
      const isSelected = selectedTriangles[tri] === true;
      if (isSelected !== keepSelected) continue;
      copied++;
      for (let v = 0; v < 3; v++) {
        const index = tri * 3 + v;
        Object.entries(src.attributes).forEach(([name, attr]) => {
          const out = attributes[name].values;
          for (let k = 0; k < attr.itemSize; k++) out.push(attr.array[index * attr.itemSize + k]);
        });
      }
    }
    if (!copied) return null;

    const geometry = new THREE.BufferGeometry();
    Object.entries(attributes).forEach(([name, data]) => {
      geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(data.values), data.itemSize, data.normalized));
    });
    try {
      const merged = mergeVertices(geometry, 0.00006);
      merged.computeVertexNormals();
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      return merged;
    } catch (error) {
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      return geometry;
    }
  }

  function splitGeometryForDriverDoor(node, predicate) {
    const source = node.geometry?.index ? node.geometry.toNonIndexed() : node.geometry?.clone();
    const position = source?.getAttribute("position");
    if (!position || position.count < 3) return null;

    const selected = [];
    let selectedCount = 0;
    const triCount = Math.floor(position.count / 3);
    for (let tri = 0; tri < triCount; tri++) {
      let cx = 0, cy = 0, cz = 0;
      for (let v = 0; v < 3; v++) {
        const i = tri * 3 + v;
        cx += position.getX(i);
        cy += position.getY(i);
        cz += position.getZ(i);
      }
      const hit = predicate(cx / 3, cy / 3, cz / 3);
      selected[tri] = hit;
      if (hit) selectedCount++;
    }
    if (selectedCount < 4 || selectedCount >= triCount * 0.85) return null;

    return {
      body: buildGeometryFromTriangles(source, selected, false),
      door: buildGeometryFromTriangles(source, selected, true),
      selectedCount
    };
  }

  function addInteriorProxy(model) {
    const dark = new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.86, metalness: 0.04 });
    const soft = new THREE.MeshStandardMaterial({ color: 0x0b0c0d, roughness: 0.94, metalness: 0.02 });
    const lime = new THREE.MeshStandardMaterial({ color: 0xd8ff3e, roughness: 0.36, metalness: 0.16 });
    const group = new THREE.Group();
    group.name = "InteriorPreviewProxy";

    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.13, 0.40), soft);
    seatBase.position.set(0.27, 0.32, 0.02);
    seatBase.rotation.x = -0.05;
    group.add(seatBase);

    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.43, 0.13), soft);
    seatBack.position.set(0.27, 0.53, -0.11);
    seatBack.rotation.x = -0.17;
    group.add(seatBack);

    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.10, 0.20), dark);
    dash.position.set(0.05, 0.69, 0.43);
    dash.rotation.x = 0.08;
    group.add(dash);

    const steering = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.012, 10, 32), dark);
    steering.position.set(0.27, 0.67, 0.34);
    steering.rotation.x = Math.PI / 2;
    group.add(steering);

    const ambientStrip = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.015, 0.52), lime);
    ambientStrip.position.set(0.505, 0.57, 0.18);
    group.add(ambientStrip);

    group.traverse(node => {
      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = false;
      }
    });
    model.add(group);
  }

  function extractDriverDoor(model) {
    const hinge = new THREE.Vector3(0.56, 0, 0.585);
    const pivot = new THREE.Group();
    pivot.name = "DriverDoorPivot";
    pivot.position.copy(hinge);
    let movedFaces = 0;

    const nodes = [];
    model.traverse(node => { if (node.isMesh && node.geometry) nodes.push(node); });

    nodes.forEach(node => {
      const identity = `${node.name || ""} ${node.material?.name || ""}`;
      let predicate = null;

      if (/Carpaint/i.test(identity)) {
        predicate = (x, y, z) => x > 0.49 && x < 0.67 && y > 0.18 && y < 0.75 && z > -0.22 && z < 0.60;
      } else if (/^Glass\b|\bGlass$/i.test(identity)) {
        predicate = (x, y, z) => x > 0.42 && x < 0.56 && y > 0.64 && y < 0.94 && z > -0.21 && z < 0.43;
      } else if (/(Black_gloss|Glossy_Plastic|Carbon_Fiber_Glossy|Satin_Metallic)/i.test(identity)) {
        predicate = (x, y, z) => x > 0.40 && x < 0.71 && y > 0.58 && y < 0.96 && z > -0.24 && z < 0.59;
      }

      if (!predicate) return;
      const split = splitGeometryForDriverDoor(node, predicate);
      if (!split?.body || !split?.door) return;

      node.geometry.dispose?.();
      node.geometry = split.body;
      const doorMesh = new THREE.Mesh(split.door, node.material);
      doorMesh.name = `DriverDoor_${node.name || node.material?.name || "Part"}`;
      doorMesh.position.set(-hinge.x, -hinge.y, -hinge.z);
      doorMesh.castShadow = false;
      doorMesh.receiveShadow = false;
      pivot.add(doorMesh);
      movedFaces += split.selectedCount;
    });

    if (movedFaces < 30 || !pivot.children.length) {
      console.warn("Driver door extraction did not find enough geometry.");
      return null;
    }

    model.add(pivot);
    addInteriorProxy(model);
    return pivot;
  }

  function setDriverDoor(open) {
    if (!driverDoorPivot) return;
    driverDoorOpen = open;
    const start = performance.now() + (open ? 280 : 0);
    doorTween = {
      from: driverDoorPivot.rotation.y,
      to: open ? -1.03 : 0,
      start,
      duration: open ? 1120 : 920
    };

    stage.classList.toggle("interior-open", open);
    interiorPanel.classList.toggle("open", open);
    interiorPanel.setAttribute("aria-hidden", String(!open));
    interiorDoorTrigger.setAttribute("aria-pressed", String(open));
    interiorDoorTrigger.setAttribute("aria-label", open ? "Закрыть салон" : "Открыть салон");
    interiorDoorTrigger.querySelector(".interior-door-label").textContent = open ? "Закрыть" : "Салон";

    if (open) {
      const directionPanel = document.getElementById("directionPanel");
      if (directionPanel?.classList.contains("open")) {
        directionPanel.querySelector(".panel-close")?.click();
      }
      startCameraMotion({
        rotation: -1.04,
        distance: mobile() ? 5.90 : 4.92,
        cameraX: mobile() ? 0.12 : 0.34,
        cameraY: mobile() ? 2.02 : 2.08,
        lookX: mobile() ? 0.12 : 0.24,
        lookY: mobile() ? 0.70 : 0.73,
        duration: mobile() ? 1450 : 1750
      });
    } else {
      startCameraMotion({
        rotation: 0,
        distance: mobile() ? 7.20 : 6.30,
        cameraX: 0,
        cameraY: mobile() ? 2.15 : 2.22,
        lookX: 0,
        lookY: mobile() ? 0.73 : 0.78,
        duration: mobile() ? 1250 : 1450
      });
    }
  }

  function toggleInteriorDoor() {
    setDriverDoor(!driverDoorOpen);
  }

  interiorDoorTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleInteriorDoor();
  });
  interiorPanel.querySelector(".interior-panel-close")?.addEventListener("click", () => setDriverDoor(false));

  const interiorAnchor = new THREE.Vector3(1.03, 1.02, 0.26);
  const interiorProjected = new THREE.Vector3();
  function updateInteriorDoorTrigger() {
    if (!carModel || !driverDoorPivot || !stage.classList.contains("premium-ready")) {
      interiorDoorTrigger.style.opacity = "0";
      interiorDoorTrigger.style.pointerEvents = "none";
      return;
    }
    const rect = stage.getBoundingClientRect();
    interiorProjected.copy(interiorAnchor);
    carRig.localToWorld(interiorProjected);
    interiorProjected.project(camera);
    let x = (interiorProjected.x * 0.5 + 0.5) * rect.width;
    let y = (-interiorProjected.y * 0.5 + 0.5) * rect.height;
    x = THREE.MathUtils.clamp(x, mobile() ? 34 : 92, rect.width - (mobile() ? 34 : 110));
    y = THREE.MathUtils.clamp(y + (mobile() ? 38 : 52), mobile() ? 42 : 70, rect.height - (mobile() ? 48 : 74));
    interiorDoorTrigger.style.left = `${x}px`;
    interiorDoorTrigger.style.top = `${y}px`;
    interiorDoorTrigger.style.opacity = "1";
    interiorDoorTrigger.style.pointerEvents = "auto";
  }

'''
text = text.replace(loader_marker, helpers + loader_marker, 1)

# Extract the driver door after materials have been finalized, but before the
# car is scaled and centered into the hero composition.
bounds_marker = '''      let bounds = new THREE.Box3().setFromObject(carModel);'''
if bounds_marker not in text:
    raise SystemExit('Interior door: model bounds marker not found')
text = text.replace(bounds_marker, '''      driverDoorPivot = extractDriverDoor(carModel);
      if (!driverDoorPivot) {
        interiorDoorTrigger.remove();
        interiorPanel.remove();
      }

''' + bounds_marker, 1)

# Animate the physical door in the existing render loop.
render_marker = '''    carRig.rotation.y = currentRotation;'''
if render_marker not in text:
    raise SystemExit('Interior door: render rotation marker not found')
text = text.replace(render_marker, '''    if (doorTween && driverDoorPivot) {
      const raw = (now - doorTween.start) / doorTween.duration;
      if (raw >= 0) {
        const progress = Math.max(0, Math.min(1, raw));
        const eased = smootherStep(progress);
        driverDoorPivot.rotation.y = THREE.MathUtils.lerp(doorTween.from, doorTween.to, eased);
        if (progress >= 1) doorTween = null;
      }
    }

''' + render_marker, 1)

update_marker = '''    updateHotspots();'''
if update_marker not in text:
    raise SystemExit('Interior door: hotspot render marker not found')
text = text.replace(update_marker, '''    updateHotspots();
    updateInteriorDoorTrigger();''', 1)

path.write_text(text, encoding='utf-8')
print('Interior door prototype applied: driver door extraction, guided camera, interior services panel')
