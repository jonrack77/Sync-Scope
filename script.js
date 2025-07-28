let running = false;
let excitation = false;
let voltage = 0;
let speed = 0;
let genBreakerClosed = false;

const gridFreq = 60;
const gridVoltage = 115;

const genVoltSpan = document.getElementById("gen-voltage");
const genFreqSpan = document.getElementById("gen-freq");
const gridVoltSpan = document.getElementById("grid-voltage");
const gridFreqSpan = document.getElementById("grid-freq");

function toggleMaster() {
  running = !running;
  if (running) {
    speed = 40;         // Start under frequency
    voltage = 0;        // Still zero until excitation
    excitation = false;
    genBreakerClosed = false;
  } else {
    speed = 0;
    voltage = 0;
    excitation = false;
    genBreakerClosed = false;
  }
}

function toggleField() {
  if (running && !excitation) {
    excitation = true;
    voltage = 80; // Undervoltage at start
  }
}

function adjustVoltage(delta) {
  if (excitation) voltage = Math.min(115, Math.max(0, voltage + delta));
}

function adjustSpeed(delta) {
  if (running) speed = Math.min(65, Math.max(55, speed + delta));
}

function attemptCloseBreaker() {
  const phaseMatch = Math.abs(speed - gridFreq) < 0.2;
  const voltMatch = Math.abs(voltage - gridVoltage) < 5;

  if (running && excitation && phaseMatch && voltMatch) {
    genBreakerClosed = true;
    console.log("GEN BREAKER CLOSED");
  } else {
    console.log("SYNC CONDITIONS NOT MET");
  }
}

// Synchroscope gauge
const syncCanvas = document.getElementById("synchroscope");
const syncCtx = syncCanvas.getContext("2d");

function drawSynchroscope() {
  syncCtx.clearRect(0, 0, 200, 200);
  syncCtx.beginPath();
  syncCtx.arc(100, 100, 90, 0, 2 * Math.PI);
  syncCtx.strokeStyle = "#888";
  syncCtx.stroke();

  let deltaFreq = 0;
  if (running && excitation && !genBreakerClosed) {
    deltaFreq = speed - gridFreq;
  }

  const angle = ((Date.now() / 1000) * deltaFreq * Math.PI) % (2 * Math.PI);
  const x = 100 + 70 * Math.cos(angle);
  const y = 100 + 70 * Math.sin(angle);

  syncCtx.beginPath();
  syncCtx.moveTo(100, 100);
  syncCtx.lineTo(x, y);
  syncCtx.strokeStyle = "#0f0";
  syncCtx.lineWidth = 3;
  syncCtx.stroke();
}

// Sine wave animation
const sineCanvas = document.getElementById("sineCanvas");
const sineCtx = sineCanvas.getContext("2d");

function drawSineWaves(time) {
  sineCtx.clearRect(0, 0, sineCanvas.width, sineCanvas.height);
  sineCtx.lineWidth = 2;

  // Grid wave (always present)
  sineCtx.beginPath();
  sineCtx.strokeStyle = "green";
  for (let x = 0; x < 800; x++) {
    const t = (x / 800) * 2 * Math.PI * 4;
    const y = 100 - Math.sin(t + time * 2 * Math.PI * gridFreq / 1000) * 80;
    sineCtx.lineTo(x, y);
  }
  sineCtx.stroke();

  // Generator wave
  sineCtx.beginPath();
  sineCtx.strokeStyle = "blue";

  for (let x = 0; x < 800; x++) {
    let y = 100;
    if (running && excitation) {
      const t = (x / 800) * 2 * Math.PI * 4;
      const freq = genBreakerClosed ? gridFreq : speed;
      const amplitude = (voltage / gridVoltage) * 80;
      y = 100 - Math.sin(t + time * 2 * Math.PI * freq / 1000) * amplitude;
    }
    sineCtx.lineTo(x, y);
  }
  sineCtx.stroke();
}

// Sync light intensity calculation
function getLightBrightness() {
  if (!running || !excitation || genBreakerClosed) return 0;

  const freqDelta = Math.abs(speed - gridFreq); // Hz
  const voltDelta = Math.abs(voltage - gridVoltage); // kV
  const phaseFactor = Math.min(freqDelta * 5, 1); // scale for visual
  const voltFactor = Math.min(voltDelta / 20, 1); // normalize voltage mismatch
  return Math.min(1, (phaseFactor + voltFactor) / 2); // average mismatch
}

// Update loop
function update() {
  const genFreq = running ? (genBreakerClosed ? gridFreq : speed) : 0;
  const genVolt = running && excitation ? voltage : 0;

  genVoltSpan.textContent = `${genVolt.toFixed(1)} kV`;
  genFreqSpan.textContent = `${genFreq.toFixed(1)} Hz`;
  gridVoltSpan.textContent = `${gridVoltage} kV`;
  gridFreqSpan.textContent = `${gridFreq.toFixed(1)} Hz`;

  // Light brightness based on mismatch
  const brightness = getLightBrightness();
  const color = `rgb(${Math.floor(255 * brightness)}, 0, 0)`;
  document.getElementById("sync-light-1").style.background = color;
  document.getElementById("sync-light-2").style.background = color;

  drawSynchroscope();
  drawSineWaves(Date.now());

  requestAnimationFrame(update);
}

update();
