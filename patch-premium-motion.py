from pathlib import Path

path = Path('premium-car.js')
text = path.read_text(encoding='utf-8')

replacements = []

replacements.append((
'''  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 80);\n  let targetDistance = window.innerWidth < 820 ? 8.5 : 7.6;\n  let currentDistance = targetDistance;''',
'''  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 80);\n  let targetDistance = window.innerWidth < 820 ? 8.5 : 7.6;\n  let currentDistance = targetDistance;\n  let zoomTween = null;\n\n  function smootherStep(t) {\n    const x = Math.max(0, Math.min(1, t));\n    return x * x * x * (x * (x * 6 - 15) + 10);\n  }\n\n  function startZoom(to, duration = 1280) {\n    targetDistance = to;\n    if (reducedMotion) {\n      currentDistance = to;\n      zoomTween = null;\n      return;\n    }\n    zoomTween = {\n      from: currentDistance,\n      to,\n      start: performance.now(),\n      duration\n    };\n  }'''
))

replacements.append((
'''  let userHasInteracted = false;\n  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;''',
'''  let userHasInteracted = false;\n  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;\n\n  const parkingLightMaterials = new Map();\n  let parkingFlashStartedAt = -Infinity;\n  let lastParkingFlashAt = -Infinity;\n\n  function registerParkingLightMaterial(material) {\n    if (!material || !/^(Headlight|Brakelight)$/i.test(material.name || '')) return;\n    if (parkingLightMaterials.has(material.uuid)) return;\n    parkingLightMaterials.set(material.uuid, {\n      material,\n      baseIntensity: Number.isFinite(material.emissiveIntensity) ? material.emissiveIntensity : 1\n    });\n  }\n\n  function flashParkingLights() {\n    if (reducedMotion || !parkingLightMaterials.size) return;\n    const now = performance.now();\n    if (now - lastParkingFlashAt < 240) return;\n    lastParkingFlashAt = now;\n    parkingFlashStartedAt = now;\n  }\n\n  function updateParkingLights(now) {\n    if (!parkingLightMaterials.size) return;\n    const elapsed = now - parkingFlashStartedAt;\n    let pulse = 0;\n\n    if (elapsed >= 0 && elapsed < 900) {\n      const bell = (center, width) => Math.exp(-Math.pow((elapsed - center) / width, 2));\n      pulse = Math.max(bell(120, 68), bell(420, 82));\n    }\n\n    parkingLightMaterials.forEach(({ material, baseIntensity }) => {\n      material.emissiveIntensity = baseIntensity + pulse * 6.4;\n    });\n  }'''
))

replacements.append((
'''  function setDirection(key) {\n    if (!(key in directionAngles)) return;\n    targetRotation = directionAngles[key];\n    targetDistance = window.innerWidth < 820 ? 7.9 : 6.95;\n    userHasInteracted = true;\n    Object.entries(hotspots).forEach(([name, element]) => element.classList.toggle("active", name === key));\n  }''',
'''  function setDirection(key) {\n    if (!(key in directionAngles)) return;\n    targetRotation = directionAngles[key];\n    startZoom(window.innerWidth < 820 ? 7.9 : 6.95, 1320);\n    flashParkingLights();\n    userHasInteracted = true;\n    Object.entries(hotspots).forEach(([name, element]) => element.classList.toggle("active", name === key));\n  }'''
))

replacements.append((
'''    if (event.target.closest(".panel-close")) {\n      targetDistance = window.innerWidth < 820 ? 8.5 : 7.6;\n      Object.values(hotspots).forEach(el => el.classList.remove("active"));\n    }''',
'''    if (event.target.closest(".panel-close")) {\n      startZoom(window.innerWidth < 820 ? 8.5 : 7.6, 1180);\n      Object.values(hotspots).forEach(el => el.classList.remove("active"));\n    }'''
))

replacements.append((
'''        materials.filter(Boolean).forEach((material) => {\n          if (/paint/i.test(material.name || "")) {''',
'''        materials.filter(Boolean).forEach((material) => {\n          registerParkingLightMaterial(material);\n          if (/paint/i.test(material.name || "")) {'''
))

replacements.append((
'''  const clock = new THREE.Clock();\n  function render() {\n    const delta = Math.min(clock.getDelta(), 0.05);\n    const ease = reducedMotion ? 1 : 1 - Math.pow(0.0015, delta);\n    currentRotation += (targetRotation - currentRotation) * ease;\n    currentDistance += (targetDistance - currentDistance) * ease;''',
'''  const clock = new THREE.Clock();\n  function render() {\n    const delta = Math.min(clock.getDelta(), 0.05);\n    const now = performance.now();\n\n    if (reducedMotion) {\n      currentRotation = targetRotation;\n      currentDistance = targetDistance;\n    } else {\n      currentRotation = THREE.MathUtils.damp(currentRotation, targetRotation, 3.3, delta);\n\n      if (zoomTween) {\n        const progress = (now - zoomTween.start) / zoomTween.duration;\n        currentDistance = THREE.MathUtils.lerp(zoomTween.from, zoomTween.to, smootherStep(progress));\n        if (progress >= 1) {\n          currentDistance = zoomTween.to;\n          zoomTween = null;\n        }\n      } else {\n        currentDistance = THREE.MathUtils.damp(currentDistance, targetDistance, 2.25, delta);\n      }\n    }\n\n    updateParkingLights(now);'''
))

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Patch target not found:\n{old[:160]}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('premium-car.js patched: cinematic zoom + parking light acknowledgement')
