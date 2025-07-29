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
    speed = 50;
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
  if (excitation) {
    voltage = Math.min(115, Math.max(0, voltage + delta));
  }
}

function adjustSpeed(delta) {
  if (running) {
    speed = parseFloat((speed + delta).toFixed(1));
    speed = Math.min(65, Math.max(55, speed));
  }
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

function getPhaseDiffDeg() {
  const delta = genPhase - gridPhase;
  return ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;
}

// Synchroscope rendering
const syncCanvas = document.getElementById("synchroscope");
const syncCtx = syncCanvas.getContext("2d");

function drawSynchroscope() {
  syncCtx.clearRect(0, 0, 200, 200);
  const cx = 100, cy = 100, r = 90;

  // Outer ring
  syncCtx.beginPath();
  syncCtx.arc(cx, cy, r, 0, 2 * Math.PI);
  syncCtx.strokeStyle = "#ccc";
  syncCtx.lineWidth = 3;
  syncCtx.stroke();

  // Text labels
  syncCtx.fillStyle = "#fff";
  syncCtx.font = "12px monospace";
  syncCtx.fillText("SLOW", 20, cy);
  syncCtx.fillText("FAST", 150, cy);

  // Curved arrow (clockwise)
  syncCtx.beginPath();
  syncCtx.arc(cx, cy, 70, -Math.PI / 3, Math.PI / 3);
  syncCtx.strokeStyle = "#aaa";
  syncCtx.lineWidth = 2;
  syncCtx.stroke();

  // Arrow head
  const angle = Math.PI / 3;
  const x1 = cx + 70 * Math.cos(angle);
  const y1 = cy + 70 * Math.sin(angle);
  syncCtx.beginPath();
  syncCtx.moveTo(x1, y1);
  syncCtx.lineTo(x1 - 8, y1 - 5);
  syncCtx.lineTo(x1 - 8, y1 + 5);
  syncCtx.closePath();
  syncCtx.fillStyle = "#aaa";
  syncCtx.fill();

  // Phase needle
  let needleAngle = 0;
  if (running && excitation) {
    needleAngle = getPhaseDiffDeg(); // -π to π
  }

  const nx = cx + 70 * Math.sin(needleAngle);
  const ny = cy - 70 * Math.cos(needleAngle);

  syncCtx.beginPath();
  syncCtx.moveTo(cx, cy);
  syncCtx.lineTo(nx, ny);
  syncCtx.strokeStyle = "#0f0";
  syncCtx.lineWidth = 4;
  syncCtx.stroke();
}

const sineCanvas = document.getElementById("sineCanvas");
const sineCtx = sineCanvas.getContext("2d");

function drawSineWaves(time) {
  sineCtx.clearRect(0, 0, sineCanvas.width, sineCanvas.height);
  sineCtx.lineWidth = 2;

  sineCtx.beginPath();
  sineCtx.strokeStyle = "green";
  for (let x = 0; x < 800; x++) {
    const t = x / 800;
    const y = 100 - Math.sin(2 * Math.PI * 4 * t + gridPhase) * 80;
    sineCtx.lineTo(x, y);
  }
  sineCtx.stroke();

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

function updateSyncLights() {
  const light1 = document.getElementById("sync-light-1");
  const light2 = document.getElementById("sync-light-2");

  if (!running || !excitation) {
    light1.style.background = "#222";
    light2.style.background = "#222";
    return;
  }

  const v1 = 120;
  const v2 = 120 * (voltage / gridVoltage);
  const theta = getPhaseDiffDeg();
  const radians = theta;

  const diff = Math.sqrt(
    v1 ** 2 + v2 ** 2 - 2 * v1 * v2 * Math.cos(radians)
  );

  const brightness = Math.min(diff / 170, 1);
  const level = Math.floor(255 * brightness);
  const color = `rgb(${level},0,0)`;

  light1.style.background = color;
  light2.style.background = color;
}

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

let last = performance.now();
function loop(now) {
  const dt = now - last;
  last = now;
  update(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

holdButton("spd-up", () => adjustSpeed(0.1));
holdButton("spd-dn", () => adjustSpeed(-0.1));
holdButton("vr-up", () => adjustVoltage(1));
holdButton("vr-dn", () => adjustVoltage(-1));
