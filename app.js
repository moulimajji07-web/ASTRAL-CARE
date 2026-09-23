/**
 * Project ASTRAL-CARE: Master Application Controller
 * Handles dataset file uploads (JSON / CSV), step playback, canvas rendering, and UI updates.
 */

document.addEventListener('DOMContentLoaded', () => {
  const telemetry = new TelemetryEngine();
  const predictiveAI = new PredictiveAIEngine();

  // Ingested Dataset State
  let loadedDataset = [];
  let currentSampleIdx = -1;
  let isPlaying = false;
  let playbackTimer = null;

  // DOM Elements - Canvas
  const ecgCanvas = document.getElementById('ecgCanvas');
  const scgCanvas = document.getElementById('scgCanvas');
  const ppgCanvas = document.getElementById('ppgCanvas');
  const forecastCanvas = document.getElementById('forecastCanvas');
  const radarCanvas = document.getElementById('radarCanvas');

  const ecgCtx = ecgCanvas.getContext('2d');
  const scgCtx = scgCanvas.getContext('2d');
  const ppgCtx = ppgCanvas.getContext('2d');
  const forecastCtx = forecastCanvas.getContext('2d');
  const radarCtx = radarCanvas.getContext('2d');

  // DOM Elements - Vitals
  const valHR = document.getElementById('valHR');
  const statusHR = document.getElementById('statusHR');
  const valPEP = document.getElementById('valPEP');
  const statusPEP = document.getElementById('statusPEP');
  const valSpO2 = document.getElementById('valSpO2');
  const statusSpO2 = document.getElementById('statusSpO2');
  const valResp = document.getElementById('valResp');
  const statusResp = document.getElementById('statusResp');
  const valRNFL = document.getElementById('valRNFL');
  const statusRNFL = document.getElementById('statusRNFL');
  const valRad = document.getElementById('valRad');
  const statusRad = document.getElementById('statusRad');

  // Meta & Header
  const feedStatus = document.getElementById('feedStatus');
  const ingestMeta = document.getElementById('ingestMeta');
  const crewName = document.getElementById('crewName');
  const crewRole = document.getElementById('crewRole');
  const crewSub = document.getElementById('crewSub');
  const telemetryStateBadge = document.getElementById('telemetryStateBadge');
  const aiStatusBadge = document.getElementById('aiStatusBadge');
  const statusDot = document.getElementById('statusDot');

  // Scopes Meta
  const ecgMeta = document.getElementById('ecgMeta');
  const scgMeta = document.getElementById('scgMeta');
  const ppgMeta = document.getElementById('ppgMeta');

  // File Upload & Playback Controls
  const btnLoadDataset = document.getElementById('btnLoadDataset');
  const datasetFileInput = document.getElementById('datasetFileInput');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const btnPrevSample = document.getElementById('btnPrevSample');
  const btnNextSample = document.getElementById('btnNextSample');
  const sampleIndexDisplay = document.getElementById('sampleIndexDisplay');

  // Hazards
  const badgeSans = document.getElementById('badgeSans');
  const barSans = document.getElementById('barSans');
  const descSans = document.getElementById('descSans');
  const badgeCardiac = document.getElementById('badgeCardiac');
  const barCardiac = document.getElementById('barCardiac');
  const descCardiac = document.getElementById('descCardiac');
  const badgeRad = document.getElementById('badgeRad');
  const barRad = document.getElementById('barRad');
  const descRad = document.getElementById('descRad');
  const badgeImmune = document.getElementById('badgeImmune');
  const barImmune = document.getElementById('barImmune');
  const descImmune = document.getElementById('descImmune');
  const badgeFatigue = document.getElementById('badgeFatigue');
  const barFatigue = document.getElementById('barFatigue');
  const descFatigue = document.getElementById('descFatigue');

  // Triage & Prescriptions
  const triageSeverityBadge = document.getElementById('triageSeverityBadge');
  const triageHeadline = document.getElementById('triageHeadline');
  const triageInsightText = document.getElementById('triageInsightText');
  const countermeasuresList = document.getElementById('countermeasuresList');
  const btnResolveIntervention = document.getElementById('btnResolveIntervention');
  const emergencyBanner = document.getElementById('emergencyBanner');
  const btnDismissBanner = document.getElementById('btnDismissBanner');
  const emergencyBannerText = document.getElementById('emergencyBannerText');

  // Audio tone helper
  let audioCtx = null;
  function playAudioTone(freq, duration) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function resizeCanvases() {
    [ecgCanvas, scgCanvas, ppgCanvas, forecastCanvas, radarCanvas].forEach(c => {
      const rect = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = rect.width * dpr;
      c.height = rect.height * dpr;
      const ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
    });
  }

  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();

  // Trigger dataset file picker
  btnLoadDataset.addEventListener('click', () => {
    datasetFileInput.click();
  });

  datasetFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedDataset = parsed;
          currentSampleIdx = 0;
          initLoadedDataset();
        } else if (typeof parsed === 'object') {
          loadedDataset = [parsed];
          currentSampleIdx = 0;
          initLoadedDataset();
        } else {
          alert('Invalid dataset structure: Expected an array of sample records.');
        }
      } catch (err) {
        alert('Could not parse JSON dataset: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  function initLoadedDataset() {
    btnPlayPause.disabled = false;
    btnPrevSample.disabled = false;
    btnNextSample.disabled = false;
    btnResolveIntervention.disabled = false;
    btnResolveIntervention.style.cursor = 'pointer';
    btnResolveIntervention.style.background = 'rgba(0, 230, 118, 0.15)';
    btnResolveIntervention.style.borderColor = 'var(--accent-emerald)';
    btnResolveIntervention.style.color = 'var(--accent-emerald)';

    feedStatus.innerText = 'DATASET MOUNTED';
    feedStatus.style.color = 'var(--accent-emerald)';
    ingestMeta.innerText = `${loadedDataset.length} SAMPLES READY`;
    statusDot.style.background = 'var(--accent-emerald)';
    statusDot.style.boxShadow = '0 0 8px var(--accent-emerald)';

    applySample(0);
    playAudioTone(880, 0.15);
  }

  function applySample(idx) {
    if (idx < 0 || idx >= loadedDataset.length) return;
    currentSampleIdx = idx;
    sampleIndexDisplay.innerText = `[${idx + 1} / ${loadedDataset.length}]`;

    const sample = loadedDataset[idx];
    predictiveAI.ingestDataSample(sample);

    // Subject Details
    crewName.innerText = sample.crew_name ? `CREW: ${sample.crew_name} (${sample.crew_id || 'ID-01'})` : 'SUBJECT RECORD';
    crewRole.innerText = sample.flight_phase || 'Active Mission Cruise';
    crewSub.innerText = `Sample Timestamp: ${sample.timestamp_iso || 'T+00:00:00'} | Mission Day: ${sample.mission_day || 'N/A'}`;
    telemetryStateBadge.innerText = 'ACTIVE FEED';
    aiStatusBadge.innerText = 'ONLINE';

    // Telemetry Waveforms
    const dev = sample.devices_telemetry || {};
    const biopatch = dev.biopatch_vitaljacket || {};
    const scg = dev.chest_seismocardiograph || {};
    const ppg = dev.ring_finger_photoplethysmograph || {};
    const oct = dev.retinal_spectral_oct_tonometer || {};
    const dos = dev.ambient_and_personal_radiation_dosimeter || {};
    const risks = sample.edge_ai_risk_indices || {};

    // Vitals Readouts
    valHR.innerText = biopatch.heart_rate_bpm || '--';
    statusHR.innerText = biopatch.arrhythmia_flag ? 'ARRHYTHMIA DETECTED' : 'SINUS RHYTHM';
    statusHR.style.color = biopatch.arrhythmia_flag ? 'var(--accent-crimson)' : 'var(--accent-emerald)';

    valPEP.innerText = scg.pre_ejection_period_pep_ms || '--';
    statusPEP.innerText = (scg.pre_ejection_period_pep_ms > 120) ? 'CONTRACTILITY DECAY' : 'CONTRACTILITY NORMAL';
    statusPEP.style.color = (scg.pre_ejection_period_pep_ms > 120) ? 'var(--accent-amber)' : 'var(--accent-emerald)';

    valSpO2.innerText = ppg.spo2_percent || '--';
    statusSpO2.innerText = 'PERFUSION CAPTURED';

    valResp.innerText = ppg.respiration_rate_brpm || '--';
    statusResp.innerText = 'ACTIVE RESPIRATION';

    valRNFL.innerText = oct.peripapillary_rnfl_thickness_um || '--';
    statusRNFL.innerText = (oct.peripapillary_rnfl_thickness_um > 115) ? 'EDEMA FLAGGED' : 'RETINA NOMINAL';
    statusRNFL.style.color = (oct.peripapillary_rnfl_thickness_um > 115) ? 'var(--accent-amber)' : 'var(--accent-emerald)';

    valRad.innerText = dos.cumulative_mission_dose_msv || '--';
    statusRad.innerText = dos.solar_particle_event_flag ? 'SPE IN PROGRESS' : 'BACKGROUND ONLY';
    statusRad.style.color = dos.solar_particle_event_flag ? 'var(--accent-crimson)' : 'var(--accent-emerald)';

    // Update Telemetry Engine parameters
    telemetry.isActive = true;
    telemetry.setHeartRate(biopatch.heart_rate_bpm || 72);
    telemetry.setPreEjectionPeriod(scg.pre_ejection_period_pep_ms || 105);

    ecgMeta.innerText = `HR: ${biopatch.heart_rate_bpm || 72} BPM | SNR: ${biopatch.snr_db || 30.5} dB`;
    scgMeta.innerText = `PEP: ${scg.pre_ejection_period_pep_ms || 105} ms | LVET: ${scg.left_ventricular_ejection_time_lvet_ms || 280} ms`;
    ppgMeta.innerText = `SpO2: ${ppg.spo2_percent || 98.5}% | PAT: ${ppg.pulse_arrival_time_pat_ms || 180} ms`;

    // Hazard Bars Update
    updateHazardBar(badgeSans, barSans, descSans, risks.sans_neuro_ocular_risk, 'SANS Risk Index', `${oct.peripapillary_rnfl_thickness_um || 98}µm RNFL`);
    updateHazardBar(badgeCardiac, barCardiac, descCardiac, risks.cardiovascular_deconditioning_risk, 'Cardiac Remodeling', `Stroke Vol: ${scg.stroke_volume_ml || 75}mL`);
    updateHazardBar(badgeRad, barRad, descRad, risks.radiation_damage_risk, 'Radiation Damage', `Flux: ${dos.instantaneous_flux_msv_per_hour || 0.18} mSv/hr`);
    updateHazardBar(badgeImmune, barImmune, descImmune, risks.viral_reactivation_risk, 'Viral Reactivation', `Saliva EBV: ${predictiveAI.biomarkers.salivaryViralCopies || 0} c/mL`);
    updateHazardBar(badgeFatigue, barFatigue, descFatigue, risks.circadian_burnout_risk, 'Circadian Fatigue', `PVT Latency: ${predictiveAI.biomarkers.pvLatencyMs || 240}ms`);

    // Triage Box
    updateTriageUI();

    // Check SPE Banner
    if (dos.solar_particle_event_flag) {
      emergencyBannerText.innerText = `⚠️ CRITICAL: SOLAR PARTICLE EVENT FLUX DETECTED (${dos.instantaneous_flux_msv_per_hour} mSv/hr) - ENGAGE SHELTER`;
      emergencyBanner.classList.add('active');
      playAudioTone(440, 0.3);
    } else {
      emergencyBanner.classList.remove('active');
    }
  }

  function updateHazardBar(badge, bar, desc, riskVal, label, meta) {
    if (riskVal === undefined || riskVal === null) {
      badge.className = 'risk-badge nominal';
      badge.innerText = 'NO DATA';
      bar.style.width = '0%';
      return;
    }
    const percent = Math.round(riskVal * 100);
    bar.style.width = `${percent}%`;

    if (percent >= 75) {
      badge.className = 'risk-badge critical';
      badge.innerText = `CRITICAL (${percent}%)`;
      bar.style.background = 'var(--accent-crimson)';
    } else if (percent >= 40) {
      badge.className = 'risk-badge warning';
      badge.innerText = `WARNING (${percent}%)`;
      bar.style.background = 'var(--accent-amber)';
    } else {
      badge.className = 'risk-badge nominal';
      badge.innerText = `NOMINAL (${percent}%)`;
      bar.style.background = 'var(--accent-emerald)';
    }
    desc.innerText = `${label}: ${percent}% probability | ${meta}`;
  }

  function updateTriageUI() {
    const t = predictiveAI.currentTriage;
    triageSeverityBadge.innerText = t.level;
    triageSeverityBadge.className = 'state-badge';

    if (t.level.includes('CRITICAL') || t.level.includes('EMERGENCY')) {
      triageSeverityBadge.classList.add('risk-badge', 'critical');
    } else if (t.level.includes('WARNING') || t.level.includes('PRE_SYMPTOMATIC')) {
      triageSeverityBadge.classList.add('risk-badge', 'warning');
    } else {
      triageSeverityBadge.classList.add('risk-badge', 'nominal');
    }

    triageHeadline.innerText = t.title;
    triageInsightText.innerText = t.insight;

    countermeasuresList.innerHTML = '';
    if (t.countermeasures.length === 0) {
      countermeasuresList.innerHTML = `
        <div style="font-size: 11px; color: var(--text-dim); padding: 12px; text-align: center; border: 1px dashed rgba(255,255,255,0.08); border-radius: 6px;">
          ✓ All biomarkers within acceptable tolerance. No clinical actions required.
        </div>
      `;
    } else {
      t.countermeasures.forEach(rx => {
        const card = document.createElement('div');
        card.className = 'rx-card';
        card.innerHTML = `
          <div class="rx-card-header">
            <span class="rx-type">${rx.type}</span>
            <span class="rx-dose">${rx.dose}</span>
          </div>
          <div class="rx-title">${rx.title}</div>
          <div class="rx-desc">${rx.desc}</div>
        `;
        countermeasuresList.appendChild(card);
      });
    }
  }

  // Playback Controls
  btnPlayPause.addEventListener('click', () => {
    if (isPlaying) {
      clearInterval(playbackTimer);
      isPlaying = false;
      btnPlayPause.innerText = '▶ PLAY';
    } else {
      isPlaying = true;
      btnPlayPause.innerText = '⏸ PAUSE';
      playbackTimer = setInterval(() => {
        let nextIdx = (currentSampleIdx + 1) % loadedDataset.length;
        applySample(nextIdx);
      }, 2500);
    }
  });

  btnNextSample.addEventListener('click', () => {
    if (currentSampleIdx < loadedDataset.length - 1) {
      applySample(currentSampleIdx + 1);
    }
  });

  btnPrevSample.addEventListener('click', () => {
    if (currentSampleIdx > 0) {
      applySample(currentSampleIdx - 1);
    }
  });

  btnDismissBanner.addEventListener('click', () => {
    emergencyBanner.classList.remove('active');
  });

  btnResolveIntervention.addEventListener('click', () => {
    playAudioTone(1050, 0.2);
    alert('✓ Clinical intervention logged to medical record. Re-evaluating next dataset frame.');
  });

  // Oscilloscope Renderer
  function renderScopeTrace(ctx, canvas, buffer, strokeColor, scaleY) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(72, 110, 160, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x += 30) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += 20) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = w / (buffer.length - 1);
    for (let i = 0; i < buffer.length; i++) {
      const x = i * step;
      const y = (h / 2) - (buffer[i] * scaleY);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function renderForecastChart() {
    const rect = forecastCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    forecastCtx.clearRect(0, 0, w, h);

    // Chart grid
    forecastCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    forecastCtx.lineWidth = 1;
    forecastCtx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = 20 + i * ((h - 40) / 4);
      forecastCtx.moveTo(30, y);
      forecastCtx.lineTo(w - 10, y);
    }
    forecastCtx.stroke();

    if (!predictiveAI.hasActiveData) {
      forecastCtx.fillStyle = '#4f637f';
      forecastCtx.font = '11px monospace';
      forecastCtx.textAlign = 'center';
      forecastCtx.fillText('STANDBY: LOAD DATASET TO PROJECT TRAJECTORIES', w / 2, h / 2);
      return;
    }

    const days = predictiveAI.forecastDays;
    const unmit = predictiveAI.unmitigatedCurve;
    const mit = predictiveAI.mitigatedCurve;
    const xStep = (w - 50) / (days.length - 1);

    // Red Line
    forecastCtx.strokeStyle = '#ff1744';
    forecastCtx.lineWidth = 2;
    forecastCtx.setLineDash([4, 4]);
    forecastCtx.beginPath();
    for (let i = 0; i < unmit.length; i++) {
      const x = 35 + i * xStep;
      const y = h - 25 - ((unmit[i] - 20) / 80) * (h - 45);
      if (i === 0) forecastCtx.moveTo(x, y);
      else forecastCtx.lineTo(x, y);
    }
    forecastCtx.stroke();
    forecastCtx.setLineDash([]);

    // Cyan Line
    forecastCtx.strokeStyle = '#00e5ff';
    forecastCtx.lineWidth = 2;
    forecastCtx.beginPath();
    for (let i = 0; i < mit.length; i++) {
      const x = 35 + i * xStep;
      const y = h - 25 - ((mit[i] - 20) / 80) * (h - 45);
      if (i === 0) forecastCtx.moveTo(x, y);
      else forecastCtx.lineTo(x, y);
    }
    forecastCtx.stroke();

    // Labels
    forecastCtx.fillStyle = '#8b9bb4';
    forecastCtx.font = '9px monospace';
    forecastCtx.textAlign = 'center';
    for (let i = 0; i < days.length; i++) {
      const x = 35 + i * xStep;
      forecastCtx.fillText(days[i], x, h - 8);
    }
  }

  function renderRadarChart() {
    const rect = radarCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const centerX = w / 2;
    const centerY = h / 2 + 6;
    const radius = Math.min(centerX, centerY) - 28;

    radarCtx.clearRect(0, 0, w, h);

    if (!predictiveAI.hasActiveData) {
      radarCtx.fillStyle = '#4f637f';
      radarCtx.font = '11px monospace';
      radarCtx.textAlign = 'center';
      radarCtx.fillText('STANDBY: CAPACITY VECTOR IDLE', centerX, centerY);
      return;
    }

    const keys = [
      { key: 'cardiovascular', label: 'CARDIAC' },
      { key: 'neuroOcular', label: 'OCULAR' },
      { key: 'musculoskeletal', label: 'MUSCLE/BONE' },
      { key: 'immuneResilience', label: 'IMMUNE' },
      { key: 'cognitivePsych', label: 'COGNITIVE' },
      { key: 'radiationTolerance', label: 'RAD-TOL' }
    ];

    const angleStep = (Math.PI * 2) / keys.length;

    // Rings
    radarCtx.strokeStyle = 'rgba(72, 110, 160, 0.2)';
    radarCtx.lineWidth = 1;
    for (let r = 0.25; r <= 1.0; r += 0.25) {
      radarCtx.beginPath();
      for (let i = 0; i < keys.length; i++) {
        const a = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(a) * (radius * r);
        const y = centerY + Math.sin(a) * (radius * r);
        if (i === 0) radarCtx.moveTo(x, y);
        else radarCtx.lineTo(x, y);
      }
      radarCtx.closePath();
      radarCtx.stroke();
    }

    // Axes
    radarCtx.fillStyle = '#8b9bb4';
    radarCtx.font = '8.5px monospace';
    for (let i = 0; i < keys.length; i++) {
      const a = i * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(a) * radius;
      const y = centerY + Math.sin(a) * radius;

      radarCtx.beginPath();
      radarCtx.moveTo(centerX, centerY);
      radarCtx.lineTo(x, y);
      radarCtx.stroke();

      const labelX = centerX + Math.cos(a) * (radius + 16);
      const labelY = centerY + Math.sin(a) * (radius + 16);
      radarCtx.textAlign = 'center';
      radarCtx.fillText(keys[i].label, labelX, labelY);
    }

    // Polygon
    radarCtx.fillStyle = 'rgba(0, 229, 255, 0.2)';
    radarCtx.strokeStyle = '#00e5ff';
    radarCtx.lineWidth = 2;
    radarCtx.beginPath();

    for (let i = 0; i < keys.length; i++) {
      const val = (predictiveAI.indices[keys[i].key] || 50) / 100;
      const a = i * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(a) * (radius * val);
      const y = centerY + Math.sin(a) * (radius * val);
      if (i === 0) radarCtx.moveTo(x, y);
      else radarCtx.lineTo(x, y);
    }
    radarCtx.closePath();
    radarCtx.fill();
    radarCtx.stroke();
  }

  // Animation Loop
  let frame = 0;
  function animationLoop() {
    frame++;
    telemetry.tick();

    renderScopeTrace(ecgCtx, ecgCanvas, telemetry.ecgBuffer, '#00e5ff', 24);
    renderScopeTrace(scgCtx, scgCanvas, telemetry.scgBuffer, '#b388ff', 36);
    renderScopeTrace(ppgCtx, ppgCanvas, telemetry.ppgBuffer, '#00e676', 32);

    if (frame % 15 === 0) {
      renderForecastChart();
      renderRadarChart();
    }

    requestAnimationFrame(animationLoop);
  }

  requestAnimationFrame(animationLoop);
});
