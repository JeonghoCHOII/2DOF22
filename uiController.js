/* ============  src/uiController.js  ============ */
import { Physics2DOF } from "./physicsCore.js";
import { PhaseSpaceRenderer } from "./renderers/phaseSpaceRenderer.js";
import { PendulumRenderer }   from "./renderers/pendulumRenderer.js";

// ── DOM refs
const startBtn = document.getElementById("startBtn");
const stopBtn  = document.getElementById("stopBtn");
const capture  = document.getElementById("captureBtn");

// canvases
const layer2  = document.getElementById("layer2");
const layer3  = document.getElementById("layer3");
const pendCvs = document.getElementById("cvs3");

// reactive scale parameter
const SCALE   = { value: 100 };

// ── create engine & renderers
let engine = null;
let phaseR = null;
let pendR  = null;
let animId = null;

function initEngineFromForm(){
  // 👉  realistically, read inputs; here we hard‑code for brevity
  engine = new Physics2DOF({
    initialQ:[1,0], initialV:[0,0],
    metricType:"flat", potentialType:"pendulum"
  });
  phaseR = new PhaseSpaceRenderer({ line:layer2.getContext("2d"),
                                    point:layer3.getContext("2d") }, SCALE);
  pendR  = new PendulumRenderer(pendCvs, 1, 1);
}

function loop(){
  engine.step(0.01);
  const state = engine.getState();
  phaseR.draw(state);
  pendR.draw(state);
  animId = requestAnimationFrame(loop);
}

startBtn.onclick = () => {
  if(animId) cancelAnimationFrame(animId);
  initEngineFromForm();
  loop();
};

stopBtn.onclick  = () => animId && cancelAnimationFrame(animId);

capture.onclick  = () => {
  const url = layer2.toDataURL("image/png");
  const a   = document.createElement("a");
  a.href = url; a.download = "trajectory.png"; a.click();
};