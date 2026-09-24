

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
     * 사운드(비프음 등) 설정을 제어하는 폴더 추가 함수
     * @param {Object} targetParams - 사운드 설정 데이터 객체
     */
    initSoundFolder(targetParams) {
        const folder = this.pane.addFolder({ title: '🔊 Sound' });

        folder.addBinding(targetParams, 'frequency', { min: 200, max: 2000, step: 10, label: '주파수(Hz)' });
        folder.addBinding(targetParams, 'duration', { min: 50, max: 1000, step: 50, label: '길이(ms)' });
    }
}