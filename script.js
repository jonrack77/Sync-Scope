let masterStarted = false;
let fieldClosed = false;
let genVoltage = 0;
let genFrequency = 0;
let genPhase = 0;
let vrInterval = null;
let spdInterval = null;
let breakerClosed = false;

const gridVoltage = 115;
const gridFrequency = 60;
let gridPhase = 0;

function toggleMaster() {
  masterStarted = !masterStarted;
  if (masterStarted) {
    genFrequency = 50;
  } else {
    genVoltage = 0;
    genFrequency = 0;
    fieldClosed = false;
    breakerClosed = false;
  }
}

function closeField() {
  if (!masterStarted) return;
  fieldClosed = true;
  genVoltage = 110;
}

function toggleBreaker() {
  if (!masterStarted || !fieldClosed) return;
  breakerClosed = !breakerClosed;
}

function vrAdjust(up) {
  if (!fieldClosed) return;
  stopVrAdjust();
  vrInterval = setInterval(() => {
    genVoltage += up ? 0.5 : -0.5;
    if (genVoltage > 130) genVoltage = 130;
    if (genVoltage < 0) genVoltage = 0;
  }, 100);
}

function stopVrAdjust() {
  clearInterval(vrInterval);
}

function spdAdjust(up) {
  if (!masterStarted) return;
  stopSpdAdjust();
  spdInterval = setInterval(() => {
    genFrequency += up ? 0.1 : -0.1;
    if (genFrequency > 66) genFrequency = 66;
    if (genFrequency < 0) genFrequency = 0;
  }, 100);
}

function stopSpdAdjust() {
  clearInterval(spdInterval);
}

function updateDisplay() {
  document.getElementById('gen-volts').textContent = `${genVoltage.toFixed(1)} kV`;
  document.getElementById('bus-volts').textContent = `${gridVoltage} kV`;
  document.getElementById('gen-freq').textContent = `Gen Freq: ${genFrequency.toFixed(1)} Hz`;
  document.getElementById('grid-freq').textContent = `Grid Freq: ${gridFrequency.toFixed(1)} Hz`;
}

function drawScope() {
  const canvas = document.getElementById('synchroscope');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 80;

  // Face
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Labels
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('SLOW', cx - radius + 10, cy);
  ctx.fillText('FAST', cx + radius - 40, cy);

  // Arrow
  ctx.beginPath();
  ctx.arc(cx + 30, cy + 50, 20, 0, 2 * Math.PI);
  ctx.strokeStyle = 'gray';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 20, cy + 50);
  ctx.lineTo(cx + 40, cy + 50);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 35, cy + 45);
  ctx.lineTo(cx + 40, cy + 50);
  ctx.lineTo(cx + 35, cy + 55);
  ctx.fill();

  // Needle
  const deltaPhase = (genPhase - gridPhase + 360) % 360;
  const angle = ((deltaPhase / 360) * 2 * Math.PI) - Math.PI / 2;
  const x = cx + radius * Math.cos(angle);
  const y = cy + radius * Math.sin(angle);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(x, y);
  ctx.strokeStyle = 'lime';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawWaveform() {
  const canvas = document.getElementById('waveform');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const width = canvas.width;
  const height = canvas.height;
  const mid = height / 2;

  ctx.lineWidth = 2;

  // Grid wave
  ctx.beginPath();
  ctx.strokeStyle = 'green';
  for (let x = 0; x < width; x++) {
    const t = x / width;
    const y = mid + Math.sin(2 * Math.PI * t * gridFrequency + gridPhase * Math.PI / 180) * 50;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Gen wave
  if (fieldClosed) {
    ctx.beginPath();
    ctx.strokeStyle = 'blue';
    for (let x = 0; x < width; x++) {
      const t = x / width;
      const y = mid + Math.sin(2 * Math.PI * t * genFrequency + genPhase * Math.PI / 180) * 50 * (genVoltage / 115);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Sync lights
  const left = document.getElementById('light-left');
  const right = document.getElementById('light-right');
  const phaseDiff = Math.abs(gridPhase - genPhase) % 360;
  const brightness = 1 - Math.cos(phaseDiff * Math.PI / 180);
  const voltageDiff = Math.abs(gridVoltage - genVoltage);
  const maxBrightness = Math.min((brightness + voltageDiff / 115), 1);
  const intensity = Math.round(maxBrightness * 255);
  const color = `rgb(${intensity},${intensity},${intensity})`;
  left.style.backgroundColor = color;
  right.style.backgroundColor = color;
}

function loop() {
  if (masterStarted) {
    genPhase = (genPhase + genFrequency * 0.6) % 360;
  }
  gridPhase = (gridPhase + gridFrequency * 0.6) % 360;
  updateDisplay();
  drawScope();
  drawWaveform();
  requestAnimationFrame(loop);
}

loop();
