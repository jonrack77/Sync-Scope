let running = false;
let excitation = false;
let voltage = 0;
let speed = 0;
let genBreakerClosed = false;

let genPhase = 0;
let gridPhase = 0;

const gridFreq = 60;
const gridVoltage = 115;

const genVoltSpan = document.getElementById("gen-voltage");
const genFreqSpan = document.getElementById("gen-freq");
const gridVoltSpan = document.getElementById("grid-voltage");
const gridFreqSpan = document.getElementById("grid-freq");

function toggleMaster() {
  running = !running;
  if (running) {
    speed = 40;
    voltage = 0;
    excitation = false;
    genBreakerClosed = false;
    genPhase = 0;
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
    voltage = 80;
  }
}

function adjustVoltage(delta) {
  if (excitation) voltage = Math.min(115, Math.max(0, voltage + delta));
}

function adjustSpeed(delta) {
  if (running) speed = Math.min(65, Math.max(55, speed + delta));
}

function attemptCloseBreaker() {
  const phaseMatch = Math.abs(getPhaseDiffDeg()) < 15;
  const voltMatch = Math.abs(voltage - gridVoltage) < 5;

  if (running && excitation && phaseMatch && voltMatch) {
    genBreakerClosed = true;
    genPhase = gridPhase;
    console.log("GEN BREAKER CLOSED");
  } else {
    console.log("SYNC CONDITIONS NOT MET");
  }
}

// Click-and-hold handler
function holdButton(id, callback) {
  const el = document.getElementById(id);
  let interval;

  el.addEventListener("mousedown", () => {
    callback();
    interval = setInterval(callback, 100);
  });

  el.addEventListener("mouseup", () => clearInterval(interval));
  el.addEventListener("mouseleave", () => clearInterval(interval));
  el.addEventListener("touchstart", () => {
    callback();
    interval = setInterval(callback, 100);
  });
  el.addEventListener("touchend", () => clearInterval(interval));
}

// Phase difference in degrees
function getPhaseDiffDeg() {
  const delta = gridPhase - genPhase;
  return ((delta + Math.PI) % (2 * Math.PI)) - Math.PI; // wrap to -π to π
}

// Synchroscope gauge using phase difference
const syncCanvas = document.getElementById("synchroscope");
const syncCtx = syncCanvas.getContext("2d");

function drawSynchroscope() {
  syncCtx.clearRect(0, 0, 200, 200);
  syncCtx.beginPath();
  syncCtx.arc(100, 100, 90, 0, 2 * Math.PI);
  syncCtx.strokeStyle = "#888";
  syncCtx.stroke();

  let angle = 0;

  if (running && excitation) {
    angle = getPhaseDiffDeg(); // angle in radians
  }

  const x = 100 + 70 * Math.sin(angle);
  const y = 100 - 70 * Math.cos(angle);

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

  // Grid wave
  sineCtx.beginPath();
  sineCtx.strokeStyle = "green";
  for (let x = 0; x < 800; x++) {
    const t = x / 800;
    const y = 100 - Math.sin(2 * Math.PI * 4 * t + gridPhase) * 80;
    sineCtx.lineTo(x, y);
  }
  sineCtx.stroke();

  // Generator wave
  sineCtx.beginPath();
  sineCtx.strokeStyle = "blue";
  for (let x = 0; x < 800; x++) {
    const t = x / 800;
    let y = 100;
    if (running && excitation) {
      const amp = (voltage / gridVoltage) * 80;
      const freq = genBreakerClosed ? gridFreq : speed;
      y = 100 - Math.sin(2 * Math.PI * 4 * t + genPhase) * amp;
    }
    sineCtx.lineTo(x, y);
  }
  sineCtx.stroke();
}

// Sync light brightness calculation using PT-like behavior
function updateSyncLights() {
  const light1 = document.getElementById("sync-light-1");
  const light2 = document.getElementById("sync-light-2");

  if (!running || !excitation || genBreakerClosed) {
    light1.style.background = "#222";
    light2.style.background = "#222";
    return;
  }

  const v1 = 120;
  const v2 = 120 * (voltage / gridVoltage);
  const theta = getPhaseDiffDeg();

  const radians = theta * (Math.PI / 180);
  const diff = Math.sqrt(
    v1 ** 2 + v2 ** 2 - 2 * v1 * v2 * Math.cos(radians)
  );

  // Convert to brightness (normalized)
  const brightness = Math.min(diff / 170, 1); // 170 ≈ max vector difference
  const level = Math.floor(255 * brightness);
  const color = `rgb(${level},0,0)`;

  light1.style.background = color;
  light2.style.background = color;
}

// Update loop
function update(dt) {
  if (running) {
    gridPhase += (2 * Math.PI * gridFreq * dt) / 1000;
    genPhase += (2 * Math.PI * (genBreakerClosed ? gridFreq : speed) * dt) / 1000;
  }

  gridPhase %= 2 * Math.PI;
  genPhase %= 2 * Math.PI;

  const genFreq = running ? (genBreakerClosed ? gridFreq : speed) : 0;
  const genVolt = running && excitation ? voltage : 0;

  genVoltSpan.textContent = `${genVolt.toFixed(1)} kV`;
  genFreqSpan.textContent = `${genFreq.toFixed(1)} Hz`;
  gridVoltSpan.textContent = `${gridVoltage} kV`;
  gridFreqSpan.textContent = `${gridFreq.toFixed(1)} Hz`;

  updateSyncLights();
  drawSynchroscope();
  drawSineWaves(Date.now());
}

// Timing loop
let last = performance.now();
function loop(now) {
  const dt = now - last;
  last = now;
  update(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Wire hold buttons
holdButton("spd-up", () => adjustSpeed(0.1));
holdButton("spd-dn", () => adjustSpeed(-0.1));
holdButton("vr-up", () => adjustVoltage(1));
holdButton("vr-dn", () => adjustVoltage(-1));
