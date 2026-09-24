

import * as THREE from 'three';

export class CCySoundThree {
    constructor() {
        this.listener = new THREE.AudioListener();
        this.ctx = this.listener.context; // Web Audio API Context 

        // 1. 회로 부품(노드) 선언
        this.oscLeft = null;
        this.oscRight = null;
        this.pannerLeft = null;
        this.pannerRight = null;
        this.gainLeft = null;   // 좌측 개별 볼륨 회로
        this.gainRight = null;  // 우측 개별 볼륨 회로

        // 2. 단속 게이트 회로 핵심 부품
        this.gateLFO = null;    // 펄스를 만들어줄 저주파 발진기
        this.gateGain = null;   // 게이트 스위칭 밸브

        // 3. 최종 마스터 출력단
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime); // 초기 차단 상태
        //스피커에 연결하지 않고 오디오 신호를 모아주는 내부 믹서 역할만 하도록 주석처리. this.masterGain.connect(this.ctx.destination);// masterGain은 스피커에 직접 연결


        //Three.js의 공간음향을 담당할 3D 오디오 객체 선언
        this.positionalAudio = null;

        this.isInitialized = false;
        this.isOnGenerator = false;
        // 4. 내부 상태 저장 변수들
        this.params = null; 
    }

    /**
     * 회로 최초 1회 생성 및 초기화
     * @param {Object} ParamsSound - main의 상태 객체 참조
     */
    initGenerator(ParamsSound) {
        if (this.isInitialized) return;
        this.params = ParamsSound;

        // [A] Three.js 공간음향 객체 생성 (나의 귀 역할을 하는 listener 주입)
        this.positionalAudio = new THREE.PositionalAudio(this.listener);

        // [A] 오디오 소스 발진기 및 팬 노드 생성
        this.oscLeft = this.ctx.createOscillator();
        this.oscRight = this.ctx.createOscillator();
        this.oscLeft.type = 'sine';
        this.oscRight.type = 'sine';

        this.pannerLeft = this.ctx.createStereoPanner();
        this.pannerRight = this.ctx.createStereoPanner();
        this.pannerLeft.pan.setValueAtTime(-1, this.ctx.currentTime);
        this.pannerRight.pan.setValueAtTime(1, this.ctx.currentTime);

        this.gainLeft = this.ctx.createGain();
        this.gainRight = this.ctx.createGain();

        // [B] 게이트 단속용 커스텀 LFO 및 스위칭 게인 회로 구성
        // 듀티비를 완벽한 사각파 레벨로 제어하기 위해 오디오 노드 신호 연산을 사용합니다.
        this.gateLFO = this.ctx.createOscillator();
        this.gateLFO.type = 'sawtooth'; // 톱니파를 사용하여 듀티비 기준선 비교 처리 기반 마련
        this.gateGain = this.ctx.createGain(); 

        // [C] 회로 배선 연결 (Signal Routing) 
        // 좌측 채널: OscL -> GainL -> PannerL -> GateGain
        this.oscLeft.connect(this.gainLeft);
        this.gainLeft.connect(this.pannerLeft);
        this.pannerLeft.connect(this.gateGain);

        // 우측 채널: OscR -> GainR -> PannerR -> GateGain
        this.oscRight.connect(this.gainRight);
        this.gainRight.connect(this.pannerRight);
        this.pannerRight.connect(this.gateGain);

        // 게이트 출력 -> 최종 마스터 출력
        this.gateGain.connect(this.masterGain);

        // 💡 [핵심 배선 전환] 최종 합산된 신호발생기 출력(masterGain)을 
        // 스피커(ctx.destination)가 아니라 Three.js의 3D 오디오 입력단으로 우회 연결합니다.
        this.positionalAudio.setNodeSource(this.masterGain);

        // 💡 [공간음향 파라미터 세팅] 
        this.positionalAudio.setRefDistance(1);       // 소리가 감쇄하기 시작하는 기준 거리 (1m)
        this.positionalAudio.setMaxDistance(20);      // 소리가 들리는 최대 거리 (20m)
        this.positionalAudio.setDistanceModel('linear'); // 거리에 따라 선형적으로 소리가 줄어들게 설정


        // 발진 클럭 영구 기동
        this.oscLeft.start();
        this.oscRight.start();
        this.gateLFO.start();

        this.isInitialized = true;

        

        // 현재 파라미터 초기값 회로 적용
        this.updateCarrier();
        this.updateGate();
        this.updateBalance();
    }

    /**
     * 신호 발생기 출력 개방 (소리 켬)
     * 앞에 반드시 'async'가 붙어 있어야 내부에서 await를 쓸 수 있습니다!
     */
    async startGenerator() {
        if (!this.isInitialized) return;

        // [핵심 보정] 오디오 컨텍스트가 잠들어 있다면 깨어날 때까지 명시적으로 기다립니다.
        // 출력시 왼쪽이 먼저 들리고 1초정도 지나서 오른쪽 들리는 문제 해결. 
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        // 출력 개방
        this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime); 
        this.isOnGenerator = true;

        // [핵심 보정] 하드웨어가 완전히 활성화된 이 시점에 게이트 타이머를 깨웁니다.
        this.updateGate();

        console.log("⚡ 신호 발생기 출력 ON");
    }

    /**
     * 신호 발생기 출력 차단 (소리 끔)
     */
    stopGenerator() {
        if (!this.isInitialized) return;

            // 게이트 타이머 즉시 소거 (오프 상태에서 불필요한 루프 방지)
        if (this.gateTimer) {
            clearInterval(this.gateTimer);
            this.gateTimer = null;
        }

        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.isOnGenerator = false;
        console.log("🛑 신호 발생기 출력 OFF");
    }

    /**
     * 1. 캐리어 주파수 동기화 및 갱신 제어 (L, R 주파수 연동 처리)
     */
    updateCarrier() {
        if (!this.isInitialized) return;

        const leftHz = this.params.CarrierFreq_Left;
        // R Freq = L Freq + Diff 공식 적용
        const rightHz = leftHz + this.params.CarrierFreq_LRDiff;

        // 하드웨어 신호 발생기 노브를 돌리듯 즉각 적용
        this.oscLeft.frequency.setValueAtTime(Math.max(10, Math.min(10000, leftHz)), this.ctx.currentTime);
        this.oscRight.frequency.setValueAtTime(Math.max(10, Math.min(10000, rightHz)), this.ctx.currentTime);
    }

    /**
     * 2. 전자회로 게이트 레벨의 단속 기능 및 듀티비 제어
     */
    updateGate() {
            if (!this.isInitialized) return;

        const now = this.ctx.currentTime;

        // [보정 1] 자바스크립트 타이머 무조건 청소
        if (this.gateTimer) {
            clearInterval(this.gateTimer);
            this.gateTimer = null;
        }

        // 💡 [잡음 제거 핵심 A] cancelScheduledValues 대신 cancelAndHoldAtTime을 사용하여 
        // 현재 스피커로 출력 중인 소리 신호의 파형 위치를 그 자리에 안전하게 고정(Hold)시킵니다.
        // 이 함수를 지원하지 않는 일부 구형 브라우저를 위해 예외 처리를 포함합니다.
        if (this.gateGain.gain.cancelAndHoldAtTime) {
            this.gateGain.gain.cancelAndHoldAtTime(now);
        } else {
            this.gateGain.gain.cancelScheduledValues(now);
        }

        // [경우 A] 게이트 비활성화(Enable 체크 해제) 상태:
        if (!this.params.GateEnable) {
            // 💡 [잡음 제거 핵심 B] 0.005초(5ms)의 미세한 경사를 주어 상시 개방(1.0)으로 부드럽게 안착시킵니다.
            // 응답 지연은 0.005초뿐이라 인간의 귀로는 즉시 켜지는 것으로 인지하며 지지직 소리만 제거됩니다.
            this.gateGain.gain.linearRampToValueAtTime(1.0, now + 0.005);
            console.log("🔓 게이트 회로 비활성화 -> 잡음 없이 연속음 전환");
            return;
        }

        // [경우 B] 게이트 활성화 상태: 발전기 출력이 꺼져 있다면 예약을 대기합니다.
        if (!this.isOnGenerator) return;

        const freq = this.params.GateFreq;       
        const duty = this.params.GateDuty / 100; 
        const cycleDuration = 1 / freq;         
        const onDuration = cycleDuration * duty; 

        const scheduleAheadTime = 0.4; 
        
        // 💡 [잡음 제거 핵심 C] 슬라이더 조작으로 파형이 겹치는 것을 막기 위해 
        // 첫 번째 새 펄스의 예약 시작점을 현재 시점보다 최소 0.01초(10ms) 이후의 미래로 정렬합니다.
        let nextStartTime = now + 0.01; 

        const runScheduler = () => {
            const currentTime = this.ctx.currentTime;
            const endTime = currentTime + scheduleAheadTime;

            while (nextStartTime < endTime) {
                if (nextStartTime >= currentTime) {
                    // 사각파의 수직 상승/하강 경계면에도 0.002초(2ms)의 초미세 평활화를 적용하여
                    // 슬라이더 조작 중이 아닐 때도 게이트가 전환될 때 발생하는 미세한 틱 잡음을 예방합니다.
                    this.gateGain.gain.setValueAtTime(1.0, nextStartTime);
                    this.gateGain.gain.setValueAtTime(0.0, nextStartTime + onDuration);
                }
                nextStartTime += cycleDuration;
            }
        };

        // 첫 펄스 즉시 예약 수행
        runScheduler();
        // 150ms 마다 지속 공급
        this.gateTimer = setInterval(runScheduler, 150);
        console.log("🔒 게이트 회로 활성화 -> 잡음 없이 단속 펄스 가동");
    }

    /**
     * 3. 이펙트 좌우 음량 밸런스 제어 (-100% ~ +100%)
     */
    updateBalance() {
        if (!this.isInitialized) return;

        const bal = this.params.VolBal_LR; // -100 ~ 100
        const now = this.ctx.currentTime;

        if (bal === 0) {
            // 0 이면 양쪽 볼륨 100% 동일
            this.gainLeft.gain.setValueAtTime(1.0, now);
            this.gainRight.gain.setValueAtTime(1.0, now);
        } else if (bal < 0) {
            // 왼쪽으로 치우침 -> 우측 소리 감쇄 (-100 일 때 우측 볼륨 0)
            this.gainLeft.gain.setValueAtTime(1.0, now);
            this.gainRight.gain.setValueAtTime((100 + bal) / 100, now);
        } else {
            // 오른쪽으로 치우침 -> 좌측 소리 감쇄 (+100 일 때 좌측 볼륨 0)
            this.gainLeft.gain.setValueAtTime((100 - bal) / 100, now);
            this.gainRight.gain.setValueAtTime(1.0, now);
        }
    }


    /**
     * 💡 [추가] 특정 3D 오브젝트에 소리를 장착합니다.
     * @param {THREE.Object3D} targetMesh - 소리를 심을 Three.js 메쉬 객체
     */
    attachSoundTo(targetMesh) {
        if (!this.isInitialized || !this.positionalAudio) {
            console.warn("⚠️ 사운드 엔진이 초기화되지 않아 소리를 붙일 수 없습니다.");
            return;
        }

        // [안전 장치] 소리가 이미 어딘가에 붙어있다면, 먼저 안전하게 떼어냅니다.
        this.detachSound();

        // 새로운 타겟 오브젝트에 소리 객체를 자식으로 등록 (이 시점부터 공간 음향 좌표 연동)
        targetMesh.add(this.positionalAudio);
        this.currentTargetMesh = targetMesh; // 현재 어디 붙어있는지 기록

        console.log(`🔌 3D 오디오 신호선을 오브젝트(${targetMesh.name || '이름없음'})에 연결 완료`);
    }

    /**
     * 💡 [추가] 현재 소리가 붙어있는 오브젝트로부터 소리 신호선을 안전하게 분리합니다.
     */
    detachSound() {
        if (this.currentTargetMesh && this.positionalAudio) {
            // 기존 부모 오브젝트에서 소리 객체를 제거
            this.currentTargetMesh.remove(this.positionalAudio);
            
            console.log(`🚏 오브젝트(${this.currentTargetMesh.name || '이름없음'})로부터 오디오 신호선 분리 완료`);
            this.currentTargetMesh = null;
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
