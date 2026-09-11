from pathlib import Path

path = Path('premium-car.js')
text = path.read_text(encoding='utf-8')

replacements = []

replacements.append((
'''  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 80);\n  let targetDistance = window.innerWidth < 820 ? 8.5 : 7.6;\n  let currentDistance = targetDistance;''',
'''  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 80);\n  let targetDistance = window.innerWidth < 820 ? 8.5 : 7.6;\n  let currentDistance = targetDistance;\n  let currentCameraX = window.innerWidth < 820 ? 0.15 : 0.35;\n  let currentLookX = 0;\n  let motionTween = null;\n\n  function smootherStep(t) {\n    const x = Math.max(0, Math.min(1, t));\n    return x * x * x * (x * (x * 6 - 15) + 10);\n  }\n\n  function shortestTargetAngle(from, to) {\n    const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));\n    return from + delta;\n  }\n\n  function startCameraMotion({ rotation, distance, cameraX, lookX = 0, duration = 1500 }) {\n    targetRotation = rotation;\n    targetDistance = distance;\n    if (reducedMotion) {\n      currentRotation = rotation;\n      currentDistance = distance;\n      currentCameraX = cameraX;\n      currentLookX = lookX;\n      motionTween = null;\n      return;\n    }\n\n    motionTween = {\n      fromRotation: currentRotation,\n      toRotation: shortestTargetAngle(currentRotation, rotation),\n      fromDistance: currentDistance,\n      toDistance: distance,\n      fromCameraX: currentCameraX,\n      toCameraX: cameraX,\n      fromLookX: currentLookX,\n      toLookX: lookX,\n      start: performance.now(),\n      duration\n    };\n  }'''
))

replacements.append((
'''  let userHasInteracted = false;\n  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;''',
'''  let userHasInteracted = false;\n  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;\n\n  const parkingLightMaterials = new Map();\n  let parkingFlashStartedAt = -Infinity;\n  let lastParkingFlashAt = -Infinity;\n\n  function registerParkingLightMaterial(material, nodeName = '') {\n    const identity = `${material?.name || ''} ${nodeName || ''}`;\n    if (!material || !/(headlight|brakelight|signallight)/i.test(identity)) return;\n    if (parkingLightMaterials.has(material.uuid)) return;\n    parkingLightMaterials.set(material.uuid, {\n      material,\n      baseIntensity: Number.isFinite(material.emissiveIntensity) ? material.emissiveIntensity : 1\n    });\n  }\n\n  function flashParkingLights() {\n    if (reducedMotion || !parkingLightMaterials.size) return;\n    const now = performance.now();\n    if (now - lastParkingFlashAt < 220) return;\n    lastParkingFlashAt = now;\n    parkingFlashStartedAt = now;\n  }\n\n  function updateParkingLights(now) {\n    if (!parkingLightMaterials.size) return;\n    const elapsed = now - parkingFlashStartedAt;\n    let pulse = 0;\n    if (elapsed >= 0 && elapsed < 900) {\n      const bell = (center, width) => Math.exp(-Math.pow((elapsed - center) / width, 2));\n      pulse = Math.max(bell(120, 66), bell(430, 86));\n    }\n    parkingLightMaterials.forEach(({ material, baseIntensity }) => {\n      material.emissiveIntensity = baseIntensity + pulse * 8;\n    });\n  }'''
))

replacements.append((
'''  function setDirection(key) {\n    if (!(key in directionAngles)) return;\n    targetRotation = directionAngles[key];\n    targetDistance = window.innerWidth < 820 ? 7.9 : 6.95;\n    userHasInteracted = true;\n    Object.entries(hotspots).forEach(([name, element]) => element.classList.toggle("active", name === key));\n  }''',
'''  function setDirection(key) {\n    if (!(key in directionAngles)) return;\n\n    const mobile = window.innerWidth < 820;\n    const cameraTargets = {\n      preserve: { x: mobile ? 0.06 : 0.08, lookX: -0.10 },\n      restore:  { x: mobile ? 0.16 : 0.30, lookX:  0.02 },\n      tune:     { x: mobile ? 0.24 : 0.52, lookX:  0.12 }\n    };\n    const target = cameraTargets[key];\n\n    startCameraMotion({\n      rotation: directionAngles[key],\n      distance: mobile ? 7.05 : 6.15,\n      cameraX: target.x,\n      lookX: target.lookX,\n      duration: 1520\n    });\n    flashParkingLights();\n    userHasInteracted = true;\n    Object.entries(hotspots).forEach(([name, element]) => element.classList.toggle("active", name === key));\n  }'''
))

replacements.append((
'''    if (event.target.closest(".panel-close")) {\n      targetDistance = window.innerWidth < 820 ? 8.5 : 7.6;\n      Object.values(hotspots).forEach(el => el.classList.remove("active"));\n    }''',
'''    if (event.target.closest(".panel-close")) {\n      const mobile = window.innerWidth < 820;\n      startCameraMotion({\n        rotation: currentRotation,\n        distance: mobile ? 8.5 : 7.6,\n        cameraX: mobile ? 0.15 : 0.35,\n        lookX: 0,\n        duration: 1200\n      });\n      Object.values(hotspots).forEach(el => el.classList.remove("active"));\n    }'''
))

replacements.append((
'''        materials.filter(Boolean).forEach((material) => {\n          if (/paint/i.test(material.name || "")) {''',
'''        materials.filter(Boolean).forEach((material) => {\n          registerParkingLightMaterial(material, node.name || '');\n          if (/paint/i.test(material.name || "")) {'''
))

replacements.append((
'''  const clock = new THREE.Clock();\n  function render() {\n    const delta = Math.min(clock.getDelta(), 0.05);\n    const ease = reducedMotion ? 1 : 1 - Math.pow(0.0015, delta);\n    currentRotation += (targetRotation - currentRotation) * ease;\n    currentDistance += (targetDistance - currentDistance) * ease;''',
'''  const clock = new THREE.Clock();\n  function render() {\n    const delta = Math.min(clock.getDelta(), 0.05);\n    const now = performance.now();\n\n    if (motionTween && !reducedMotion) {\n      const progress = Math.max(0, Math.min(1, (now - motionTween.start) / motionTween.duration));\n      const eased = smootherStep(progress);\n      currentRotation = THREE.MathUtils.lerp(motionTween.fromRotation, motionTween.toRotation, eased);\n      currentDistance = THREE.MathUtils.lerp(motionTween.fromDistance, motionTween.toDistance, eased);\n      currentCameraX = THREE.MathUtils.lerp(motionTween.fromCameraX, motionTween.toCameraX, eased);\n      currentLookX = THREE.MathUtils.lerp(motionTween.fromLookX, motionTween.toLookX, eased);\n      if (progress >= 1) {\n        currentRotation = motionTween.toRotation;\n        currentDistance = motionTween.toDistance;\n        currentCameraX = motionTween.toCameraX;\n        currentLookX = motionTween.toLookX;\n        motionTween = null;\n      }\n    } else if (!reducedMotion) {\n      currentRotation = THREE.MathUtils.damp(currentRotation, targetRotation, 2.4, delta);\n      currentDistance = THREE.MathUtils.damp(currentDistance, targetDistance, 2.0, delta);\n    }\n\n    updateParkingLights(now);'''
))

replacements.append((
'''    const mobile = window.innerWidth < 820;\n    camera.position.set(mobile ? 0.15 : 0.35, mobile ? 2.25 : 2.45, currentDistance);\n    camera.lookAt(0, mobile ? 0.78 : 0.88, 0);''',
'''    const mobile = window.innerWidth < 820;\n    camera.position.set(currentCameraX, mobile ? 2.25 : 2.45, currentDistance);\n    camera.lookAt(currentLookX, mobile ? 0.78 : 0.88, 0);'''
))

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Patch target not found:\n{old[:220]}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('premium-car.js patched: explicit 1.52s rotation + zoom + lateral camera tween')
