export default class UIManager {
    constructor() {
        // 입력 요소
        this.q1Input = document.getElementById("inputQ1");
        this.q2Input = document.getElementById("inputQ2");
        this.v1Input = document.getElementById("inputV1");
        this.v2Input = document.getElementById("inputV2");
        this.scaleInput = document.getElementById("inputScale");
        this.constraintInput = document.getElementById("constraintInput");
        this.metricSelect = document.getElementById("metricSelect");
        this.potentialSelect = document.getElementById("potentialSelect");
        this.attractionWrapper = document.getElementById("attractionWrapper");
        this.attractionRadios = document.querySelectorAll('input[name="attraction"]');

        // 버튼 요소
        this.startButton = document.getElementById("startBtn");
        this.stopButton = document.getElementById("stopBtn");
        this.captureButton = document.getElementById("captureBtn");
        
        // 캔버스 및 컨텍스트
        this.canvases = {
            layer1: document.getElementById("layer1"), // 배경
            layer2: document.getElementById("layer2"), // 궤적
            layer3: document.getElementById("layer3"), // 입자
            layer4: document.getElementById("layer4"), // 범례
            oscillator: document.getElementById("cvs2"),
            pendulum: document.getElementById("cvs3")
        };

        this.contexts = {
            layer1: this.canvases.layer1.getContext("2d"),
            layer2: this.canvases.layer2.getContext("2d"),
            layer3: this.canvases.layer3.getContext("2d"),
            layer4: this.canvases.layer4.getContext("2d"),
            oscillator: this.canvases.oscillator.getContext("2d"),
            pendulum: this.canvases.pendulum.getContext("2d")
        };

        // 로그 테이블
        this.logTableBody = document.getElementById("logTable").getElementsByTagName("tbody")[0];
    }

    // 초기 조건 값 가져오기
    getInitialConditions() {
        return {
            q: [parseFloat(this.q1Input.value), parseFloat(this.q2Input.value)],
            qdot: [parseFloat(this.v1Input.value), parseFloat(this.v2Input.value)],
            scale: parseFloat(this.scaleInput.value)
        };
    }

    // 물리 설정 값 가져오기
    getPhysicsOptions() {
        return {
            metric: this.metricSelect.value,
            potential: this.potentialSelect.value,
            constraint: this.constraintInput.value,
            isRepulsive: document.querySelector('input[name="attraction"]:checked').value === 'repulsion'
        };
    }
    
    // 이벤트 리스너 바인딩
    bindEventListeners(handlers) {
        this.startButton.addEventListener("click", handlers.start);
        this.stopButton.addEventListener("click", handlers.stop);
        this.captureButton.addEventListener("click", handlers.capture);
        this.potentialSelect.addEventListener("change", handlers.reset);
        this.metricSelect.addEventListener("change", handlers.reset);
        this.attractionRadios.forEach(radio => radio.addEventListener('change', handlers.reset));
    }

    // Central Force 선택 시 인력/척력 옵션 표시/숨김
    toggleAttraction() {
        const isCentral = this.potentialSelect.value === "Central";
        this.attractionWrapper.style.display = isCentral ? "inline-block" : "none";
    }
    
    // 모든 캔버스 클리어
    clearAllContexts() {
        for (const key in this.contexts) {
            const ctx = this.contexts[key];
            const canvas = this.canvases[key];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // 로그 테이블에 행 추가
    logError(time, error) {
        const row = this.logTableBody.insertRow();
        const cell1 = row.insertCell(0);
        const cell2 = row.insertCell(1);
        cell1.textContent = time.toFixed(2);
        cell2.textContent = Math.log10(error).toFixed(6);
    }

    // 궤적 캡쳐
    captureTrajectory() {
        const imageURL = this.canvases.layer2.toDataURL("image/png");
        const link = document.createElement('a');
        link.download = "canvas_capture.png";
        link.href = imageURL;
        link.click();
    }
}