import UIManager from './UIManager.js';
import PhysicsEngine from './PhysicsEngine.js';
import Renderer from './Renderer.js';

export default class Simulation {
    constructor() {
        this.ui = new UIManager();
        this.physics = new PhysicsEngine();
        this.renderer = new Renderer(this.ui.contexts, this.ui.canvases, this.physics);
        
        // 시뮬레이션 상태
        this.Q = [0, 0];
        this.Qdot = [0, 0];
        this.G_SCALE = 100;
        this.E0 = 0;
        this.ADirection = [0, 0];

        // 애니메이션 제어
        this.animationId = null;
        this.startTime = null;
        this.lastLogTime = null;
        this.logIntervalMs = 1000;
        
        this.setupEventListeners();
        this.resetAndDrawBackground();
    }
    
    setupEventListeners() {
        const handlers = {
            start: () => this.start(),
            stop: () => this.stop(),
            capture: () => this.ui.captureTrajectory(),
            reset: () => this.resetAndDrawBackground()
        };
        this.ui.bindEventListeners(handlers);
    }

    resetAndDrawBackground() {
        this.stop();
        this.ui.toggleAttraction();
        const options = this.ui.getPhysicsOptions();
        this.physics.updateOptions(options);

        const G_SCALE = this.ui.getInitialConditions().scale;
        this.renderer.drawBackground({ potentialType: options.potential, G_SCALE });
    }

    start() {
        if (this.animationId) this.stop();

        // UI에서 초기값 가져오기
        const initial = this.ui.getInitialConditions();
        this.Q = initial.q;
        this.Qdot = initial.qdot;
        this.G_SCALE = initial.scale;
        
        // 물리 옵션 업데이트 및 배경 다시 그리기
        const options = this.ui.getPhysicsOptions();
        this.physics.updateOptions(options);
        this.renderer.drawBackground({ potentialType: options.potential, G_SCALE: this.G_SCALE });
        
        // 궤적 레이어 초기화
        this.ui.contexts.layer2.clearRect(0,0, this.ui.canvases.layer2.width, this.ui.canvases.layer2.height);

        // 초기 에너지 계산 및 로그 초기화
        this.E0 = this.physics.computeEnergy(...this.Q, ...this.Qdot);
        this.ui.logTableBody.innerHTML = "";
        this.startTime = performance.now();
        this.lastLogTime = this.startTime;

        this.animate();
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        const prevState = { Q: [...this.Q], G_SCALE: this.G_SCALE };

        // 2번의 스텝으로 부드러움 향상
        for (let i = 0; i < 2; i++) {
            const Y = [this.Q[0], this.Q[1], this.Qdot[0], this.Qdot[1]];
            const Y_new = this.physics.rk4Step(Y, this.physics.dt);
            [this.Q[0], this.Q[1], this.Qdot[0], this.Qdot[1]] = Y_new;
            
            // 에너지 로그 기록
            const now = performance.now();
            if (now - this.lastLogTime >= this.logIntervalMs) {
                const E_current = this.physics.computeEnergy(...this.Q, ...this.Qdot);
                const error = Math.abs((E_current - this.E0) / this.E0) || 1e-16;
                this.ui.logError((now - this.startTime) / 1000, error);
                this.lastLogTime = now;
            }
        }
        
        // 가속도 방향 계산 (렌더링용)
        const [a1, a2] = this.physics.computeAccelerate(this.Q, this.Qdot);
        const aa = Math.hypot(a1,a2);
		this.ADirection = aa > 0 ? [a1/aa, a2/aa] : [0,0];

        // 현재 상태를 렌더러에 전달하여 그리기
        const currentState = { Q: this.Q, Qdot: this.Qdot, G_SCALE: this.G_SCALE, ADirection: this.ADirection };
        this.renderer.drawTrajectory(prevState, currentState);
        this.renderer.drawParticle(currentState);
        this.renderer.drawOscillator(currentState);
        this.renderer.drawPendulum(currentState);

        this.animationId = requestAnimationFrame(() => this.animate());
    }
}