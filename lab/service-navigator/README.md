# TI service navigator, first integrated revision

Production entry: `hero-service-navigator.bundle.js`, built with Three.js r169.
The previous procedural renderer and deploy-time premium-car patch chain are NOT executed.
The current service copy is extracted verbatim from app.js; the grouping follows TI (2).pdf and the user-approved service map.

States: home (3 directions), exterior direction (5 grouped service zones), selected service, interior opening, interior zones, selected interior service, closing. Only one camera flight is evaluated per frame. A direction change during closing replaces the queued destination instead of opening a second tween. User drag interrupts only the camera; the door still reaches its safe target.

- Stable screen-space callouts connected to the real projected component positions.
- Back returns to the current direction/zone level, not always to the start.
- Anti-chrome comparison resets to black exterior when leaving the service.
- Original source driverDoor/interiorCabin v3 rig only; no approximate cuts or proxy cabin.
- If the two v3 GLBs are absent, exterior navigation remains available and the cabin menu honestly exposes service descriptions without pretending to open a door.
- Both required files keep their exact names in assets: amg_driver_cabin_desktop_v3.glb and amg_driver_cabin_mobile_v3.glb.
- Original legacy asset has +90-degree Y export rotation; normalized to the same +Z-front coordinates as v3.
- Neutral LED studio environment, uniform black body and black exterior trim, graphite wheels, lime calipers, static lamps. Existing cabin maps are retained.
- No fabricated paint-defect, PDR, hidden suspension, or insulation cutaway demonstrations. Those require separate prepared geometry. Other equipment stays in the catalogue.

QA: Node checks service references, group counts, lane separation and removal of the extra renderer. Playwright checks actual DOM state and camera interpolation at 1440px/390px, including reduced-motion OS settings and rapid changes. It records whether real WebGL was available; screenshots and results are retained as service-navigator-qa artifacts. A passing no-WebGL result is not a GPU-performance claim. New door geometry cannot be exercised on the deployed page until v3 assets are uploaded.
