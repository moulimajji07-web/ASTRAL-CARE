/**
 * Project ASTRAL-CARE: Master Application Controller
 * High-performance 60fps telemetry scope rendering, hazard triggers, and audio HUD cues
 */

document.addEventListener('DOMContentLoaded', () => {
  const telemetry = new TelemetryEngine();
  const predictiveAI = new PredictiveAIEngine();

  // DOM Elements - Scopes
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

  // DOM Elements - Vitals & Telemetry
  const valHR = document.getElementById('valHR');
  const statusHR = document.getElementById('statusHR');
  const valPEP = document.getElementById('valPEP');
  const statusPEP = document.getElementById('statusPEP');
  const valSpO2 = document.getElementById('valSpO2');
  const valResp = document.getElementById('valResp');
  const valRNFL = document.getElementById('valRNFL');
  const statusRNFL = document.getElementById('statusRNFL');
  const valRad = document.getElementById('valRad');
  const statusRad = document.getElementById('statusRad');

  // DOM Elements - Hazard Cards
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

  // Controls
  const noiseToggle = document.getElementById('noiseToggle');
  const filterToggle = document.getElementById('filterToggle');
  const snrDisplay = document.getElementById('snrDisplay');
  const scenarioButtons = document.querySelectorAll('.btn-scenario');
  const crewSelect = document.getElementById('crewSelect');
  const crewName = document.getElementById('crewName');
  const crewRole = document.getElementById('crewRole');

  // Audio tone helper
  let audioCtx = null;
  function playAudioTone(freq, duration, type = 'sine') {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
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

  const crewProfiles = {
    cdr: { name: 'CDR. Sarah Vance', role: 'Mission Commander / EVA Lead', baseHR: 72 },
    plt: { name: 'PLT. Alex Chen', role: 'Command Pilot / Systems Engineer', baseHR: 66 },
    fe1: { name: 'FE-1. Dr. Maya Torres', role: 'Chief Medical Officer / Astrobiology', baseHR: 69 },
    fe2: { name: 'FE-2. Marcus Sterling', role: 'Payload Specialist / Robotics Lead', baseHR: 75 }
  };

  crewSelect.addEventListener('change', (e) => {
    const prof = crewProfiles[e.target.value];
    if (prof) {
      crewName.innerText = prof.name;
      crewRole.innerText = prof.role;
      telemetry.setHeartRate(prof.baseHR);
      playAudioTone(880, 0.08);
    }
  });

  noiseToggle.addEventListener('change', (e) => {
    telemetry.toggleNoise(e.target.checked);
    playAudioTone(e.target.checked ? 320 : 640, 0.09);
  });

  filterToggle.addEventListener('change', (e) => {
    telemetry.toggleFilter(e.target.checked);
    playAudioTone(e.target.checked ? 750 : 400, 0.09);
  });

  btnDismissBanner.addEventListener('click', () => {
    emergencyBanner.classList.remove('active');
  });

  btnResolveIntervention.addEventListener('click', () => {
    predictiveAI.resolveCountermeasure();
    updateTriageUI();
    scenarioButtons.forEach(b => {
      b.classList.toggle('active-scenario', b.dataset.scenario === 'nominal');
    });
    emergencyBanner.classList.remove('active');
    playAudioTone(1050, 0.25, 'triangle');
  });

  scenarioButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const scenario = btn.dataset.scenario;
      scenarioButtons.forEach(b => b.classList.remove('active-scenario'));
      btn.classList.add('active-scenario');
      
      predictiveAI.triggerScenario(scenario);
      
      if (scenario === 'cardiac') {
        telemetry.setHeartRate(92);
        telemetry.setPreEjectionPeriod(142);
      } else if (scenario === 'radiation') {
        emergencyBanner.classList.add('active');
        playAudioTone(380, 0.35, 'sawtooth');
      } else {
        telemetry.setHeartRate(72);
        telemetry.setPreEjectionPeriod(105);
        emergencyBanner.classList.remove('active');
      }

      playAudioTone(520, 0.1);
      updateTriageUI();
    });
  });

  function updateTriageUI() {
    const t = predictiveAI.currentTriage;
    triageSeverityBadge.innerText = t.level;
    triageSeverityBadge.className = 'state-badge';

    if (t.level.includes('CRITICAL')) {
      triageSeverityBadge.classList.add('risk-badge', 'critical');
    } else if (t.level.includes('WARNING') || t.level.includes('PRE-SYMPTOMATIC')) {
      triageSeverityBadge.classList.add('risk-badge', 'warning');
    } else {
      triageSeverityBadge.classList.add('risk-badge', 'nominal');
    }

    triageHeadline.innerText = t.title;
    triageInsightText.innerText = t.insight;

    countermeasuresList.innerHTML = '';
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
        <button class="btn-execute-rx" onclick="window.triggerRxSuccess('${rx.id}')">${rx.actionText}</button>
      `;
      countermeasuresList.appendChild(card);
    });

    valRNFL.innerText = predictiveAI.biomarkers.rnflThicknessUm;
    statusRNFL.innerText = predictiveAI.biomarkers.rnflThicknessUm > 115 ? 'EDEMA DETECTED (+26µm)' : 'NO EDEMA';
    statusRNFL.style.color = predictiveAI.biomarkers.rnflThicknessUm > 115 ? 'var(--accent-crimson)' : 'var(--accent-emerald)';

    valPEP.innerText = telemetry.pep;
    statusPEP.innerText = telemetry.pep > 120 ? 'CONTRACTILITY IMPAIRED' : 'CONTRACTILITY OPTIMAL';
    statusPEP.style.color = telemetry.pep > 120 ? 'var(--accent-amber)' : 'var(--accent-emerald)';

    valRad.innerText = predictiveAI.biomarkers.sievertTotalMsv.toFixed(1);
    statusRad.innerText = predictiveAI.biomarkers.speDosimeterRate > 1.0 ? 'SPE SURGE (EVACUATE)' : 'WITHIN CARE LIMITS';
    statusRad.style.color = predictiveAI.biomarkers.speDosimeterRate > 1.0 ? 'var(--accent-crimson)' : 'var(--accent-emerald)';

    updateHazardCards();
  }

  window.triggerRxSuccess = function(rxId) {
    playAudioTone(880, 0.15, 'triangle');
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '40px';
    toast.style.right = '40px';
    toast.style.background = 'rgba(0, 230, 118, 0.95)';
    toast.style.color = '#000';
    toast.style.padding = '10px 16px';
    toast.style.borderRadius = '6px';
    toast.style.fontFamily = 'var(--font-mono)';
    toast.style.fontWeight = '700';
    toast.style.fontSize = '11px';
    toast.style.boxShadow = '0 0 20px rgba(0, 230, 118, 0.5)';
    toast.style.zIndex = '9999';
    toast.innerText = `✓ COUNTERMEASURE LOGGED: Telemetry synchronized to crew profile`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  };

  function updateHazardCards() {
    const s = predictiveAI.activeScenario;

    if (s === 'sans') {
      badgeSans.className = 'risk-badge warning';
      badgeSans.innerText = 'STAGE 1 (74%)';
      barSans.style.width = '74%';
      barSans.style.background = 'var(--accent-amber)';
      descSans.innerText = 'Peripapillary RNFL thickening: +26µm. Bilateral choroidal folds.';
    } else {
      badgeSans.className = 'risk-badge nominal';
      badgeSans.innerText = 'NOMINAL (12%)';
      barSans.style.width = '12%';
      barSans.style.background = 'var(--accent-emerald)';
      descSans.innerText = 'Microvascular caliber normal. Optic nerve sheath diameter: 5.2mm.';
    }

    if (s === 'cardiac') {
      badgeCardiac.className = 'risk-badge critical';
      badgeCardiac.innerText = 'ELEVATED (81%)';
      barCardiac.style.width = '81%';
      barCardiac.style.background = 'var(--accent-crimson)';
      descCardiac.innerText = 'Stroke volume: 56mL (-28%). Pre-ejection period elongated to 142ms.';
    } else {
      badgeCardiac.className = 'risk-badge nominal';
      badgeCardiac.innerText = 'NOMINAL (8%)';
      barCardiac.style.width = '8%';
      barCardiac.style.background = 'var(--accent-emerald)';
      descCardiac.innerText = 'Stroke volume: 78mL. Sympathovagal balance LF/HF ratio: 1.15.';
    }

    if (s === 'radiation') {
      badgeRad.className = 'risk-badge critical';
      badgeRad.innerText = 'CRITICAL SPE (92%)';
      barRad.style.width = '92%';
      barRad.style.background = 'var(--accent-crimson)';
      descRad.innerText = `SPE flux: ${predictiveAI.biomarkers.speDosimeterRate} mSv/hr. Cumulative: ${predictiveAI.biomarkers.sievertTotalMsv.toFixed(1)} mSv.`;
    } else {
      badgeRad.className = 'risk-badge nominal';
      badgeRad.innerText = 'BACKGROUND (4%)';
      barRad.style.width = '4%';
      barRad.style.background = 'var(--accent-emerald)';
      descRad.innerText = 'Hourly flux: 0.18 mSv/hr. Double-strand break repair active.';
    }

    if (s === 'immune') {
      badgeImmune.className = 'risk-badge warning';
      badgeImmune.innerText = 'REACTIVATION (78%)';
      barImmune.style.width = '78%';
      barImmune.style.background = 'var(--accent-amber)';
      descImmune.innerText = `EBV/CMV saliva copy count: 2,850/mL. Secretory IgA: 62 µg/mL.`;
    } else {
      badgeImmune.className = 'risk-badge nominal';
      badgeImmune.innerText = 'DORMANT (9%)';
      barImmune.style.width = '9%';
      barImmune.style.background = 'var(--accent-emerald)';
      descImmune.innerText = 'EBV/CMV saliva copy count: <100/mL. Secretory IgA: 184 µg/mL.';
    }

    if (s === 'fatigue') {
      badgeFatigue.className = 'risk-badge warning';
      badgeFatigue.innerText = 'FATIGUED (72%)';
      barFatigue.style.width = '72%';
      barFatigue.style.background = 'var(--accent-amber)';
      descFatigue.innerText = `PVT reaction latency: 385ms (+153ms). Acoustic vocal jitter: 1.48%.`;
    } else {
      badgeFatigue.className = 'risk-badge nominal';
      badgeFatigue.innerText = 'NOMINAL (11%)';
      barFatigue.style.width = '11%';
      barFatigue.style.background = 'var(--accent-emerald)';
      descFatigue.innerText = 'PVT-B reaction latency: 232ms. Vocal acoustic jitter: 0.42%.';
    }
  }

  function renderScopeTrace(ctx, canvas, buffer, strokeColor, scaleY) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

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
    ctx.shadowBlur = 6;
    ctx.shadowColor = strokeColor;
    ctx.beginPath();

    const step = w / (buffer.length - 1);
    for (let i = 0; i < buffer.length; i++) {
      const x = i * step;
      const y = (h / 2) - (buffer[i] * scaleY);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    const scanX = w - 4;
    ctx.fillStyle = strokeColor;
    ctx.fillRect(scanX, 0, 2, h);
  }

  function renderForecastChart() {
    const rect = forecastCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    forecastCtx.clearRect(0, 0, w, h);

    forecastCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    forecastCtx.lineWidth = 1;
    forecastCtx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = 20 + i * ((h - 40) / 4);
      forecastCtx.moveTo(30, y);
      forecastCtx.lineTo(w - 10, y);
    }
    forecastCtx.stroke();

    const days = predictiveAI.forecastDays;
    const unmit = predictiveAI.unmitigatedCurve;
    const mit = predictiveAI.mitigatedCurve;
    const xStep = (w - 50) / (days.length - 1);

    forecastCtx.strokeStyle = '#ff1744';
    forecastCtx.lineWidth = 2.5;
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

    forecastCtx.strokeStyle = '#00e5ff';
    forecastCtx.lineWidth = 2.5;
    forecastCtx.beginPath();
    for (let i = 0; i < mit.length; i++) {
      const x = 35 + i * xStep;
      const y = h - 25 - ((mit[i] - 20) / 80) * (h - 45);
      if (i === 0) forecastCtx.moveTo(x, y);
      else forecastCtx.lineTo(x, y);
    }
    forecastCtx.stroke();

    forecastCtx.fillStyle = '#8b9bb4';
    forecastCtx.font = '9px monospace';
    for (let i = 0; i < days.length; i++) {
      const x = 35 + i * xStep;
      forecastCtx.fillText(days[i], x - 12, h - 8);
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

    const keys = [
      { key: 'cardiovascular', label: 'CARDIAC' },
      { key: 'neuroOcular', label: 'OCULAR' },
      { key: 'musculoskeletal', label: 'MUSCLE/BONE' },
      { key: 'immuneResilience', label: 'IMMUNE' },
      { key: 'cognitivePsych', label: 'COGNITIVE' },
      { key: 'radiationTolerance', label: 'RAD-TOL' }
    ];

    const angleStep = (Math.PI * 2) / keys.length;

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

    radarCtx.fillStyle = 'rgba(0, 229, 255, 0.2)';
    radarCtx.strokeStyle = '#00e5ff';
    radarCtx.lineWidth = 2;
    radarCtx.beginPath();

    for (let i = 0; i < keys.length; i++) {
      const val = (predictiveAI.indices[keys[i].key] || 90) / 100;
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

  updateTriageUI();

  let frameCount = 0;
  function animationLoop() {
    frameCount++;
    telemetry.tick();

    renderScopeTrace(ecgCtx, ecgCanvas, telemetry.ecgBuffer, '#00e5ff', 24);
    renderScopeTrace(scgCtx, scgCanvas, telemetry.scgBuffer, '#b388ff', 36);
    renderScopeTrace(ppgCtx, ppgCanvas, telemetry.ppgBuffer, '#00e676', 32);

    snrDisplay.innerText = `${telemetry.snr.toFixed(1)} dB`;

    if (frameCount % 15 === 0) {
      renderForecastChart();
      renderRadarChart();
      valHR.innerText = telemetry.heartRate;
    }

    requestAnimationFrame(animationLoop);
  }

  requestAnimationFrame(animationLoop);
});
