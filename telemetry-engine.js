/**
 * Project ASTRAL-CARE: Multi-Sensor Telemetry Engine
 * Active live signal simulation engine with real-time waveform generation
 */

class TelemetryEngine {
  constructor() {
    this.sampleRate = 60;
    this.time = 0;
    this.isActive = true;
    this.heartRate = 72;
    this.respirationRate = 14;
    this.motionNoiseActive = false;
    this.filterActive = true;
    this.noiseIntensity = 0.85;

    this.bufferLength = 320;
    this.ecgBuffer = new Float32Array(this.bufferLength);
    this.scgBuffer = new Float32Array(this.bufferLength);
    this.ppgBuffer = new Float32Array(this.bufferLength);

    this.prevEcgClean = 0;
    this.kalmanEstimate = 0;
    this.kalmanError = 1;
    this.kalmanQ = 0.05;
    this.kalmanR = 0.6;

    this.cardiacPhase = 0;
    this.pep = 105;
    this.strokeVolume = 78;
    this.snr = 31.6;
  }

  setHeartRate(bpm) {
    this.heartRate = Math.max(40, Math.min(180, bpm));
  }

  setPreEjectionPeriod(ms) {
    this.pep = ms;
  }

  toggleNoise(enabled) {
    this.motionNoiseActive = enabled;
  }

  toggleFilter(enabled) {
    this.filterActive = enabled;
  }

  synthesizeECG(phase) {
    let val = 0;
    if (phase > 0.12 && phase < 0.24) val += 0.15 * Math.sin(((phase - 0.12) / 0.12) * Math.PI);
    else if (phase >= 0.28 && phase < 0.31) val -= 0.18 * Math.sin(((phase - 0.28) / 0.03) * Math.PI);
    else if (phase >= 0.31 && phase < 0.36) val += 1.4 * Math.sin(((phase - 0.31) / 0.05) * Math.PI);
    else if (phase >= 0.36 && phase < 0.40) val -= 0.35 * Math.sin(((phase - 0.36) / 0.04) * Math.PI);
    else if (phase >= 0.50 && phase < 0.68) val += 0.32 * Math.sin(((phase - 0.50) / 0.18) * Math.PI);
    return val;
  }

  synthesizeSCG(phase) {
    let val = 0;
    if (phase >= 0.34 && phase < 0.46) {
      const p = (phase - 0.34) / 0.12;
      val += 0.7 * Math.sin(p * Math.PI * 6) * Math.exp(-p * 3.5);
    } else if (phase >= 0.64 && phase < 0.76) {
      const p = (phase - 0.64) / 0.12;
      val += 0.45 * Math.sin(p * Math.PI * 7) * Math.exp(-p * 4.0);
    }
    return val;
  }

  synthesizePPG(phase) {
    let val = 0;
    if (phase >= 0.38) {
      const p = (phase - 0.38) / 0.62;
      const systolic = Math.sin(p * Math.PI * 0.9) * Math.exp(-p * 1.5);
      const dicrotic = (p > 0.35 && p < 0.7) ? 0.22 * Math.sin(((p - 0.35) / 0.35) * Math.PI) : 0;
      val = Math.max(0, systolic + dicrotic);
    }
    return val * 1.2;
  }

  generateBiomechanicalNoise() {
    const harmonic1 = Math.sin(this.time * 28.5);
    const harmonic2 = Math.cos(this.time * 54.2);
    const impactSpike = (Math.random() > 0.94) ? (Math.random() - 0.5) * 2.2 : 0;
    const gaussianJitter = (Math.random() - 0.5) * 0.8;
    return (harmonic1 * 0.6 + harmonic2 * 0.4 + impactSpike + gaussianJitter) * this.noiseIntensity;
  }

  applyAdaptiveFilter(measurement, isNoisePresent) {
    if (!isNoisePresent) return measurement * 0.85 + this.prevEcgClean * 0.15;
    const R_dynamic = this.kalmanR * 3.5;
    this.kalmanError = this.kalmanError + this.kalmanQ;
    const kalmanGain = this.kalmanError / (this.kalmanError + R_dynamic);
    this.kalmanEstimate = this.kalmanEstimate + kalmanGain * (measurement - this.kalmanEstimate);
    this.kalmanError = (1 - kalmanGain) * this.kalmanError;
    const maxDelta = 0.55;
    const delta = this.kalmanEstimate - this.prevEcgClean;
    const clampedDelta = Math.max(-maxDelta, Math.min(maxDelta, delta));
    return this.prevEcgClean + clampedDelta;
  }

  tick() {
    const dt = 1 / this.sampleRate;
    this.time += dt;

    const beatsPerSecond = this.heartRate / 60;
    this.cardiacPhase = (this.cardiacPhase + beatsPerSecond * dt) % 1.0;

    let rawEcg = this.synthesizeECG(this.cardiacPhase);
    let rawScg = this.synthesizeSCG(this.cardiacPhase);
    let rawPpg = this.synthesizePPG(this.cardiacPhase);

    const noise = this.motionNoiseActive ? this.generateBiomechanicalNoise() : 0;
    let finalEcg = rawEcg + noise;
    let finalScg = rawScg + (noise * 0.6);
    let finalPpg = rawPpg + (noise * 0.4);

    if (this.filterActive) {
      finalEcg = this.applyAdaptiveFilter(finalEcg, this.motionNoiseActive);
      this.prevEcgClean = finalEcg;
      finalScg = finalScg * 0.8 + (rawScg * 0.2);
      finalPpg = finalPpg * 0.85 + (rawPpg * 0.15);
      this.snr = this.motionNoiseActive ? 22.8 : 31.6;
    } else {
      this.snr = this.motionNoiseActive ? 6.2 : 28.4;
      this.prevEcgClean = finalEcg;
    }

    this.pushSample(this.ecgBuffer, finalEcg);
    this.pushSample(this.scgBuffer, finalScg);
    this.pushSample(this.ppgBuffer, finalPpg);
  }

  pushSample(buffer, sample) {
    for (let i = 0; i < buffer.length - 1; i++) {
      buffer[i] = buffer[i + 1];
    }
    buffer[buffer.length - 1] = sample;
  }
}

window.TelemetryEngine = TelemetryEngine;
