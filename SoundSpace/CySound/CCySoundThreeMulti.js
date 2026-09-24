
/*
2026.09.24
SoundSpace\CySound\CCySoundThree.js  는 this.oscLeft, this.gateGain 같은 오디오 부품들이 
클래스에 딱 하나씩만 선언되어 있다는 점입니다.

여러 소리 소스를 생성하려면 오디오 부품 세트(Oscillator, Gain, Panner, Gate 스케줄러 등) 전체를 하나의 독립된 주머니(Object)로 묶어서, 
오브젝트를 새로 만들 때마다 주머니를 하나씩 새로 분양해 주면 됩니다.

*/

import * as THREE from 'three';

export class CCySoundThreeMulti {
    constructor() {
        this.listener = new THREE.AudioListener();
        this.ctx = this.listener.context;

        // 💡 [핵심 변경] 단일 부품 대신, 여러 개의 소리 채널을 담을 사전(Map)을 준비합니다.
        this.channels = new Map(); 
    }

    /**
     * 💡 [새로운 핵심 기능] 독립된 주파수 회로를 가진 소리 채널(Voice)을 하나 개설합니다.
     * @param {string} channelId - 고유 이름 (예: "Ball1_Sound", "EnemyA_Sound")
     * @param {Object} defaultParams - 해당 소리의 초기 파라미터 (Left, Diff, Gate 설정 등)
     */
    createSoundChannel(channelId, defaultParams) {
        if (this.channels.has(channelId)) return;

        // 1. 이 채널만의 독립된 로레벨 오디오 부품들을 주머니(객체)로 생성
        const ch = {
            params: { ...defaultParams }, // 설정 값 복사
            oscLeft: this.ctx.createOscillator(),
            oscRight: this.ctx.createOscillator(),
            pannerLeft: this.ctx.createStereoPanner(),
            pannerRight: this.ctx.createStereoPanner(),
            gainLeft: this.ctx.createGain(),
            gainRight: this.ctx.createGain(),
            gateGain: this.ctx.createGain(),
            masterGain: this.ctx.createGain(),
            positionalAudio: new THREE.PositionalAudio(this.listener),
            gateTimer: null,
            isOn: false,
            currentTargetMesh: null
        };

        // 2. 부품 기본 세팅 및 배선 연결 (Signal Routing)
        ch.oscLeft.type = 'sine';
        ch.oscRight.type = 'sine';
        ch.pannerLeft.pan.setValueAtTime(-1, this.ctx.currentTime);
        ch.pannerRight.pan.setValueAtTime(1, this.ctx.currentTime);
        ch.masterGain.gain.setValueAtTime(0, this.ctx.currentTime); // 초기 차단

        ch.oscLeft.connect(ch.gainLeft);
        ch.gainLeft.connect(ch.pannerLeft);
        ch.pannerLeft.connect(ch.gateGain);

        ch.oscRight.connect(ch.gainRight);
        ch.gainRight.connect(ch.pannerRight);
        ch.pannerRight.connect(ch.gateGain);

        ch.gateGain.connect(ch.masterGain);
        ch.positionalAudio.setNodeSource(ch.masterGain);

        // 공간 음향 기본 스펙 적용
        ch.positionalAudio.setRefDistance(1);
        ch.positionalAudio.setMaxDistance(20);
        ch.positionalAudio.setDistanceModel('linear');

        // 발진 클럭 기동
        ch.oscLeft.start();
        ch.oscRight.start();

        // 3. 관리 사전에 이 채널 주머니를 저장
        this.channels.set(channelId, ch);

        // 초기 파라미터 회로 반영 적용
        this.updateCarrier(channelId);
        this.updateGate(channelId);
        this.updateBalance(channelId);
        
        console.log(`📡 [${channelId}] 독립 오디오 채널 생성 완료`);
    }

    /**
     * 특정 소리 채널을 켭니다.
     */
    startChannel(channelId) {
        const ch = this.channels.get(channelId);
        if (!ch) return;

        if (this.ctx.state === 'suspended') this.ctx.resume();

        ch.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        ch.isOn = true;
        this.updateGate(channelId);
    }

    /**
     * 특정 소리 채널을 끕니다.
     */
    stopChannel(channelId) {
        const ch = this.channels.get(channelId);
        if (!ch) return;

        if (ch.gateTimer) {
            clearInterval(ch.gateTimer);
            ch.gateTimer = null;
        }
        ch.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        ch.isOn = false;
    }

    /**
     * 특정 소리 채널을 3D 오브젝트에 영구히/개별적으로 장착합니다.
     */
    attachChannelTo(channelId, targetMesh) {
        const ch = this.channels.get(channelId);
        if (!ch) return;

        this.detachChannel(channelId);

        targetMesh.add(ch.positionalAudio);
        ch.currentTargetMesh = targetMesh;
        ch.positionalAudio.setVolume(1.0);
    }

    detachChannel(channelId) {
        const ch = this.channels.get(channelId);
        if (!ch || !ch.currentTargetMesh) return;

        ch.positionalAudio.setVolume(0.0);
        ch.currentTargetMesh.remove(ch.positionalAudio);
        ch.currentTargetMesh = null;
    }

    // --- 파라미터 제어 함수들도 channelId를 받아서 특정 채널만 조절하도록 변경 ---

    updateCarrier(channelId) {
        const ch = this.channels.get(channelId);
        if (!ch) return;
        const leftHz = ch.params.CarrierFreq_Left;
        const rightHz = leftHz + ch.params.CarrierFreq_LRDiff;
        ch.oscLeft.frequency.setValueAtTime(Math.max(10, Math.min(10000, leftHz)), this.ctx.currentTime);
        ch.oscRight.frequency.setValueAtTime(Math.max(10, Math.min(10000, rightHz)), this.ctx.currentTime);
    }

    updateGate(channelId) {
        const ch = this.channels.get(channelId);
        if (!ch) return;

        if (ch.gateTimer) { clearInterval(ch.gateTimer); ch.gateTimer = null; }
        if (!ch.params.GateEnable) { ch.gateGain.gain.setValueAtTime(1.0, this.ctx.currentTime); return; }
        if (!ch.isOn) return;

        const freq = ch.params.GateFreq;
        const duty = ch.params.GateDuty / 100;
        const cycleDuration = 1 / freq;
        const onDuration = cycleDuration * duty;
        const scheduleAheadTime = 0.4;
        let nextStartTime = this.ctx.currentTime + 0.05;

        const runScheduler = () => {
            const currentTime = this.ctx.currentTime;
            const endTime = currentTime + scheduleAheadTime;
            while (nextStartTime < endTime) {
                if (nextStartTime >= currentTime) {
                    ch.gateGain.gain.setValueAtTime(1.0, nextStartTime);
                    ch.gateGain.gain.setValueAtTime(0.0, nextStartTime + onDuration);
                }
                nextStartTime += cycleDuration;
            }
        };
        runScheduler();
        ch.gateTimer = setInterval(runScheduler, 150);
    }

    updateBalance(channelId) {
        const ch = this.channels.get(channelId);
        if (!ch) return;
        const bal = ch.params.CarrierBal_LR;
        const now = this.ctx.currentTime;
        if (bal === 0) {
            ch.gainLeft.gain.setValueAtTime(1.0, now); ch.gainRight.gain.setValueAtTime(1.0, now);
        } else if (bal < 0) {
            ch.gainLeft.gain.setValueAtTime(1.0, now); ch.gainRight.gain.setValueAtTime((100 + bal) / 100, now);
        } else {
            ch.gainLeft.gain.setValueAtTime((100 - bal) / 100, now); ch.gainRight.gain.setValueAtTime(1.0, now);
        }
    }
}
