/*
2026.09.23

*/


import { CCyThree } from './CySpace/CCyThree.js'; // 3D 시각화 모듈 임포트

import { VRButton } from 'three/addons/webxr/VRButton.js';


const cyThree = new CCyThree();

// 페이지가 로드되자마자 3D 공간을 먼저 화면 전체에 띄워준다. (설치 zero 심리스)
cyThree.init('canvas-container');

document.body.appendChild(VRButton.createButton(cyThree.renderer));// 화면에 VR 진입 버튼 생성 및 추가

// 하단 시스템 시작/정지 버튼 이벤트
const connectBtn = document.getElementById('connect-btn');

connectBtn.addEventListener('click', async () => { // async 키워드 추가
    console.log("버튼 작동 체크: 클릭됨");
    
/*
    if (!soundEngine.isPlaying) 
    {

        connectBtn.innerText = "Stop";
        connectBtn.style.backgroundColor = "#ff4444";
    } 
    else 
    {


        connectBtn.innerText = "Start";
        connectBtn.style.backgroundColor = "#007fff";
    }
        */
});

