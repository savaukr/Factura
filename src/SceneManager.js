import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

import modelUrl from '../assets/models.fbx';
import grassTexUrl from '../assets/Grass.png';
import mainTexUrl from '../assets/Main_texture.png';
import { CAMERA_OFFSET, STATION_WORLD, TRACK_RADIUS } from './constant.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.mainTex = null;
  }

  init(container, onLoaded) {
    this._initRenderer(container);
    this._initCamera();
    this._initLights();

    const texLoader = new THREE.TextureLoader();
    const grassTex = texLoader.load(grassTexUrl);
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(40, 40);
    this.mainTex = texLoader.load(mainTexUrl);

    this._initGround(grassTex);
    this._initTrack();
    this._loadModel(onLoaded);

    window.addEventListener('resize', () => this._onResize());
  }

  _initRenderer(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 400);
    this.camera.position.copy(STATION_WORLD).add(CAMERA_OFFSET);
    this.camera.lookAt(STATION_WORLD.x, 1.5, STATION_WORLD.z);
  }

  _initLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    this.scene.add(sun);

    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 60, 300);
  }

  _initGround(grassTex) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshLambertMaterial({ map: grassTex })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  _initTrack() {
    // Gravel track bed (flat ring)
    const bedMat = new THREE.MeshLambertMaterial({ map: this.mainTex, side: THREE.DoubleSide });
    const bed = new THREE.Mesh(new THREE.RingGeometry(TRACK_RADIUS - 1.2, TRACK_RADIUS + 1.2, 80), bedMat);
    bed.rotation.x = -Math.PI / 2;
    bed.position.y = 0.01;
    this.scene.add(bed);

    // Two metal rails
    const railMat = new THREE.MeshLambertMaterial({ map: this.mainTex });
    for (const offset of [-0.4, 0.4]) {
      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(TRACK_RADIUS + offset, 0.06, 6, 80),
        railMat
      );
      rail.rotation.x = -Math.PI / 2;
      rail.position.y = 0.09;
      rail.castShadow = true;
      this.scene.add(rail);
    }

    // Railway ties (wooden sleepers)
    const tieMat = new THREE.MeshLambertMaterial({ color: 0x5c3d1e });
    const tieGeom = new THREE.BoxGeometry(2.4, 0.1, 0.4);
    const tieCount = 40;
    for (let i = 0; i < tieCount; i++) {
      const angle = (i / tieCount) * Math.PI * 2;
      const tie = new THREE.Mesh(tieGeom, tieMat);
      tie.position.set(
        Math.cos(angle) * TRACK_RADIUS,
        0.05,
        Math.sin(angle) * TRACK_RADIUS
      );
      tie.rotation.y = angle + Math.PI / 2;
      tie.castShadow = true;
      tie.receiveShadow = true;
      this.scene.add(tie);
    }
  }

  _loadModel(onLoaded) {
    const loader = new FBXLoader();
    loader.load(modelUrl, (fbx) => {
      const namedMeshes = {};
      const charMeshes = [];

      fbx.traverse(child => {
        const n = child.name;
        if (!n) return;
        if ((n === 'Locomotive_EU' || n === 'Carriage_EU') && !namedMeshes[n]) {
          namedMeshes[n] = child;
        }
        if (n.startsWith('G_Character_') && !charMeshes.find(c => c.name === n)) {
          charMeshes.push(child);
        }
      });

      if (onLoaded) onLoaded(namedMeshes, charMeshes);
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
