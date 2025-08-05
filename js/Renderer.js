export default class Renderer {
    constructor(contexts, canvases, physicsEngine) {
        this.ctx = contexts;
        this.canvases = canvases;
        this.physics = physicsEngine;
    }

    // --- 메인 그리기 함수 ---

    drawParticle(state) {
        const { Q, G_SCALE, ADirection } = state;
        const ctx = this.ctx.layer3;
        const canvas = this.canvases.layer3;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const radius = 10 * Math.log10(G_SCALE) / 2;
        const Q1 = G_SCALE * Q[0] + canvas.width / 2;
        const Q2 = canvas.height / 2 - G_SCALE * Q[1];
        
        ctx.beginPath();
        ctx.fillStyle = '#4B0082';
        ctx.arc(Q1, Q2, 1.1 * radius, 0, 2 * Math.PI, false);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = '#FFEE91';
        ctx.arc(Q1, Q2, radius, 0, 2 * Math.PI, false);
        ctx.fill();

        if (ADirection && Math.hypot(...ADirection) > 0) {
            ctx.beginPath();
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 4 * Math.log10(G_SCALE) / 2;
            ctx.moveTo(Q1, Q2);
            ctx.lineTo(Q1 + 50 * ADirection[0], Q2 - 50 * ADirection[1]);
            ctx.stroke();
        }
    }
    
    drawTrajectory(prevState, state) {
        const { Q, G_SCALE } = state;
        const ctx = this.ctx.layer2;
        const canvas = this.canvases.layer2;

        ctx.beginPath();
        ctx.strokeStyle = '#4B0082';
        ctx.lineWidth = 3 * Math.log10(G_SCALE) / 2;
        ctx.moveTo(G_SCALE * prevState.Q[0] + canvas.width / 2, canvas.height / 2 - G_SCALE * prevState.Q[1]);
        ctx.lineTo(G_SCALE * Q[0] + canvas.width / 2, canvas.height / 2 - G_SCALE * Q[1]);
        ctx.stroke();	
    }

    drawOscillator(state) {
        const { Q } = state;
        const K_SCALE = 50;
        const ctx = this.ctx.oscillator;
        const canvas = this.canvases.oscillator;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.beginPath();
        ctx.moveTo(0, 0.5 * canvas.height);
        ctx.lineTo(canvas.width, 0.5 * canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = '#000000';
        ctx.arc(K_SCALE * Q[0] + 0.333 * canvas.width, 0.5 * canvas.height, 10, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = '#000000';
        ctx.arc(K_SCALE * Q[1] + 0.667 * canvas.width, 0.5 * canvas.height, 10, 0, 2 * Math.PI, false);
        ctx.fill();
    }

    drawPendulum(state) {
        const { Q } = state;
        const P_SCALE = 100;
        const ctx = this.ctx.pendulum;
        const canvas = this.canvases.pendulum;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.drawAxes(ctx, canvas.width, canvas.height);

        const pivotX = canvas.width / 2;
        const pivotY = canvas.height / 2;
        const r1 = this.physics.l1 * P_SCALE;
        const r2 = this.physics.l2 * P_SCALE;

        const x1 = pivotX + r1 * Math.sin(Q[0]);
        const y1 = pivotY + r1 * Math.cos(Q[0]);
        const x2 = x1 + r2 * Math.sin(Q[1]);
        const y2 = y1 + r2 * Math.cos(Q[1]);

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(x1, y1, 10, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y2, 10, 0, 2 * Math.PI, false);
        ctx.fill();
    }
    
    // --- 배경 및 보조 그리기 함수 ---

    drawBackground(state) {
        const { potentialType, G_SCALE } = state;
        const ctx = this.ctx.layer1;
        const canvas = this.canvases.layer1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (potentialType !== "free") {
            const q1min = -canvas.width / (2 * G_SCALE), q1max = canvas.width / (2 * G_SCALE);
            const q2min = -canvas.height / (2 * G_SCALE), q2max = canvas.height / (2 * G_SCALE);
            const grid = this.getGrid(600, 600, q1min, q1max, q2min, q2max);
            this.mapAndContour(grid, ctx, G_SCALE);
        }

        this.drawAxes(ctx, canvas.width, canvas.height);
        this.drawAxisLabels(ctx, canvas.width, canvas.height);
        
        // 범례 그리기
        const legendCtx = this.ctx.layer4;
        const legendCanvas = this.canvases.layer4;
        legendCtx.clearRect(0, 0, legendCanvas.width, legendCanvas.height);
        if (potentialType !== "free") {
            this.drawLegend(legendCtx, legendCanvas.width, legendCanvas.height);
        }
    }
    
    getGrid(cols, rows, q1min, q1max, q2min, q2max) {
        const q1Array = Array.from({length: cols}, (_,i) => q1min + (q1max - q1min) * ((i + 0.5) / cols));
        const q2Array = Array.from({length: rows}, (_,i) => q2min + (q2max - q2min) * (i / rows));

        const vGrid = Array(cols).fill().map(() => Array(rows));
        let minV = Infinity, maxV = -Infinity;

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const q1 = q1Array[i], q2 = q2Array[j];
                const v = this.physics.Potential(q1, q2);
                vGrid[i][j] = v;
                if (isFinite(v)) {
                    if (v < minV) minV = v;
                    if (v > maxV) maxV = v;
                }
            }
        }
        return { cols, rows, q1Array, q2Array, vGrid, minV, maxV };
    }

    mapAndContour(grid, ctx, G_SCALE) {
        const { cols, rows, q1Array, q2Array, vGrid, minV, maxV } = grid;
        const canvas = this.canvases.layer1;
        
        let nlevels = this.physics.type.potential === "Central" ? 24 : 12;
        const levels = Array.from({ length: nlevels }, (_, k) => minV + (maxV - minV) * (k / nlevels));
        const eps = (maxV - minV) / (nlevels * 48);
        const pxW = canvas.width / cols, pxH = canvas.height / rows;

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const px = canvas.width / 2 + G_SCALE * q1Array[i];
                const py = canvas.height / 2 - G_SCALE * q2Array[j];
                const v = vGrid[i][j];

                if (!isFinite(v)) continue;

                let isContour = false;
                for (let k = 1; k < levels.length; k++) {
                    if (Math.abs(v - levels[k]) < eps) {
                        isContour = true;
                        break;
                    }
                }
                
                if (isContour) {
                    ctx.fillStyle = `rgb(32,32,32)`;
                } else {
                    const t = (v - minV) / (maxV - minV);
                    const hue = 30 + t * 20;
                    const light = 40 + t * (90 - 40);
                    ctx.fillStyle = `hsl(${hue},100%,${light}%)`;
                }
                ctx.fillRect(Math.round(px - pxW/2 - 0.1), Math.round(py - pxH/2 - 0.1), pxW, pxH);
            }
        }
    }
    
    drawAxes(ctx, width, height) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0.5 * width, 0);
        ctx.lineTo(0.5 * width, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0.5 * height);
        ctx.lineTo(width, 0.5 * height);
        ctx.stroke();
    }
    
    drawAxisLabels(ctx, width, height) {
        ctx.font = "20px Arial";
        ctx.fillStyle = "#000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("q₁", width - 30, 0.5 * height + 20);
        ctx.save();
        ctx.translate(0.5 * width - 20, 30);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText("q₂", 0, 0);
        ctx.restore();
    }

    drawLegend(ctx, width, height) {
        const x = width - 40, y = 20, w = 20, h = 200, steps = 100;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const hue = 30 + t * 20;
            const light = 40 + t * (90 - 40);
            ctx.fillStyle = `hsl(${hue},100%,${light}%)`;
            ctx.fillRect(x, y + h - i * (h / steps), w, h / steps);
        }
        ctx.strokeStyle = "black";
        ctx.strokeRect(x, y, w, h);
    }
}