

import * as THREE from 'three';

export class CCySoundThree {
    constructor() {
        // 1. Three.js의 오디오 리스너 생성 (귀 역할)
        this.listener = new THREE.AudioListener();

        this.ctx = this.listener.context; // 로레벨 AudioContext 추출 ( 클럭 역할)

        // 2. 좌/우 독립 발진기 및 채널 관리 변수 선언
        this.oscLeft = null;
        this.oscRight = null;
        this.isSameFrequency = false; // 좌우 동기화 체크박스 상태 변수

        // 3. 상태 관리 변수 (현재 주파수 저장용)
        this.freqLeft = 440;  // 초기값 440Hz
        this.freqRight = 480; // 초기값 445Hz (바이노럴 효과를 위해 5Hz 차이)

        // [중요] 게이트 회로을 연결할 최종 마스터 출력 노드 미리 준비
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime); // 초기에는 소리 안 나게 0 설정
        
        // 최종적으로 Three.js 리스너의 출력단(스피커)에 마스터 노드를 연결
        this.masterGain.connect(this.ctx.destination);

        this.isInitialized = false;  // generator구성 완료 여부
        this.isOnGenerator = false; 
    }

    /**
     * 신호 발생기 구동 시작 ( 발진 시작)
     * 브라우저 보안 정책상 사용자 클릭 이벤트 내부에서 한 번 호출되어야 합니다.
     */
    startGenerator() {
        // 최초 1회만 발진기를 만들고 재생
        if (!this.isInitialized) {
            this.oscLeft = this.ctx.createOscillator();
            this.oscLeft.type = 'sine';
            this.oscLeft.frequency.setValueAtTime(this.freqLeft, this.ctx.currentTime);

            const pannerLeft = this.ctx.createStereoPanner();
            pannerLeft.pan.setValueAtTime(-1, this.ctx.currentTime);

            this.oscRight = this.ctx.createOscillator();
            this.oscRight.type = 'sine';
            this.oscRight.frequency.setValueAtTime(this.freqRight, this.ctx.currentTime);

            const pannerRight = this.ctx.createStereoPanner();
            pannerRight.pan.setValueAtTime(1, this.ctx.currentTime);

            this.oscLeft.connect(pannerLeft);
            pannerLeft.connect(this.masterGain);

            this.oscRight.connect(pannerRight);
            pannerRight.connect(this.masterGain);

            //  신호 발생 클럭 기동
            this.oscLeft.start();
            this.oscRight.start();
            
            this.isInitialized = true;
        }


        // 밸브를 열어 소리가 나가게 합니다 (전자회로 게이트 ON 느낌)
        // setValueAtTime을 써서 즉각적인 디지털적 켜짐을 구현합니다.
        this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime); 
        this.isOnGenerator = true;
        console.log("⚡ 신호 발생기 출력 개방 (소리 켬)");
    }
    stopGenerator() {
        if (!this.isInitialized) return;

        // 발진기를 파괴하는 대신, 마스터 게인의 크기를 완전히 0(GND 레벨)으로 차단.
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        
        this.isOnGenerator = false;
        console.log("🛑 신호 발생기 출력 차단 (소리 끔)");
    }
    /**
     * 왼쪽 주파수 설정 (10Hz ~ 10000Hz 범위 제한)
     */
    setLeftFrequency(hz) {
        this.freqLeft = Math.max(10, Math.min(10000, hz));
        
        if (this.oscLeft) {
            // 주파수를 부드럽게가 아니라 전자회로 노브를 돌리듯 즉각 변경(setValueAtTime)
            this.oscLeft.frequency.setValueAtTime(this.freqLeft, this.ctx.currentTime);
        }

        // '동일 주파수' 체크 상태라면 오른쪽 주파수도 왼쪽 기준으로 강제 동기화
        if (this.isSameFrequency) {
            this.setRightFrequency(this.freqLeft);
        }
    }

    /**
     * 오른쪽 주파수 설정 (10Hz ~ 10000Hz 범위 제한)
     */
    setRightFrequency(hz) {
        // 동일 주파수 모드일 때는 외부에서 오른쪽만 따로 바꾸는 것을 방지하고 왼쪽 값을 추종함
        if (this.isSameFrequency) {
            this.freqRight = this.freqLeft;
        } else {
            this.freqRight = Math.max(10, Math.min(10000, hz));
        }

        if (this.oscRight) {
            this.oscRight.frequency.setValueAtTime(this.freqRight, this.ctx.currentTime);
        }
    }

    /**
     * Same 주파수 설정 체크박스 연동 함수
     * @param {boolean} checked - 체크 여부
     */
    setSameFrequencyMode(checked) {
        this.isSameFrequency = checked;
        
        if (this.isSameFrequency) {
            // 체크하는 순간 기준이 되는 왼쪽 주파수를 오른쪽으로 복사 및 설정
            this.setRightFrequency(this.freqLeft);
            console.log(`🔗 좌우 주파수 동기화 완료 (기준: ${this.freqLeft}Hz)`);
        }
    }

    /**
     * 3D 공간 안에서 위치에 따라 소리가 변하는 입체 음향(Positional Audio) 소스를 생성합니다.
     */
    create3DSoundSource(audioBuffer) {
        // positional audio 생성
        const positionalAudio = new THREE.PositionalAudio(this.listener);
        
        // 여기에 로레벨 오디오 제어(Web Audio API 노드 연결 등)를 결합할 수 있습니다.
        // 예: 오디오 필터나 믹서 노드 연결 가능
        // const context = this.listener.context; // Web Audio API의 AudioContext 접근
        
        positionalAudio.setBuffer(audioBuffer);
        positionalAudio.setRefDistance(1); // 소리가 감쇄되기 시작하는 거리 설정
        
        return positionalAudio; // 생성된 소스 객체를 반환
    }
}
