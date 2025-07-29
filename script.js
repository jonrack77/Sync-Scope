const sineCanvas = document.getElementById("sineCanvas");
const ctx = sineCanvas.getContext("2d");

let syncscopeActive = false;
let masterOn = false;
let fieldClosed = false;

let busFreq = 60;
let busVolts = 115;

let genFreq = 55;
let genVolts = 0;

let internalGenVolts = 0;
let internalGenFreq = 55;

let phase = 0;
let time = 0;

const maxVolts = 130;
const minVolts = 0;

let holdSpeed = 0;
let holdVolt = 0;
let coastTimer = null;

document.getElementById("syncscopeBtn").onclick = () => {
  syncscopeActive = true;
};

document.getElementById("masterStartBtn").onclick = () => {
  masterOn = true;
};

document.getElementById("masterStopBtn").onclick = () => {
  masterOn = false;
  genFreq = 0;
  internalGenFreq = 55;
  internalGenVolts = 0;
  genVolts = 0;
};

document.getElementById("fieldBreakerBtn").onclick = () => {
  fieldClosed = true;
  genVolts = 110;
  internalGenVolts = 110;
  genFreq = internalGenFreq - calcExcitationDrop(internalGenVolts);
};

function calcExcitationDrop(v) {
  return ((v - 0) / 2) * 0.1;
}

function updateVoltage(change) {
  if (!fieldClosed) return;
  internalGenVolts = Math.min(maxVolts, Math.max(minVolts, internalGenVolts + change));
  genVolts = internalGenVolts;
  genFreq = internalGenFreq - calcExcitationDrop(internalGenVolts);
}

function updateSpeed(change) {
  internalGenFreq = Math.min(66, Math.max(0, internalGenFreq + change));
  genFreq = internalGenFreq - calcExcitationDrop(internalGenVolts);
  if (coastTimer) clearTimeout(coastTimer);
  coastTimer = setTimeout(() => coastSpeed(change), 100);
}

function coastSpeed(lastChange) {
  let step = lastChange > 0 ? 0.01 : -0.01;
  let count = 20;
  let interval = setInterval(() => {
    if (count-- <= 0) {
      clearInterval(interval);
      return;
    }
    internalGenFreq += step;
    genFreq = internalGenFreq - calcExcitationDrop(internalGenVolts);
  }, 100);
}

["voltUpBtn", "voltDownBtn", "speedUpBtn", "speedDownBtn"].forEach((id) => {
  const btn = document.getElementById(id);
  let interval;
  btn.addEventListener("mousedown", () => {
    const change = id.includes("Up") ? 1 : -1;
    if (id.includes("volt")) {
      updateVoltage(change);
      interval = setInterval(() => updateVoltage(change), 150);
    } else {
      updateSpeed(change * 0.1);
      interval = setInterval(() => updateSpeed(change * 0.1), 150);
    }
  });
  btn.addEventListener("mouseup", () => clearInterval(interval));
  btn.addEventListener("mouseleave", () => clearInterval(interval));
});

function drawGauges() {
  const genGauge = document.getElementById("genVoltGauge").getContext("2d");
  const busGauge = document.getElementById("busVoltGauge").getContext("2d");

  genGauge.clearRect(0, 0, 200, 100);
  busGauge.clearRect(0, 0, 200, 100);

  genGauge.fillStyle = "white";
  genGauge.fillText(`${Math.round(genVolts)} kV`, 80, 50);
  busGauge.fillStyle = "white";
  busGauge.fillText(`${syncscopeActive ? busVolts : 0} kV`, 80, 50);
}

function drawSyncscope() {
  const sc = document.getElementById("syncscope").getContext("2d");
  sc.clearRect(0, 0, 200, 200);
  sc.strokeStyle = "white";
  sc.beginPath();
  sc.arc(100, 100, 90, 0, Math.PI * 2);
  sc.stroke();

  if (syncscopeActive && masterOn) {
    let delta = (genFreq - busFreq) * 6;
    phase += delta;
    const angle = ((phase % 360) * Math.PI) / 180;
    const x = 100 + 80 * Math.cos(angle);
    const y = 100 + 80 * Math.sin(angle);

    sc.strokeStyle = "red";
    sc.beginPath();
    sc.moveTo(100, 100);
    sc.lineTo(x, y);
    sc.stroke();

    drawSyncLights(angle);
  } else {
    drawSyncLights(null);
  }
}

function drawSyncLights(angle) {
  const a = document.getElementById("lightA");
  const b = document.getElementById("lightB");

  if (!angle || genVolts === 0 || !syncscopeActive) {
    a.style.background = "#111";
    b.style.background = "#111";
    return;
  }

  let brightness =
    Math.abs(Math.sin(angle)) +
    Math.abs(genVolts - busVolts) / maxVolts;
  brightness = Math.min(1, brightness);

  const glow = `0 0 ${30 * brightness}px rgba(255,255,100,${brightness})`;
  a.style.background = `rgba(255,255,100,${brightness})`;
  b.style.background = `rgba(255,255,100,${brightness})`;
  a.style.boxShadow = glow;
  b.style.boxShadow = glow;
}

function drawSineWave() {
  ctx.clearRect(0, 0, sineCanvas.width, sineCanvas.height);
  ctx.strokeStyle = "red";
  ctx.beginPath();
  for (let x = 0; x < sineCanvas.width; x++) {
    let t = time + x / 100;
    let y = 100 + 50 * Math.sin(2 * Math.PI * busFreq * t);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  if (fieldClosed) {
    ctx.strokeStyle = "blue";
    ctx.beginPath();
    for (let x = 0; x < sineCanvas.width; x++) {
      let t = time + x / 100;
      let y = 100 + 50 * Math.sin(2 * Math.PI * genFreq * t);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  time += 0.01;
}

function loop() {
  drawGauges();
  drawSyncscope();
  drawSineWave();
  requestAnimationFrame(loop);
}
loop();
