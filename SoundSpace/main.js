/*
2026.09.23

*/

import { CCyTweakpane } from './CyUI/CCyTweakpane.js';

import { CCyThree } from './CySpace/CCyThree.js'; // 3D 시각화 모듈 임포트

import { VRButton } from 'three/addons/webxr/VRButton.js';

import { CCySoundThree } from './CySound/CCySoundThree.js';

const cyPane = new CCyTweakpane(); // Tweakpane 생성

const cyThree = new CCyThree();

const cySound = new CCySoundThree();


// 1. UI와 연동할 원본 데이터 정의
const appSettings = {
    radius: 0.2,          // 지름 20cm (반지름 0.2m)
    rotationSpeed: 0.01,
    frequency: 800,
    duration: 300
};

cyPane.initSoundFolder(appSettings);

// 페이지가 로드되자마자 3D 공간을 먼저 화면 전체에 띄워준다. (설치 zero 심리스)
cyThree.init('canvas-container');

// 1. 카메라에 '귀(AudioListener)'를 달아줍니다.
//cyThree.camera.add(cySound.listener);

// 2. 가상의 오디오 버퍼가 로드되었다고 가정하고 3D 사운드 소스 생성
// (실제 프로젝트에서는 오디오 로더를 통해 파일이나 버퍼를 받아와야 합니다)
//const crystalBallSound = cySound.create3DSoundSource(someAudioBuffer);// someAudioBuffer 아직 미정의. 

// 3. 생성된 소리를 CySpace 내의 특정 3D 객체(수정구슬 메쉬 등)에 부착합니다.
// 이제 수정구슬의 위치가 바뀌거나 카메라가 멀어지면 소리의 크기와 방향이 자동으로 연동됩니다.
//cyThree.crystalBallMesh.add(crystalBallSound);

document.body.appendChild(VRButton.createButton(cyThree.renderer));// 화면에 VR 진입 버튼 생성 및 추가

// 하단 시스템 시작/정지 버튼 이벤트
const connectBtn = document.getElementById('connect-btn');

connectBtn.addEventListener('click', async () => { // async 키워드 추가
    console.log("버튼 작동 체크: 클릭됨");
    
    if (cySound.isOnGenerator) 
    {
        cySound.stopGenerator();

        connectBtn.innerText = "Stop";
        connectBtn.style.backgroundColor = "#ff4444";
    } 
    else 
    {
        cySound.startGenerator();

        connectBtn.innerText = "Start";
        connectBtn.style.backgroundColor = "#007fff";
    }
        
});

