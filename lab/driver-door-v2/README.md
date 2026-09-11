# AMG driver-door v2 — isolated implementation

The stable homepage is intentionally unchanged. Nothing in this folder is imported by the existing production hero or its deployment patches.

## Implemented in this revision

- Rebuilt from the user's original `Mercedes-Benz_AMG_GT_63_S.obj`, keeping its 426 original object boundaries before export.
- Driver side verified from steering-wheel object `Mesh.299`: driver is on +X in the source, vehicle front is +Z.
- Driver door consists of 30 original source objects, including door skins, glass, mirror, handle and interior card. No box-based triangle cut of the merged mobile asset.
- Door hinge in original model units: `[0.546, 0.480, 0.588]`. Opening rotation: -62 degrees about local Y.
- Restored original cabin geometry and 15 embedded image resources recovered from the uploaded `.blend`. No proxy seat or box dashboard.
- Separate `driverDoor` and `interiorCabin` nodes in both GLBs.
- Graphite rims, TI lime brake calipers, dark satin body, opaque cabin glazing. No blinking lights.
- `driver-door-controller.js` is an integration module for the existing Three.js version. It shares the hero's render loop, uses a camera arc and smooth door rotation, and supports interruption and closure.

## Prepared binary assets

These new assets were generated in the conversation working directory and are NOT yet committed to this repository:

| Asset | Bytes | Triangles | Material/rig mesh groups |
|---|---:|---:|---:|
| `amg_driver_cabin_desktop.glb` | 13,082,472 | 577,636 | 86 |
| `amg_driver_cabin_mobile.glb` | 9,053,848 | 374,237 | 86 |

The files use `KHR_mesh_quantization`; no Draco decoder is required. Both retain the same full driver-door assembly (22,598 triangles). Mobile reduces other geometry instead of replacing the cabin with boxes.

A standalone, dependency-free HTML preview was also generated for download in the conversation. It embeds the mobile asset, includes open/close, free orbit, zoom and close-up views of seat, steering wheel and door card. It does not rely on network-loaded scripts.

## Checks performed

- Original door geometry inspected with an offscreen VTK render, including open-door and side-interior views.
- Hinge invariance and outward +X opening checked numerically for both GLBs.
- GLB container lengths, rig node presence and embedded images checked.
- Standalone preview JavaScript syntax checked with Node.
- UI and animation state tests executed at desktop and 390px mobile layouts in Chromium using a MOCK WebGL context. These are NOT GPU/render-performance tests. Actual WebGL rendering is unavailable in the current headless Chromium environment.

## Integration boundary

Place the new assets in a dedicated path, load the selected asset on entering the interior scenario, and only then instantiate the controller. Do not re-enable the previous `patch-interior-door.py`: it uses the old approximate cut. The existing exterior model does not contain this rig and will deliberately be rejected by the new controller.

Call `controller.update(performance.now())` in the existing render loop. Suspend the hero's separate camera tween during the interior scenario so two controllers never write the camera in the same frame. Forward manual pointer input to `controller.onManualInput()` when using the current custom drag handlers.

This revision is a prepared model and isolated test implementation, not a claim that the new door is deployed on the main page.
