/* ===============  src/physicsCore.js  ================= */
import { MathUtils } from "./utils/math.js";

export class Physics2DOF {
  /**
   * @param {Object} opts – simulation parameters & initial state
   */
  constructor(opts = {}) {
    // ① immutable parameters
    this.mass   = opts.mass   ?? 1;
    this.mu     = opts.mu     ?? 1;
    this.l1     = opts.l1     ?? 1;
    this.l2     = opts.l2     ?? 1;
    this.g      = opts.g      ?? 9.8;
    this.rs     = opts.rs     ?? 0.4;
    this.k      = opts.k      ?? -0.5 * this.rs;   // central‑force coeff.
    this.dq     = opts.dq     ?? 1e-4;

    // ② mutable state
    this.state = {
      q: opts.initialQ?.slice() || [0, Math.PI],
      v: opts.initialV?.slice() || [0, 0]
    };

    // ③ callbacks – can be replaced on the fly by UI
    this.metricType    = opts.metricType    ?? "flat";       // "flat" | "pendulum" | "Schwarzschild"
    this.potentialType = opts.potentialType ?? "free";       // "free" | "pendulum" | …
    this.constraintFn  = opts.constraintFn  ?? (() => 0);
  }

  /* ───────────────────────────  metric & helpers ────────────────────────── */
  #localMetric([q1, q2]) {
    switch (this.metricType) {
      case "pendulum": {
        const g11 = (1 + this.mu) * this.l1 ** 2;
        const g22 = this.mu * this.l2 ** 2;
        const g12 = this.mu * this.l1 * this.l2 * Math.cos(q1 - q2);
        return [[g11, g12], [g12, g22]];
      }
      case "Schwarzschild": {
        const r = Math.hypot(q1, q2);
        const f = 1 / (1 - this.rs / r);
        const factor = 1 / (r ** 2);
        const g11 = 1 + factor * (f - 1) * q1 ** 2;
        const g22 = 1 + factor * (f - 1) * q2 ** 2;
        const g12 = (f - 1) * q1 * q2 * factor;
        return [[g11, g12], [g12, g22]];
      }
      default:
        return [[1, this.mu], [this.mu, 1]];
    }
  }

  #localInverse(metric) {
    const det = metric[0][0] * metric[1][1] - metric[0][1] * metric[1][0];
    return [
      [ metric[1][1] / det, -metric[0][1] / det ],
      [ -metric[0][1] / det, metric[0][0] / det ]
    ];
  }

  #potential(q1, q2) {
    switch (this.potentialType) {
      case "pendulum":
        return this.mass * (1 + this.mu) * this.g * this.l1 * (1 - Math.cos(q1)) +
               this.mass * this.mu       * this.g * this.l2 * (1 - Math.cos(q2));
      case "oscillator": {
        const k1 = 8, k2 = 5;
        return 0.5 * k1 * (q1 ** 2 + q2 ** 2) + 0.5 * k2 * (q1 - q2) ** 2;
      }
      case "Central": {
        const r = Math.hypot(q1, q2);
        if (r <= this.rs) return 0;   // regularisation inside horizon
        return this.k / r;
      }
      case "nearEarth":
        return this.mass * this.g * q2;
      default:
        return 0;
    }
  }

  /* ───────────────────────────  acceleration  ──────────────────────────── */
  #computeAcceleration(q, v) {
    const metric = this.#localMetric(q);
    const inv    = this.#localInverse(metric);

    // 1)  −∇V / m
    const gradV  = MathUtils.gradient((x,y)=>this.#potential(x,y), q, this.dq);
    const aV     = gradV.map(g => -g / this.mass);

    // 2)  – Γ^{i}_{jk} v^j v^k  (approx via finite diff)
    let aG = [0,0];
    if (this.metricType !== "flat") {
      // very light Christoffel estimation – full analytic avoided for brevity
      const eps = 1e-6;
      const metric_f = ([x,y]) => this.#localMetric([x,y]);
      const dgdq1 = metric_f([q[0]+eps, q[1]]).map((row,i)=>row.map((m, j)=> (m-metric[i][j])/eps));
      const dgdq2 = metric_f([q[0], q[1]+eps]).map((row,i)=>row.map((m, j)=> (m-metric[i][j])/eps));
      const dg = [dgdq1, dgdq2];  // dg[k][i][j] = ∂_k g_{ij}
      const Gamma = [...Array(2)].map(()=>[0,0]);
      for (let i=0;i<2;i++){
        for (let j=0;j<2;j++){
          for (let k=0;k<2;k++){
            Gamma[i][j] += 0.5*inv[i][k]*(dg[0][k][j]+dg[0][j][k]-dg[0][j][k]);
          }
        }
      }
      aG = [
        Gamma[0][0]*v[0]*v[0] + Gamma[0][1]*v[0]*v[1],
        Gamma[1][0]*v[0]*v[0] + Gamma[1][1]*v[0]*v[1]
      ];
    }

    // final accel in covariant form → contravariant via inverse metric
    const cov = [aV[0]-aG[0], aV[1]-aG[1]];
    return [ inv[0][0]*cov[0] + inv[0][1]*cov[1],
             inv[1][0]*cov[0] + inv[1][1]*cov[1] ];
  }

  /* ───────────────────────────  integrator  ────────────────────────────── */
  #f([q1, q2, v1, v2]) {
    const [a1, a2] = this.#computeAcceleration([q1,q2],[v1,v2]);
    return [v1, v2, a1, a2];
  }

  #rk4Step(dt) {
    const Y0 = [...this.state.q, ...this.state.v];
    const k1 = this.#f(Y0);
    const Y1 = Y0.map((y,i)=>y + 0.5*dt*k1[i]);
    const k2 = this.#f(Y1);
    const Y2 = Y0.map((y,i)=>y + 0.5*dt*k2[i]);
    const k3 = this.#f(Y2);
    const Y3 = Y0.map((y,i)=>y + dt*k3[i]);
    const k4 = this.#f(Y3);

    const updated = Y0.map((y,i)=> y + dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
    this.state.q = updated.slice(0,2);
    this.state.v = updated.slice(2);
  }

  /* ───────────────────────────  public API  ────────────────────────────── */
  step(dt){ this.#rk4Step(dt); }
  getState(){ return structuredClone(this.state); }
}