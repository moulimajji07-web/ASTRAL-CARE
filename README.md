# Project ASTRAL-CARE 🚀
### Autonomous Deep-Space Astronaut Health Monitoring & Clinical Decision Support System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-WebAssembly%20%2F%20Edge%20Native-00e5ff.svg)]()
[![Standard](https://img.shields.io/badge/NASA%20Standard-HIDH%20Compliant-00e676.svg)]()

Project **ASTRAL-CARE** is an offline, autonomous, multi-sensor health monitoring and clinical decision support system designed for long-duration human space exploration (Moon/Mars missions). In deep space, Earth-communication latencies (up to 22–44 minutes roundtrip) prevent real-time telemedicine from flight surgeons on Earth. Astronauts must have an edge-intelligent system capable of monitoring, predicting, and counteracting physiological hazards autonomously.

---

## 🌟 Key Highlights

- **100% Offline & Zero Cloud Dependency**: Built to operate strictly on-board the habitat or spacecraft without network roundtrips.
- **Pre-Symptomatic Early Anomaly Detection**: Intercepts subclinical biomarkers (e.g. sub-micrometer retinal thickening, PEP prolongation) hours to days before irreversible damage or clinical illness manifests.
- **Adaptive Denoising & Motion-Artifact Filter**: Designed to filter violent exercise vibrations (treadmill, ARED) without distorting biological signals or triggering false cardiac alarms.
- **Multi-Sensor Data Ingestion Pipeline**: Live JSON/CSV telemetry file uploader and interactive step player to replay missions or ingest real aerospace sensor logs.
- **NASA HRP-Aligned Autonomous Countermeasures**: Automatically synthesizes actionable medical protocols (Lower Body Negative Pressure chamber cycles, ARED resistance load adjustments, circadian phototherapy, and pharmaceutical guidance).

---

## 🔬 Supported Sensor Suite & Hazards Monitored

| Physiological Hazard | Monitored Biomarker | Sensor Hardware |
| :--- | :--- | :--- |
| **SANS (Neuro-ocular Syndrome)** | Retinal Nerve Fiber Layer (RNFL) thickness & Intraocular Pressure (IOP) | Spaceflight Optical Coherence Tomography (OCT) & Tonometer |
| **Cardiovascular Deconditioning** | Pre-Ejection Period (PEP) & Stroke Volume Loss | Synchronized ECG + Sternal Seismocardiography (SCG) |
| **Solar Particle Events (SPE)** | Real-time Sievert flux ($mSv/hr$) & LET hit rates | Active Silicon Pixel Dosimeter & TEPC |
| **Immune Reactivation** | Salivary EBV/CMV viral DNA copies & Cytokines (IL-6, TNF-$\alpha$) | Point-of-Care Lab-on-a-Chip Microfluidics |
| **Circadian Desynchrony & Fatigue** | Psychomotor Vigilance Task (PVT-B) & Vocal Acoustic Jitter | Ambient UWB Sleep Radar & Voice Prosody Analyzer |

---

## 🚀 Quick Start

1. Clone this repository:
   ```bash
   git clone https://github.com/moulimajji07/astral-care.git
   cd astral-care
   ```
2. Open `index.html` in any modern web browser (Edge, Chrome, Firefox, Safari):
   ```bash
   # On Windows
   start index.html
   ```
3. Load a dataset:
   - Click **`📂 LOAD TELEMETRY DATASET`** in the top navigation bar.
   - Select the included template [`astronaut_health_dataset_schema.json`](astronaut_health_dataset_schema.json) or your own sensor recording.
   - Use the **`▶ PLAY`**, **`⏮ PREV`**, and **`⏭ NEXT`** controls to evaluate real-time multi-sensor telemetry, 7-day trajectories, and autonomous triage recommendations.

---

## 📂 Project Architecture

```
astral-care/
├── index.html                           # Mission-grade NASA dark cockpit HUD interface
├── styles.css                           # Glassmorphic OLED UI with high-contrast scopes
├── app.js                              # Master controller, dataset parser, and 60fps canvas loop
├── telemetry-engine.js                  # Multi-sensor waveform generator & adaptive filter
├── predictive-ai.js                     # Digital twin, trajectory forecaster, and triage engine
└── astronaut_health_dataset_schema.json # Multi-sensor schema and baseline test samples
```

---

## 📜 License

MIT License. Designed for advanced human spaceflight research and edge biomedical exploration.
