import * as THREE from 'three';
import { TRACK_RADIUS, PASSENGER_SPAWN_INTERVAL, MAX_PLATFORM_PASSENGERS } from './constant.js';

const PLATFORM_CENTER_X = TRACK_RADIUS + 3.2;
const PLATFORM_HALF_X = 2;
const PLATFORM_HALF_Z = 3.5;
const PLATFORM_TOP_Y = 0.3;
const BOARD_SPEED = 5;
const BOARD_THRESHOLD = 0.5;

export class PassengerSystem {
  constructor(scene, charMeshes, mainTex) {
    this._scene = scene;
    this._charMeshes = charMeshes;
    this._mainTex = mainTex;
    this.passengers = [];       // { mesh, boarding, target }
    this.trainPassengerCount = 0;
    this.spawnTimer = 0;
    this._initPlatform();
  }

  _initPlatform() {
    const mat = new THREE.MeshLambertMaterial({ map: this._mainTex });

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(PLATFORM_HALF_X * 2, 0.3, PLATFORM_HALF_Z * 2),
      mat
    );
    platform.position.set(PLATFORM_CENTER_X, 0.15, 0);
    platform.receiveShadow = true;
    platform.castShadow = true;
    this._scene.add(platform);

    // Roof posts
    const postMat = new THREE.MeshLambertMaterial({ color: 0x886644 });
    const postGeom = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6);
    for (const zOff of [-PLATFORM_HALF_Z + 0.3, PLATFORM_HALF_Z - 0.3]) {
      const post = new THREE.Mesh(postGeom, postMat);
      post.position.set(PLATFORM_CENTER_X, 1.25 + 0.3, zOff);
      post.castShadow = true;
      this._scene.add(post);
    }

    // Roof
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xcc8844, side: THREE.DoubleSide });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(PLATFORM_HALF_X * 2, 0.1, PLATFORM_HALF_Z * 2), roofMat);
    roof.position.set(PLATFORM_CENTER_X, 2.8, 0);
    this._scene.add(roof);
  }

  _spawnPassenger() {
    let src = null;
    if (this._charMeshes.length > 0) {
      src = this._charMeshes[Math.floor(Math.random() * this._charMeshes.length)];
    }

    let mesh;
    if (src) {
      mesh = src.clone(true);
      mesh.position.set(0, 0, 0);
      mesh.scale.setScalar(0.5);
      mesh.traverse(child => {
        if (!child.isMesh) return;
        child.material = new THREE.MeshLambertMaterial({ map: this._mainTex });
        child.castShadow = true;
      });
    } else {
      // Fallback capsule passenger
      const color = new THREE.Color().setHSL(Math.random(), 0.6, 0.5);
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 0.6, 4, 8),
        new THREE.MeshLambertMaterial({ color })
      );
      body.castShadow = true;
      body.position.y = 0.7;
      mesh = new THREE.Group();
      mesh.add(body);
    }

    const x = PLATFORM_CENTER_X - PLATFORM_HALF_X + Math.random() * PLATFORM_HALF_X * 2;
    const z = (Math.random() - 0.5) * PLATFORM_HALF_Z * 2;
    mesh.position.set(x, PLATFORM_TOP_Y, z);
    this._scene.add(mesh);
    this.passengers.push({ mesh, boarding: false, target: null });
  }

  update(delta, isMoving, trainHeadPos, isAtStation, trainCapacity) {
    // Spawn
    this.spawnTimer += delta;
    if (this.spawnTimer >= PASSENGER_SPAWN_INTERVAL && this.passengers.length < MAX_PLATFORM_PASSENGERS) {
      this.spawnTimer = 0;
      this._spawnPassenger();
    }

    // Trigger boarding only if train has capacity
    if (!isMoving && isAtStation && this.trainPassengerCount < trainCapacity) {
      const doorPos = new THREE.Vector3(
        trainHeadPos.x + (PLATFORM_CENTER_X - TRACK_RADIUS) * 0.3,
        PLATFORM_TOP_Y,
        trainHeadPos.z
      );
      for (const p of this.passengers) {
        if (!p.boarding) {
          p.boarding = true;
          p.target = doorPos.clone();
        }
      }
    }

    // Animate boarding
    const toRemove = [];
    for (const p of this.passengers) {
      if (!p.boarding) continue;
      if (this.trainPassengerCount >= trainCapacity) {
        p.boarding = false;
        continue;
      }
      const dir = new THREE.Vector3().subVectors(p.target, p.mesh.position);
      if (dir.length() < BOARD_THRESHOLD) {
        toRemove.push(p);
        this.trainPassengerCount++;
      } else {
        dir.normalize().multiplyScalar(BOARD_SPEED * delta);
        p.mesh.position.add(dir);
        p.mesh.lookAt(p.target.x, p.mesh.position.y, p.target.z);
      }
    }
    for (const p of toRemove) {
      this._scene.remove(p.mesh);
      this.passengers.splice(this.passengers.indexOf(p), 1);
    }
  }
}
