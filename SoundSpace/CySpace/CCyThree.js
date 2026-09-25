

import * as THREE from 'three';



export class CCyThree {
    constructor() {
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.crystalSphere = null; // 인스턴스 변수로 명시적 관리

        // 구슬 움직임에 사용할  하드웨어 타이머 클럭 생성 (성능 상관없이 절대적 초 단위 시간 측정용)
        this.clock = new THREE.Clock(); 
    }

    /**
     * 3D 공간 및 카메라, 조명, 수정구슬 초기 세팅
     * @param {string} containerId - HTML 캔버스 컨테이너 ID
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        // 1. Scene (공간 생성)
        this.scene = new THREE.Scene();
        // 깊이감을 주는 아주 어두운 청회색 배경
        this.scene.background = new THREE.Color(0x0a0c10); 

        // 2. Camera (카메라 설정 - 인간의 눈과 유사한 FOV 60도)
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Three.js의 PerspectiveCamera는 기본적으로 카메라 자체의 로컬 -Z 방향을 앞(시선 방향)으로 인식.
        // 인자 : 60 시야각. 
        // 3번인자 : Near Clip Plane 카메라 렌즈로부터 1cm(0.01m)보다 더 가까이 있는 물체는 화면에 보이지 않고 잘려 나갑니다(투명하게 통과됨).0은 불가. 
        // 4번인자 : Far Clip Plane.카메라로부터 100m보다 더 멀리 있는 물체는 아무리 거대해도 화면에 렌더링되지 않고 사라집니다.
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.0001, 20);
        // 카메라를 생성한 직후, lookAt을 호출하기 '전'에 설정해야 함. 
        this.camera.up.set(0, 0, 1); // Z축 양수(+)를 하늘(Up) 방향으로 설정
        
        // 물체를 한눈에 볼 수 있도록 Y축으로 0.5m(50cm) 뒤로 후퇴 배치
        this.camera.position.set(0, 0, 0);// 0,0,0 = 사람 눈이 좌표 중심

        // 카메라 컨트롤러(OrbitControls) 사용시 lookat 설정된 좌표를 중심으로 카메라가 회전함. 
        this.camera.lookAt(0, 1.1, 0);        // 시선 방향 (0,1,0 : Y축 +1m 방향을 향하게 함.)

        // 3. Renderer (고정밀 3D 렌더러 설정)
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        // 유리 재질의 고급스러운 물리 기반 렌더링(PBR) 매핑 활성화
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.container.appendChild(this.renderer.domElement);

        // 4. Lights (조명 조립 - 수정구슬의 반사광을 살리기 위한 다각도 조명)
        const ambientLight = new THREE.AmbientLight(0xffffff, 1); // 은은한 전체 조명
        this.scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 15); // 메인 비추는 빛
        dirLight1.position.set(1, 2, 1);
        this.scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x007fff, 10); // 푸른빛 포인트 보조 조명
        dirLight2.position.set(-1, -1, 1);
        this.scene.add(dirLight2);

        // 5. Crystal Sphere (지름 20cm 투명 수정구슬 생성)
        // Three.js의 단위는 1 = 1m 이므로 지름 20cm는 반지름 10cm(0.1)입니다.
        const geometry = new THREE.SphereGeometry(0.005, 32,32);//64, 64); // 세밀한 64분할 구체
        
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            roughness: 0.01,      // 아주 매끄러운 유리 표면
            metalness: 0.0,
            transmission: 0.96,   // 95% 투명도 (빛이 내부를 관통함)
            ior: 1.52,            // 수정/유리의 실제 물리적 굴절률(Index of Refraction)
            thickness: 0.08,      // 수정구슬 내부의 두께감 표현
            specularIntensity: 1.0,
            // 사운드 단속 타이밍에 맞춰 LED처럼 자체 발광할 속성 세팅
            emissive: new THREE.Color(0x00ffaa), // 신비로운 에메랄드 LED 색상
            emissiveIntensity: 1.0              // 초기 밝기는 OFF (0.0)
        });

        this.crystalSphere = new THREE.Mesh(geometry, material);
        this.crystalSphere.position.set(0,0.15,0);// 
        this.scene.add(this.crystalSphere);

        // 6. 브라우저 크기 변경 대응(Responsive) 이벤트 등록
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // 7. 애니메이션 프레임 구동 시작
        //this.isAnimating = true;
        //this.animate();

        // 7. 애니메이션 프레임 구동 시작 (화살표 함수 적용). WebXR 활용시 이거 이용해야함. 
        this.renderer.setAnimationLoop(() => {
            // 이제 여기서의 this는 클래스 자신(CCyThree 등)을 올바르게 가리킵니다.
            // 필요시 큐브나 수정구슬의 회전 연산 코드를 여기에 작성하세요.

            // 프로그램이 시작된 후 누적된 경과 시간(초 단위 소수점)을 가져옵니다.
            const elapsedTime = this.clock.getElapsedTime();

            // --- 💡 [선형 물리 연산 예시 영역] ---
            
            // [방식 A] 한쪽 방향으로만 끊임없이 무한 선형 이동시킬 때 (초당 0.1m 속도)
            // this.crystalSphere.position.x = elapsedTime * 0.1;

            // [방식 B] 사인(Math.sin) 함수를 활용하여 특정 축을 기준으로 일정 범위를 칼같이 선형 왕복 운동시킬 때
            // Math.sin은 시간이 흐름에 따라 -1 ~ 1 사이를 부드럽게 오고 갑니다.
            const targetHz = 0.05;    // 왕복 속도 계수
            const range = 0.1;    // 왕복 이동 반경 (0.3m = 30cm 폭)
            
            // X축 왕복 운동 연산 (기준점 x=0 에서 좌우로 왕복)
            //this.crystalSphere.position.x = Math.sin(elapsedTime * (Math.PI * 2 * targetHz)) * range;

            // 만약 Y축(앞뒤)으로도 같이 움직여서 대각선이나 파동 운동을 시키고 싶다면 아래처럼 조절 가능합니다.
            this.crystalSphere.position.y = Math.cos(elapsedTime * (Math.PI * 2 * targetHz)) * range;

            // -------------------------------------
            

            // 💡 [새로운 시각화 핵심] 외부에서 주입된 사운드 엔진이 있다면 실시간 게이트 레벨을 읽어옵니다.
            if (this.cySound) {
                const gateLevel = this.cySound.getRealtimeGateLevel(); // 0.0 또는 1.0 추출
                
                // 게이트가 열려 소리가 날 때는 밝기를 2.5레벨로 강하게 번쩍이고, 꺼지면 0.0(암전)으로 만듭니다.
                // 최대 밝기 값(예: 2.5)을 조절하여 번쩍임의 강도를 튜닝할 수 있습니다.
                this.crystalSphere.material.emissiveIntensity = gateLevel * 2.5; 
            } else {
                // 사운드가 연결 안 되었을 때는 기본 밝기 유지
                this.crystalSphere.material.emissiveIntensity = 1.0;
            }

            // scene과 camera 역시 클래스의 멤버 변수라면 this.scene, this.camera 형식이어야 합니다.
            this.renderer.render(this.scene, this.camera);
        });

        console.log("🔮 지름 20cm 수정구슬 3D 공간 구축 완료");
    }



    /**
     * 브라우저 창 크기가 바뀔 때 왜곡 없이 3D 캔버스를 맞춰주는 함수
     */
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * 자원 해제
     */
    destroy() {
        this.isAnimating = false;
        if (this.renderer) {
            this.container.removeChild(this.renderer.domElement);
            this.renderer.dispose();
        }
    }
}