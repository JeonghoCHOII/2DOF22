export default class PhysicsEngine {
    constructor() {
        // 물리 상수
        this.dt = 0.01;
        this.dq = 0.0001;
        this.gravity = 9.8;
        this.l1 = 1;
        this.l2 = 1;
        this.spring1 = 8;
        this.spring2 = 5;
        this.MASS = 1;
        this.mu = 1;
        this.rs = 0.4;
        this.k = -0.5 * this.rs;

        // 시뮬레이션 타입
        this.type = { metric: 'pendulum', potential: 'pendulum' };
        this.constraintFunc = () => 0;
    }
    
    updateOptions(options) {
        this.type = { metric: options.metric, potential: options.potential };
        this.k = options.isRepulsive ? Math.abs(0.5 * this.rs) : -Math.abs(0.5 * this.rs);
        try {
            this.constraintFunc = new Function("q1", "q2", `return ${options.constraint};`);
        } catch(e) {
            this.constraintFunc = () => 0;
        }
    }
    
    // --- 물리 계산 메서드들 ---

    localMetric(q1, q2) {
        let g11, g22, g12;
        switch(this.type.metric) {
            case "pendulum":
                g11 = (1 + this.mu) * this.l1 * this.l1;
                g22 = this.mu * this.l2 * this.l2;
                g12 = this.mu * this.l1 * this.l2 * Math.cos(q1 - q2);
                return [ [g11, g12], [g12, g22] ];
            case "Schwarzschild":
                const r = Math.hypot(q1, q2);
                if (r === 0) return [[1, 0], [0, 1]];
                const f = 1 / (1 - this.rs / r);
                const factor = 1 / (r * r);
                g11 = 1 + factor * (f - 1) * q1 * q1;
                g22 = 1 + factor * (f - 1) * q2 * q2;
                g12 = (f - 1) * q1 * q2 * factor;
                return [ [g11, g12], [g12, g22] ];
            default: // "flat"
                return [[1, this.mu],[this.mu, 1]];
        }
    }

    localInverse(q1, q2) {
        const g = this.localMetric(q1, q2);
        const det = g[0][0] * g[1][1] - g[0][1] * g[1][0];
        if (det === 0) return [[0,0],[0,0]];
        const inv11 = g[1][1] / det;
        const inv22 = g[0][0] / det;
        const inv12 = -g[0][1] / det;
        return [ [inv11, inv12], [inv12, inv22] ];
    }

    Potential(q1, q2) {
        switch(this.type.potential) {
            case "pendulum":
                return this.MASS * (1 + this.mu) * this.gravity * this.l1 * (1 - Math.cos(q1))
                     + this.MASS * this.mu * this.gravity * this.l2 * (1 - Math.cos(q2));
            case "smallangle":
                return 0.5 * this.MASS * (1 + this.mu) * this.gravity * this.l1 * q1 * q1 
                     + 0.5 * this.MASS * this.mu * this.gravity * this.l2 * q2 * q2;
            case "oscillator":
                return 0.5 * this.spring1 * (q1 * q1 + q2 * q2) + 0.5 * this.spring2 * (q1 - q2) * (q1 - q2);
            case "Central":
                const r = Math.hypot(q1, q2);
                if (r === 0) return Infinity;
                let V = this.k / r;
                if (r <= this.rs) {
                    V = 0.5 * this.k / this.rs - 0.5 * this.k * r * r / (this.rs * this.rs * this.rs) + this.k / this.rs;
                }
                return V;
            case "nearEarth":
                return this.MASS * this.gravity * q2;
            default: // "free"
                return 0;
        }
    }

    Gradient(f, q1, q2, dq) {
        const V1f = f(q1 + dq, q2);
        const V1i = f(q1 - dq, q2);
        const V2f = f(q1, q2 + dq);
        const V2i = f(q1, q2 - dq);
        const DV1 = (V1f - V1i) / (2 * dq);
        const DV2 = (V2f - V2i) / (2 * dq);
        return [ DV1, DV2 ];
    }
    
    diffRE(f, x, h, order = 1) {
        const base = (f(x + h) - f(x - h)) / (2 * h ** order);
        const half = (f(x + h / 2) - f(x - h / 2)) / (2 * (h / 2) ** order);
        const p = 2;
        return (Math.pow(2, p) * half - base) / (Math.pow(2, p) - 1);
    }

    GradientRE(f, q1, q2, dq) {
        const dVdq1 = this.diffRE(x => f(x, q2), q1, dq, 1);
        const dVdq2 = this.diffRE(y => f(q1, y), q2, dq, 1);
        return [dVdq1, dVdq2];
    }

    HessianRE(f, q1, q2, dq) {
        const d2Vdq1 = this.diffRE(x => this.diffRE(z => f(z, q2), x, dq, 1), q1, dq, 1);
        const d2Vdq2 = this.diffRE(y => this.diffRE(z => f(q1, z), y, dq, 1), q2, dq, 1);
        const d2Vdq1dq2 = this.diffRE(x => this.diffRE(y => f(x, y), q2, dq, 1), q1, dq, 1);
        return [[d2Vdq1, d2Vdq1dq2], [d2Vdq1dq2, d2Vdq2]];
    }

    ChristoffelSymbol(q1, q2) {
        const g11 = (q1, q2) => this.localMetric(q1, q2)[0][0];
        const g22 = (q1, q2) => this.localMetric(q1, q2)[1][1];
        const g12 = (q1, q2) => this.localMetric(q1, q2)[0][1];

        const dg = [ [ [0,0],[0,0] ], [ [0,0],[0,0] ] ];
        dg[0][0] = this.Gradient(g11, q1, q2, this.dq);
        dg[0][1] = this.Gradient(g12, q1, q2, this.dq);
        dg[1][0] = dg[0][1];
        dg[1][1] = this.Gradient(g22, q1, q2, this.dq);

        const G = [ [ [0,0],[0,0] ], [ [0,0],[0,0] ] ];
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                for (let k = 0; k < 2; k++) {
                    G[i][j][k] = 0.5 * (dg[i][j][k] + dg[j][i][k] - dg[j][k][i]);
                }
            }
        }
        return G;
    }

    GeneralizedForce(Q, Qdot) {
        const timeForce = [0, 0];
        if (this.type.metric === "Schwarzschild") {
            const r = Math.hypot(Q[0], Q[1]);
            if (r === 0) return timeForce;
            const g = this.localMetric(Q[0], Q[1]);
            const factor = -this.rs / (r * r * r);
            timeForce[0] = factor * (g[0][0] * Q[0] + g[0][1] * Q[1]);
            timeForce[1] = factor * (g[1][0] * Q[0] + g[1][1] * Q[1]);
        }
        return timeForce;
    }

    computeAccelerate(Q, Qdot) {
        const [q1, q2] = Q;
        const FQ = this.GeneralizedForce(Q, Qdot);
        const aQ = [FQ[0] / this.MASS, FQ[1] / this.MASS];

        const FV = this.Gradient(this.Potential.bind(this), q1, q2, this.dq);
        const aV = [FV[0] / this.MASS, FV[1] / this.MASS];

        const aG = [0, 0];
        if (this.type.metric !== "flat") {
            const G = this.ChristoffelSymbol(q1, q2);
            for (let i = 0; i < 2; i++) {
                let sum = 0;
                for (let j = 0; j < 2; j++) {
                    for (let k = 0; k < 2; k++) {
                        sum += G[i][j][k] * Qdot[j] * Qdot[k];
                    }
                }
                aG[i] = sum;
            }
        }
        
        const A0 = [aQ[0] - aG[0] - aV[0], aQ[1] - aG[1] - aV[1]];
        const Inv = this.localInverse(q1, q2);

        if (this.constraintFunc(q1, q2) === 0 && this.constraintFunc.toString() === 'new Function("q1", "q2", "return 0;")') {
            const a1 = Inv[0][0] * A0[0] + Inv[0][1] * A0[1];
            const a2 = Inv[1][0] * A0[0] + Inv[1][1] * A0[1];
            return [a1, a2];
        }

        const F = this.GradientRE(this.constraintFunc, q1, q2, this.dq);
        const H = this.HessianRE(this.constraintFunc, q1, q2, this.dq);

        let lambda = 0;
        if (F[0] !== 0 || F[1] !== 0) {
            let fgf = 0, FGA = 0, VHV = 0;
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    fgf += F[i] * Inv[i][j] * F[j];
                    FGA += F[i] * Inv[i][j] * A0[j];
                    VHV += Qdot[i] * H[i][j] * Qdot[j];
                }
            }
            if (fgf !== 0) {
                lambda = (-1 / fgf) * (FGA + VHV);
            }
        }
        
        const gq1 = A0[0] + lambda * F[0];
        const gq2 = A0[1] + lambda * F[1];
        const a1 = Inv[0][0] * gq1 + Inv[0][1] * gq2;
        const a2 = Inv[1][0] * gq1 + Inv[1][1] * gq2;
        return [a1, a2];
    }

    // RK4 Integrator
    rk4Step(Y, dt) {
        const f = (Y_state) => {
            const [q1, q2, v1, v2] = Y_state;
            const [a1, a2] = this.computeAccelerate([q1, q2], [v1, v2]);
            return [v1, v2, a1, a2];
        };

        const k1 = f(Y);
        const Y2 = Y.map((y, i) => y + dt * k1[i] / 2);
        const k2 = f(Y2);
        const Y3 = Y.map((y, i) => y + dt * k2[i] / 2);
        const k3 = f(Y3);
        const Y4 = Y.map((y, i) => y + dt * k3[i]);
        const k4 = f(Y4);

        return Y.map((y, i) => y + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
    }
    
    computeEnergy(q1, q2, v1, v2) {
        const g = this.localMetric(q1, q2);
        const T = 0.5 * (g[0][0] * v1 * v1 + 2 * g[0][1] * v1 * v2 + g[1][1] * v2 * v2);
        const V = this.Potential(q1, q2);
        return T + V;
    }
}