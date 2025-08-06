//2차원 벡터에 대한 그래프!!!!!!
//Dim(x) = 2일 것!!!!!!

function addLine(ctx, WIDTH, HEIGHT){       //각종 축 그리기
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0.5*WIDTH,0);
    ctx.lineTo(0.5*WIDTH,HEIGHT);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0,0.5*HEIGHT);
    ctx.lineTo(WIDTH,0.5*HEIGHT);
    ctx.stroke();
}

// draw contour lines and mapping potential

//1. Potential 범위 탐색하기

function getGrid(cols, rows, q1min, q2min, q1max, q2max, potential) {
    const q1Array = Array.from({length: cols}, (_,i) => 
        q1min + (q1max - q1min) * ((i + 0.5)/cols)
        );
    const q2Array = Array.from({length: rows}, (_,i) =>
        q2min + (q2max - q2min) * (i / rows)
        );

    const vGrid = Array(cols).fill().map( () => Array(rows) );
    let minV = Infinity, maxV = -Infinity;
    //const isCentral = getPotential() === "Central";
    //const rMask = 0;

    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            const q1 = q1Array[i], q2 = q2Array[j];
           // const r = Math.hypot(x[0],x[1]);
            /*let v;
            if (isCentral && r < 0.2) {
                const ratio = rMask/r;
                v = Potential(q1*ratio,q2*ratio);
            } else {
                v = Potential(q1,q2);
            }*/
            const v = potential([q1,q2]);
            vGrid[i][j] = v;
            if (v < minV) minV = v;
            if (v > maxV) maxV = v;
        }
    }
    return { cols, rows, q1Array, q2Array, vGrid, minV, maxV };
}

function MapAndContour(grid, ctx, G_SCALE = 100, WIDTH = 600, HEIGHT = 600) {

    const { cols, rows, q1Array, q2Array, vGrid, minV, maxV } = grid;

    let nlevels = 12;   //등고선 수

    const levels = Array.from({ length: nlevels }, (_, k) =>
        minV + (maxV - minV) * (k / nlevels)
    );
    //point 샘플링 시 허용오차 셋팅
    const eps = (maxV - minV) / (nlevels * 48);

    //점의 크기
    const pxW = WIDTH / cols, pxH = HEIGHT / rows;

    //const TYPE = getPotential();      

    for (let i = 0; i < cols; i++) {
        const px = WIDTH/2 + G_SCALE * q1Array[i];

        for (let j = 0; j < rows; j++) {

            const py = HEIGHT/2 - G_SCALE * q2Array[j];

            const v = vGrid[i][j];
            //if (v === Infinity) v = minV;
            

            let isContour = false;
            for (let k = 1; k < levels.length; k++) {
                if(Math.abs(v - levels[k]) < eps) {
                    isContour = true;
                    break;
                }
            }

            let spread;
            if (isContour) {
                ctx.fillStyle = `rgb(32,32,32)`;
            } else {
                const t = (v - minV) / (maxV - minV);
                const hue = 30 + t * 20;
                const light = 40 + t * (90 - 40);
                ctx.fillStyle = `hsl(${hue},100%,${light}%)`;
            }

            const rx = Math.round(px - pxW/2- 0.1);
            const ry = Math.round(py - pxH/2- 0.1);
            ctx.fillRect(rx, ry, pxW, pxH);
        }

    }
}

function drawLegend(ctx, WIDTH = 600) {
    const x = WIDTH - 40;  // 범례 위치 (오른쪽 상단)
    const y = 20;
    const w = 20;
    const h = 200;
    const steps = 100;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const hue = 30 + t * 20;
        const light = 40 + t * (90 - 40);
        ctx.fillStyle = `hsl(${hue},100%,${light}%)`;
        ctx.fillRect(x, y + h - i * (h / steps), w, h / steps);
    }

    // 테두리
    ctx.strokeStyle = "black";
    ctx.strokeRect(x, y, w, h);
}


function drawSpace(ctx, potential, G_SCALE = 100, WIDTH = 600, HEIGHT = 600) {
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    //const isFree = getPotential() === "free";

    const q1min = -WIDTH/(2*G_SCALE), q1max = WIDTH/(2*G_SCALE);
    const q2min = -HEIGHT/(2*G_SCALE), q2max = HEIGHT/(2*G_SCALE);

    const grid = getGrid(WIDTH, HEIGHT, q1min, q2min, q1max, q2max, potential);
    MapAndContour(grid, ctx);


}

function axisName(ctx, WIDTH = 600, HEIGHT = 600) {
    // 축 이름
    ctx.font = "20px Arial";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // x축 레이블 (아래쪽 중앙)
    ctx.fillText("q1", WIDTH - 30, 0.5 * HEIGHT + 20);
    // y축 레이블 (왼쪽 위쪽 중앙에 회전하여)
    ctx.save();
    ctx.translate(0.5 * WIDTH - 20, 30);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("q2", 0, 0);
    ctx.restore();
}

export function drawLine(ctx, prevx, x, G_SCALE = 100, WIDTH = 600, HEIGHT = 600){
    /*ctx.beginPath();
    ctx.fillStyle = '#000000';
    ctx.arc(G_SCALE*Q[0]+WIDTH/2, HEIGHT/2-G_SCALE*Q[1], 3*G_SCALE/100, 0, 2*Math.PI, false);
    ctx.fill();*/

    ctx.beginPath();
    ctx.strokeStyle = '#4B0082';
    ctx.lineWidth = 3*Math.log10(G_SCALE)/2;
    ctx.moveTo(G_SCALE*prevx[0]+WIDTH/2, HEIGHT/2-G_SCALE*prevx[1]);
    ctx.lineTo(G_SCALE*x[0]+WIDTH/2, HEIGHT/2-G_SCALE*x[1]);
    ctx.stroke();   
}

export function drawParticle(ctx, x, a, G_SCALE = 100, WIDTH = 600, HEIGHT = 600){
    /*ctx.beginPath();
    ctx.fillStyle = '#000000';
    ctx.arc(G_SCALE*Q[0]+WIDTH/2, HEIGHT/2-G_SCALE*Q[1], 3*G_SCALE/100, 0, 2*Math.PI, false);
    ctx.fill();*/
    const radius = 10*Math.log10(G_SCALE)/2;

    const Q1 = G_SCALE*x[0]+WIDTH/2;
    const Q2 = HEIGHT/2-G_SCALE*x[1]

    

    ctx.beginPath();
    ctx.fillStyle = '#4B0082';
    ctx.arc(Q1, Q2, 1.1*radius, 0, 2*Math.PI, false);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#FFEE91';
    ctx.arc(Q1, Q2, radius, 0, 2*Math.PI, false);
    ctx.fill();

    const aa = Math.hypot(a[0],a[1])
    const ad1 = a[0] / aa;
    const ad2 = a[1] / aa;

    ctx.beginPath();
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 4*Math.log10(G_SCALE)/2;
    ctx.moveTo(Q1, Q2);
    ctx.lineTo(Q1 + 50*ad1, Q2 - 50*ad2);
    ctx.stroke();
    
}


export function drawOscillator(ctx, x, K_SCALE = 50, WIDTH = 600, HEIGHT = 200) {
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    ctx.beginPath();
    ctx.moveTo(0,0.5*HEIGHT);
    ctx.lineTo(WIDTH,0.5*HEIGHT);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = '#000000';
    ctx.arc(K_SCALE*x[0]+0.333*WIDTH, 0.5*HEIGHT, 10, 0, 2*Math.PI, false);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#000000';
    ctx.arc(K_SCALE*x[1]+0.667*WIDTH, 0.5*HEIGHT, 10, 0, 2*Math.PI, false);
    ctx.fill();
}

export function drawPendulum(ctx, x, l1 = 1, l2 = 1, P_SCALE = 100, WIDTH = 600, HEIGHT = 600) {
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    addLine(ctx, WIDTH,HEIGHT);
    const pivotX = WIDTH/2;
    const pivotY = HEIGHT/2;

    const theta1 = x[0];
    const theta2 = x[1];
    const r1 = l1 * P_SCALE;
    const r2 = l2 * P_SCALE;

    const x1 = pivotX + r1 * Math.sin(theta1);
    const y1 = pivotY + r1 * Math.cos(theta1);

    const x2 = x1 + r2 * Math.sin(theta2);
    const y2 = y1 + r2 * Math.cos(theta2);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX,pivotY);
    ctx.lineTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(x1,y1,10,0,2*Math.PI,false);
    ctx.fill();

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(x2,y2,10,0,2*Math.PI,false);
    ctx.fill();
}

export function drawLayer14(layer1, layer4, x, potential, G_SCALE = 100, WIDTH = 600, HEIGHT = 600) {
    drawSpace(layer1, potential, G_SCALE, WIDTH, HEIGHT);
    addLine(layer1, WIDTH, HEIGHT);
    axisName(layer1, WIDTH, HEIGHT);
    drawLegend(layer4, WIDTH)
}
