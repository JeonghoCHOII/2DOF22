importScripts('PhysicsEngine.js'); // 또는 import PhysicsEngine from './PhysicsEngine.js' (ESM Worker 환경)
let physics = new PhysicsEngine();

onmessage = function(e) {
    const { type, data } = e.data;
    if (type === 'init') {
        physics = new PhysicsEngine();
        if (data.options) physics.updateOptions(data.options);
    } else if (type === 'setOptions') {
        physics.updateOptions(data.options);
    } else if (type === 'advance') {
        // === N스텝 반복 ===
        let { Y, dt, nSteps } = data;
        let log = [];
        let energy0 = physics.computeEnergy(Y[0], Y[1], Y[2], Y[3]);
        for (let i = 0; i < nSteps; ++i) {
            Y = physics.rk4Step(Y, dt);
            // 로그/에러 기록 예시
            if (data.logInterval && (i % data.logInterval === 0)) {
                let energy = physics.computeEnergy(Y[0], Y[1], Y[2], Y[3]);
                let error = Math.abs((energy - energy0) / energy0) || 1e-16;
                log.push({ step: i, energy, error });
            }
        }
        // 가속도 방향 등 추가
        const acc = physics.computeAccelerate([Y[0], Y[1]], [Y[2], Y[3]]);
        postMessage({ Y_new: Y, acc, log }); // trajectory도 필요하면 누적
    }
};