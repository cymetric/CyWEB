

import * as THREE from 'three';



export class CCyThree {
    constructor() {
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;

    }

    /**
     * 3D 공간 및 카메라, 조명, 수정구슬 초기 세팅
     * @param {string} containerId - HTML 캔버스 컨테이너 ID
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        // 1. Scene (우주 공간 생성)
        this.scene = new THREE.Scene();
        // 깊이감을 주는 아주 어두운 청회색 배경
        this.scene.background = new THREE.Color(0x0a0c10); 

        // 2. Camera (카메라 설정 - 인간의 눈과 유사한 FOV 60도)
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 100);
        // 물체를 한눈에 볼 수 있도록 z축으로 0.5m(50cm) 뒤로 후퇴 배치
        this.camera.position.set(0, 0, 0.5);

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
        const geometry = new THREE.SphereGeometry(0.1, 32,32);//64, 64); // 세밀한 64분할 구체
        
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
        this.scene.add(this.crystalSphere);

        // 6. 브라우저 크기 변경 대응(Responsive) 이벤트 등록
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // 7. 애니메이션 프레임 구동 시작
        //this.isAnimating = true;
        //this.animate();

        // 7. 애니메이션 프레임 구동 시작 (화살표 함수 적용)
        this.renderer.setAnimationLoop(() => {
            // 이제 여기서의 this는 클래스 자신(CCyThree 등)을 올바르게 가리킵니다.
            // 필요시 큐브나 수정구슬의 회전 연산 코드를 여기에 작성하세요.
            
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