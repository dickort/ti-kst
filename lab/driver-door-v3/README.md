# AMG assembled driver-door v3

Two final GLBs have been assembled in the conversation working directory:

- `assets/amg_driver_cabin_desktop_v3.glb` — 13,086,316 bytes, 577,636 triangles.
- `assets/amg_driver_cabin_mobile_v3.glb` — 9,057,692 bytes, 374,237 triangles.

Both keep the verified original-object driver door, original cabin, and 15 embedded images. The geometry and embedded-image buffer bytes are unchanged from the user-reviewed v2; only materials, rig metadata and standard animation tracks were assembled. New native clips: `DriverDoor_Open` and `DriverDoor_Close`. Driver side is +X, front +Z, local-Y opening angle -62 degrees, hinge [0.546, 0.480, 0.588]. No approximate cutting of the old exterior GLB.

Current transport status: these two binaries are delivered as conversation attachments, not committed by this change. The build deliberately keeps the stable homepage while either new binary is absent. Upload both files to the existing assets directory without renaming. The next build validates the rig and activates the integration automatically; it never mistakes an old exterior file for the new rig.

Integration prepared here:

- Original three homepage directions remain.
- Entry to the driver-door scenario appears inside Restore and Tuning, not as a permanent fourth hotspot.
- The model uses its original source interior, seat, wheel, dashboard and door card.
- Guided driver-side camera, opening/closing, manual orbit/zoom and four cabin views.
- Seven existing interior service links are available.
- Separate compact mobile layout with original cabin geometry.
- Exterior direction clicks are queued until the door/camera close; one camera owner at a time.
- The old invisible procedural WebGL renderer is removed when v3 activates.
- Black satin body, graphite rims, lime calipers; no blinking. Final visual color/light approval remains pending.

Validation scope: local GLB structure, binary lengths, preserved mesh/image buffers, fixed hinge and outward rotation checked. Local integrated JS syntax checked. The workflow runs additional tests using real Three.js math and jsdom; those test state/DOM behavior, NOT real GPU rendering, layout quality or phone FPS. Actual scene smoothness remains a device/browser check.

Do not re-enable `patch-interior-door.py`; that is the rejected v1 approximate-cut prototype.
