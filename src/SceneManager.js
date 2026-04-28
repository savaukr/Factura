import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

import modelUrl from '../assets/models.fbx';
import grassTexUrl from '../assets/Grass.png';
import mainTexUrl from '../assets/Main_texture.png';
import { CAMERA_OFFSET, STATION_WORLD } from './constant.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.model = null;
  }

  init(container) {
    this._initRenderer(container);
    this._initCamera();
    this._initLights();
    this._initGround();
    this._loadModel();
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
    // this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.2, 300);

    // Station world position (train starts here)
    this.camera.position.copy(STATION_WORLD).add(CAMERA_OFFSET);
    this.camera.lookAt(STATION_WORLD.x, 1.5, STATION_WORLD.z);
    // this.camera.position.set(10, 1.7, 0);
    // horizon at 1/4 from top: arctan(0.5 * tan(37.5°)) ≈ 21°
    // this.camera.rotation.x = -21 * Math.PI / 180;
  }

  _initLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    this.scene.add(sun);

    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 300);
  }

  _initGround() {
    const texLoader = new THREE.TextureLoader();
    const grassTex = texLoader.load(grassTexUrl);
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(40, 40);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshLambertMaterial({ map: grassTex })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  _loadModel() {
    const texLoader = new THREE.TextureLoader();
    const mainTex = texLoader.load(mainTexUrl);

    const loader = new FBXLoader();
    loader.load(modelUrl, (fbx) => {
      fbx.scale.setScalar(0.01);
      fbx.position.set(0, 0, -5);
      fbx.castShadow = true;

      fbx.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = new THREE.MeshLambertMaterial({ map: mainTex });
        }
      });

      this.scene.add(fbx);
      this.model = fbx;
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
