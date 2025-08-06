import { RK4step, math } from './PhysicsEngine.js';

self.onmessage = ({ data }) => {
    const { x, v, dt, MASS, potential, metric, constraint, Q, dq } = data;
    
    // potential, metric, constraint, Q는 함수가 아닌 문자열로 전달받아야 함
    const potentialFunc = new Function('x', `return ${potential}`);
    const metricFunc = new Function('x', `return ${metric}`);
    const constraintFunc = new Function('x', `return ${constraint}`);
    const QFunc = new Function('x', 'v', `return ${Q}`);
    
    const { x: nx, v: nv, a: na } = RK4step(
        x, v, dt, MASS, metricFunc, potentialFunc, constraintFunc, QFunc, dq
    );
    
    self.postMessage({ x: nx, v: nv, a: na, t: self.performance.now() });
};