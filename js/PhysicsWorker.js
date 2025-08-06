import { RK4step } from './PhysicsEngine.js';

self.onmessage = ({ data }) => {
	// main.js 에서 보낸 상태벡터와 시간 간격 수신
	const { x, v, dt, MASS, potential, metric, constraint, Q, dq } = data;

	// RK4 한 스텝 계산
	const { x: nx, v: nv, a: na } 
		= RK4step(x, v, dt, MASS, metric, potential, constraint, Q, dq);

	// 결과를 main thread 로 전송
	self.postMessage({ x: nx, v: nv, a: na });
};
