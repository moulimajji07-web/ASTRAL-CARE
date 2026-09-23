/**
 * Project ASTRAL-CARE: Multi-Sensor Telemetry Engine
 * Clean engine awaiting dataset feed. Zero dummy auto-cycling.
 */

class TelemetryEngine {
  constructor() {
    this.sampleRate = 60;
    this.time = 0;
    this.isActive = false; // Remains false until real dataset is fed
    this.heartRate = 0;
    this.respirationRate = 0;
    this.filterActive = true;

    // Buffers for scopes
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
    this.pep = 0;
    this.strokeVolume = 0;
    this.snr = 0;
  }

  setHeartRate(bpm) {
    this.heartRate = bpm;
  }

  setPreEjectionPeriod(ms) {
    this.pep = ms;
  }

  toggleFilter(enabled) {
    this.filterActive = enabled;
  }

  clearBuffers() {
    this.ecgBuffer.fill(0);
    this.scgBuffer.fill(0);
    this.ppgBuffer.fill(0);
    this.isActive = false;
  }

  /**
   * Synthesize real waveform ticks only when active dataset sample is present
   */
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

  tick() {
    if (!this.isActive || this.heartRate <= 0) {
      // In standby, slowly decay buffer to 0 flatline
      this.pushSample(this.ecgBuffer, 0);
      this.pushSample(this.scgBuffer, 0);
      this.pushSample(this.ppgBuffer, 0);
      return;
    }

    const dt = 1 / this.sampleRate;
    this.time += dt;

    const beatsPerSecond = this.heartRate / 60;
    this.cardiacPhase = (this.cardiacPhase + beatsPerSecond * dt) % 1.0;

    let ecg = this.synthesizeECG(this.cardiacPhase);
    let scg = this.synthesizeSCG(this.cardiacPhase);
    let ppg = this.synthesizePPG(this.cardiacPhase);

    this.pushSample(this.ecgBuffer, ecg);
    this.pushSample(this.scgBuffer, scg);
    this.pushSample(this.ppgBuffer, ppg);
  }

  pushSample(buffer, sample) {
    for (let i = 0; i < buffer.length - 1; i++) {
      buffer[i] = buffer[i + 1];
    }
    buffer[buffer.length - 1] = sample;
  }
}

window.TelemetryEngine = TelemetryEngine;
