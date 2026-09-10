# TI Detailing Kostanay — website

Interactive premium website concept for TI Detailing Kostanay.

## Concept
The main navigation is built around the owner's intent rather than a generic service catalogue:

- **Сохранить** — protection and preservation
- **Восстановить** — restoration and detailing
- **Тюнинг** — styling, comfort and equipment

The hero uses an interactive car on a turntable with three hotspots. Selecting a hotspot rotates/zooms the car and opens the relevant service direction.

## Content source
Primary content source: the TI Detailing Kostanay presentation supplied by the client. Unsupported marketing claims are intentionally not added until confirmed by TI Detailing.

## Prototype stack
Static HTML/CSS + JavaScript + Three.js (CDN). This keeps the first prototype deployable without a build step. The 3D vehicle is a procedural concept placeholder and is intended to be replaced by the approved production 3D model / render set.

## Local preview
Run any static HTTP server in the repository root, e.g.:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.
