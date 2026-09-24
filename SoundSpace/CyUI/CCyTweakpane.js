

// 1. Tweakpane 모듈 가져오기 . CDN 연결방식
import { Pane } from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js';


export class CCyTweakpane {
    constructor(containerId = null) {
        // UI를 특정 div에 넣거나, 지정 안 하면 화면 오른쪽 상단에 고정
        const options = containerId ? { container: document.getElementById(containerId) } : {};
        this.pane = new Pane(options);
    }

    /**
     * 3D 수정구슬 설정을 제어하는 폴더 추가 함수
     * @param {Object} targetParams - 조정할 데이터 객체 (참조 주소)
     * @param {Function} onChangeCallback - 값이 바뀔 때마다 실행할 콜백 함수
     */
    initSpaceFolder(targetParams, onChangeCallback) {
        const folder = this.pane.addFolder({ title: '🔮 수정구슬 설정' });

        // 반지름 조절 스라이더 추가
        folder.addBinding(targetParams, 'radius', { min: 0.1, max: 1.0, step: 0.01 })
              .on('change', (ev) => { if (onChangeCallback) onChangeCallback('radius', ev.value); });

        // 회전 속도 조절
        folder.addBinding(targetParams, 'rotationSpeed', { min: 0, max: 0.05 })
              .on('change', (ev) => { if (onChangeCallback) onChangeCallback('rotationSpeed', ev.value); });
    }

    /**
     * 사운드 설정을 제어하고 음원에 실시간 반영하는 폴더 추가 함수
     * @param {Object} ParamsSound - 사운드 설정 데이터 객체 (main의 변수 참조)
     * @param {Object} cySound - 사운드를 제어하는 CCySound 클래스의 인스턴스
     */
    initSoundFolder(ParamsSound, cySound) {

        const folder_sound = this.pane.addFolder({ title: '🔊 Sound' });

        // 캐리어 주파수 L, R 설정. 
        const folder_carrier = folder_sound.addFolder({ title: 'Carrier' });

        folder_carrier.addBinding(ParamsSound, 'CarrierFreq_Left', { min: 10, max: 10000, step: 0.1, label: 'L(Hz)' })
            .on('change', () => {
                // 왼쪽 주파수가 바뀌면 캐리어 회로 즉시 갱신
                cySound.updateCarrier();
            });

        folder_carrier.addBinding(ParamsSound, 'CarrierFreq_LRDiff', { min: -100, max: 100, step: 0.1, label: 'Diff(Hz)' })
            .on('change', () => {
                // 주파수 차이(Diff)가 바뀌면 캐리어 회로 즉시 갱신
                cySound.updateCarrier();
            });

       
        // 게이트 설정 . 
        const folder_gate = folder_sound.addFolder({ title: 'Gate' });
        folder_gate.addBinding(ParamsSound, 'GateEnable', { label: 'Enable' })
            .on('change', () => {
                // 게이트 작동 여부가 토글되면 게이트 회로 재설정
                cySound.updateGate();
            });

        folder_gate.addBinding(ParamsSound, 'GateFreq', { min: 0.2, max: 100, step: 0.1, label: 'Freq(Hz)' })
            .on('change', () => {
                // 단속 주파수가 바뀌면 게이트 스케줄러 재설정
                cySound.updateGate();
            });

        folder_gate.addBinding(ParamsSound, 'GateDuty', { min: 10, max: 90, step: 1, label: 'Duty(%)' })
            .on('change', () => {
                // 듀티비(ON 비율)가 바뀌면 게이트 스케줄러 재설정
                cySound.updateGate();
            });

        // Effect 설정. 
        const folder_effect = folder_sound.addFolder({ title: 'Effect' });
         folder_effect.addBinding(ParamsSound, 'CarrierBal_LR', { min: -100, max: 100, step: 1, label: 'Bal LR(%)' })
            .on('change', () => {
                // 좌우 볼륨 밸런스가 바뀌면 이펙트 회로 즉시 갱신
                cySound.updateBalance();
            });
    }
}