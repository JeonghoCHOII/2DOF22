import { gradient, hessian, gradientRE, hessianRE } from './MathCore.js';
import { create, all } from 'mathjs';
const math = create(all);


/*********************************
 * metric, potential constraint는 DOM으로부터 참조함.
 * 정의역은 x: n차원 벡터임.
 * metric은 2 rank tensor
 * potential, constraint는 0 rank tensor.
 * generalized force Q는 DOM 참조.
*********************************/

/*export function localInverse(g, x) {
    const n = x.length;
    if ( n == 2 ) {
        const det = g[0][0]*g[1][1] - g[0][1]*g[1][0];
        return [[g[1][1] / det , -g[0][1] / det], [-g[1][0] / det, g[0][0] / det]];
    } else {
        return math.inv(g);
    }
}*/

function tensorGradient(T, x, h = 1e-4) {
    const T0 = T(x);
    const n = x.length;
    const D = Array.from({ length: n }, () => Array.from({ length: n }, () => new Array(n).fill(0)));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const fij = xi => T(xi)[i][j];
            D[i][j] = gradient(fij, x, h);
        }
    }

    return D;
}

function ChristoffelSymbol(g, x, h = 1e-4) {
    const dg = tensorGradient(g, x, h); //g는 반드시 정사각행렬
    const n = x.length;
    
    const G = Array.from({ length: n }, () => Array.from({ length: n }, () => new Array(n).fill(0)));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            for (let k =0; k < n; k++) {
                G[i][j][k] = 0.5 * (dg[i][j][k] + dg[j][i][k] - dg[j][k][i]);
            }
        }
    }

    return G;
}

//정의역: x, v ; n차원 벡터, Q: n차원 힘(반드시 x와 동차원)
export function computeAccelerate(MASS, x, v, metric, potential, constraint, Q, h = 1e-4) {
    const n = x.length;
    const A = new Array(n).fill(0);
    const g0 = metric(x);
    const inv = math.inv(g0);

    const ∇V = gradientRE(potential, x, h);
    const f0 = constraint(x);

    const G = ChristoffelSymbol(metric, x);

    const aG = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
            for (let k = 0; k < n; k++) {
                sum += G[i][j][k] * v[j] * v[k];
            }
        }
        aG[i] = sum;
    }

    const A0 = Q.map( (e, i) => e/MASS - aG[i] - ∇V[i]/MASS);
    if (f0 === 0) {
        for (let i = 0; i < n; i++) {
            let ai = 0;
            for (let j = 0; j < n; j++) {
                ai += inv[i][j]*A0[j];
            }
            A[i] = ai;
        }
        return A;
    }

    const ∇f = gradientRE(constraint, x, h);
    const Hf = hessianRE(constraint, x, h);

    // lagrange multiplier의 계산:
    // 𝜆 = -(F_i g^ij F_j)^(-1) (F_i g^ij A0_j + H_ij v^i v^j)
    let lambda = 0;
    if (∇f.some(e => e !== 0)) {
        let FgF = 0;
        let FgA = 0;
        let vHv = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                FgF += ∇f[i] * g0[i][j] * ∇f[j];
                FgA += ∇f[i] * g0[i][j] * A0[j];
                vHv += v[i] * Hf[i][j] * v[j];
            }
        }
        lambda = -(FgA + vHv) / (MASS * FgF);
    }

    for (let i = 0; i < n; i++) {
        let ai = 0;
        for (let j = 0; j < n; j++) {
            ai += inv[i][j]*(A0[j] + lambda * ∇f[j]);
        }
        A[i] = ai;
    }
    return A;
}

/**
 * RK4 적분기: 가속도→속도→위치 업데이트
 * @param {number[]} x 초기 위치 벡터
 * @param {number[]} v 초기 속도 벡터
 * @param {number} dt 타임스텝
 * @param {number} MASS 질량
 * @param {Function} metric 메트릭 함수 metric(x)
 * @param {Function} potential 퍼텐셜 함수 potential(x)
 * @param {Function|null} constraint 제약조건 함수 constraint(x)
 * @param {number[]} Q 외력 벡터
 * @param {number} h 수치미분 스텝
 * @returns {{ x: number[], v: number[] }} 업데이트된 위치·속도
 */
export function RK4step(x, v, dt, MASS, metric, potential, constraint, Q, h = 1e-4) {
  const n = x.length;

  // 상태 미분 함수: [dx, dv]
  function deriv(xi, vi) {
    const ai = computeAccelerate(MASS, xi, vi, metric, potential, constraint, Q, h);
    return { dx: vi.slice(), dv: ai };
  }

  // k1
  const k1 = deriv(x, v);

  // k2 준비
  const x2 = x.map((xi, i) => xi + k1.dx[i] * dt / 2);
  const v2 = v.map((vi, i) => vi + k1.dv[i] * dt / 2);
  const k2 = deriv(x2, v2);

  // k3 준비
  const x3 = x.map((xi, i) => xi + k2.dx[i] * dt / 2);
  const v3 = v.map((vi, i) => vi + k2.dv[i] * dt / 2);
  const k3 = deriv(x3, v3);

  // k4 준비
  const x4 = x.map((xi, i) => xi + k3.dx[i] * dt);
  const v4 = v.map((vi, i) => vi + k3.dv[i] * dt);
  const k4 = deriv(x4, v4);

  // 최종 위치·속도 계산
  const xNew = new Array(n), vNew = new Array(n);
  for (let i = 0; i < n; i++) {
    xNew[i] = x[i] + (dt / 6) * (k1.dx[i] + 2*k2.dx[i] + 2*k3.dx[i] + k4.dx[i]);
    vNew[i] = v[i] + (dt / 6) * (k1.dv[i] + 2*k2.dv[i] + 2*k3.dv[i] + k4.dv[i]);
  }

  return { x: xNew, v: vNew, a: k1.dv};
}