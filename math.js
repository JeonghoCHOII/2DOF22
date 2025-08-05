/* =================  src/utils/math.js  ================= */
export const MathUtils = (() => {
  /** central difference with Richardson extrapolation (order‑1) */
  function diffRE(f, x, h, order = 1) {
    const p = 2;                    // leading error order for central diff
    const base = (f(x + h) - f(x - h)) / (2 * h ** order);
    const half = (f(x + h / 2) - f(x - h / 2)) / (2 * (h / 2) ** order);
    return (2 ** p * half - base) / (2 ** p - 1);
  }

  function gradient(f, [q1, q2], dq) {
    const dVdq1 = diffRE(x => f(x, q2), q1, dq);
    const dVdq2 = diffRE(y => f(q1, y), q2, dq);
    return [dVdq1, dVdq2];
  }

  function hessian(f, [q1, q2], dq) {
    const d2Vdq1 = diffRE(x => diffRE(z => f(z, q2), x, dq), q1, dq);
    const d2Vdq2 = diffRE(y => diffRE(z => f(q1, z), y, dq), q2, dq);
    const d2Vdq1dq2 = diffRE(x => diffRE(y => f(x, y), q2, dq), q1, dq);
    return [
      [d2Vdq1,     d2Vdq1dq2],
      [d2Vdq1dq2,  d2Vdq2   ]
    ];
  }

  return { diffRE, gradient, hessian };
})();