const sineCanvas = document.getElementById("sineCanvas");
const ctx = sineCanvas.getContext("2d");

let masterOn = false;
let fieldClosed = false;
let genBreakerClosed = false;
let syncscopeActive = false;

let busVolts = 0;
let genVolts = 0;
let internalGenVolts = 0;
let internalGenFreq = 55;
let genFreq = 0;

let phase = 0;
let time = 0;

let allowClickSpeedChange = true;
let clickTimeout = null;

let genGauge = null;
let busGauge = null;

window.addEventListener("load", () => {
  setTimeout(() => {
    if (document.gauges) {
      genGauge = document.gauges.get("genVoltCanvas");
      busGauge = document.gauges.get("busVoltCanvas");
    }
  }, 500);
});

document.getElementById("syncscopeBtn").onclick = () => {
  syncscopeActive = !syncscopeActive;

  if (syncscopeActive) {
    busVolts = 13.8;
    phase = 0;
  } else {
    busVolts = 0;
    document.getElementById("lightA").style.background = "#222";
    document.getElementById("lightB").style.background = "#222";
    document.getElementById("lightA").style.boxShadow = "";
    document.getElementById("lightB").style.boxShadow = "";
    phase = 0;
  }
};

document.getElementById("masterStartBtn").onclick = () => {
  masterOn = true;
  genFreq = internalGenFreq;
};

document.getElementById("masterStopBtn").onclick = () => {
  masterOn = false;
  genFreq = 0;
  genVolts = 0;
  internalGenVolts = 0;
};

document.getElementById("fieldBreakerBtn").onclick = () => {
  fieldClosed = true;
  internalGenVolts = 11;
  genVolts = internalGenVolts;
  genFreq = internalGenFreq - calcExcitationDrop(genVolts);
};

document.getElementById("genBreakerBtn").onclick = () => {
  if (!masterOn || !fieldClosed) return;
  genBreakerClosed = true;
  genFreq = 60;
  genVolts = busVolts;
  internalGenFreq = 60;
  internalGenVolts = busVolts;
};

function calcExcitationDrop(v) {
  return ((v - 0) / 2) * 0.1;
}

function updateVoltage(change) {
  if (!fieldClosed) return;
  internalGenVolts = Math.min(17, Math.max(5, internalGenVolts + change));
  genVolts = internalGenVolts;
  genFreq = internalGenFreq - calcExcitationDrop(internalGenVolts);
}

function updateSpeed(change, longPress = false) {
  if (!longPress && !allowClickSpeedChange) return;

  if (!longPress) {
    allowClickSpeedChange = false;
    clickTimeout = setTimeout(() => {
      allowClickSpeedChange = true;
    }, 3000);
  }

  internalGenFreq = Math.min(66, Math.max(0, internalGenFreq + change));
  genFreq = internalGenFreq - calcExcitationDrop(internalGenVolts);
}

["voltUpBtn", "voltDownBtn", "speedUpBtn", "speedDownBtn"].forEach((id) => {
  const btn = document.getElementById(id);
  let interval;
  let longPress = false;

  btn.addEventListener("mousedown", () => {
    const isUp = id.includes("Up");
    const isVolt = id.includes("volt");
    const delta = isVolt ? (isUp ? 1 : -1) : (isUp ? 0.1 : -0.1);
    longPress = true;
    if (isVolt) {
      updateVoltage(delta);
      interval = setInterval(() => updateVoltage(delta), 150);
    } else {
      updateSpeed(delta, true);
      interval = setInterval(() => updateSpeed(delta, true), 150);
    }
  });

  btn.addEventListener("mouseup", () => {
    clearInterval(interval);
    if (!longPress && id.includes("speed")) {
      const isUp = id.includes("Up");
      const delta = isUp ? 0.1 : -0.1;
      updateSpeed(delta, false);
    }
    longPress = false;
  });

  btn.addEventListener("mouseleave", () => {
    clearInterval(interval);
    longPress = false;
  });
});

function drawSyncscope() {
  const sc = document.getElementById("syncscope").getContext("2d");
  sc.clearRect(0, 0, 200, 200);

  if (!syncscopeActive) return;

  sc.strokeStyle = "#fff";
  sc.beginPath();
  sc.arc(100, 100, 90, 0, Math.PI * 2);
  sc.stroke();

  sc.font = "10px sans-serif";
  sc.fillStyle = "#fff";
  sc.textAlign = "center";
  sc.fillText("←—— SLOW       FAST ——→", 100, 20);

  let angle = -Math.PI / 2;

  if (masterOn) {
    let delta = (genFreq - 60) * 6;
    phase += delta;
    angle = ((phase % 360) * Math.PI) / 180;
  }

  const x = 100 + 80 * Math.cos(angle);
  const y = 100 + 80 * Math.sin(angle);

  sc.strokeStyle = "red";
  sc.beginPath();
  sc.moveTo(100, 100);
  sc.lineTo(x, y);
  sc.stroke();

  updateSyncLights(angle);
}

function updateSyncLights(angle) {
  const a = document.getElementById("lightA");
  const b = document.getElementById("lightB");

  if (!syncscopeActive) {
    a.style.background = "#222";
    b.style.background = "#222";
    a.style.boxShadow = "";
    b.style.boxShadow = "";
    return;
  }

  if (!masterOn) {
    a.style.background = `rgba(255,255,100,1)`;
    b.style.background = `rgba(255,255,100,1)`;
    a.style.boxShadow = `0 0 30px rgba(255,255,100,1)`;
    b.style.boxShadow = `0 0 30px rgba(255,255,100,1)`;
    return;
  }

  let deg = (angle * 180) / Math.PI;
  if (deg < 0) deg += 360;
  let direction = genFreq > 60 ? "fast" : "slow";
  let brightness = 1;
  let phaseDiff = (deg + 90) % 360;

  if (direction === "fast" || direction === "slow") {
    if (phaseDiff > 350 || phaseDiff < 10) {
      brightness = 0;
    } else if (phaseDiff >= 10 && phaseDiff <= 20) {
      brightness = (phaseDiff - 10) / 10;
    } else if (phaseDiff >= 340 && phaseDiff < 350) {
      brightness = (350 - phaseDiff) / 10;
    }
  }

  brightness += Math.abs(genVolts - busVolts) / 10;
  brightness = Math.min(1, brightness);

  const glow = `0 0 ${30 * brightness}px rgba(255,255,100,${brightness})`;
  a.style.background = `rgba(255,255,100,${brightness})`;
  b.style.background = `rgba(255,255,100,${brightness})`;
  a.style.boxShadow = glow;
  b.style.boxShadow = glow;
}

function drawGauges() {
  if (genGauge) genGauge.setValueAnimated(Number(genVolts), 1);
  if (busGauge) busGauge.setValueAnimated(Number(busVolts), 1);
}

function drawSineWave() {
  ctx.clearRect(0, 0, sineCanvas.width, sineCanvas.height);

  const cycles = 6;
  const duration = cycles / 60;
  const pxPerSec = sineCanvas.width / duration;

  if (syncscopeActive) {
    ctx.strokeStyle = "red";
    ctx.beginPath();
    for (let x = 0; x < sineCanvas.width; x++) {
      const t = x / pxPerSec + time;
      const y = 100 + 40 * Math.sin(2 * Math.PI * 60 * t);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  if (fieldClosed) {
    ctx.strokeStyle = "blue";
    ctx.beginPath();
    for (let x = 0; x < sineCanvas.width; x++) {
      const t = x / pxPerSec + time;
      const amp = (genVolts - 5) / 12 * 40;
      const y = 100 + amp * Math.sin(2 * Math.PI * genFreq * t);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  time += 1 / 60 / sineCanvas.width;
}

function loop() {
  drawGauges();
  drawSyncscope();
  drawSineWave();
  requestAnimationFrame(loop);
}
loop();
