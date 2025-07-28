body {
  background: #111;
  color: #eee;
  font-family: monospace;
  margin: 0;
  padding: 1rem;
  display: flex;
  justify-content: center;
}

.hmi {
  max-width: 1000px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gauges {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.lights {
  display: flex;
  gap: 1rem;
}

.light {
  width: 30px;
  height: 30px;
  background: #222;
  border-radius: 50%;
  border: 2px solid #888;
}

.switches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: center;
}

button {
  background: #333;
  color: #eee;
  border: 1px solid #666;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

button:hover {
  background: #555;
}

canvas {
  background: #000;
  margin-top: 1rem;
  border: 1px solid #333;
}
