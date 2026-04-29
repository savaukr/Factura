import * as THREE from 'three';
import {
  TRACK_RADIUS, TRAIN_SPEED, WAGON_GAP, MAX_WAGONS, INITIAL_WAGONS,
  SWAY_SPEED, SWAY_AMP, WAGON_FACING_OFFSET, STATION_ANGLE, BOARDING_ZONE_ARC,
} from './constant.js';

export class TrainController {
  constructor(scene, namedMeshes, mainTex) {
    this._scene = scene;
    this._namedMeshes = namedMeshes;
    this._mainTex = mainTex;
    this.headAngle = STATION_ANGLE;
    this.wagons = [];
    this.wagonCount = 0;
    this.animTime = 0;
    this._buildWagons(INITIAL_WAGONS);
  }

  _applyTex(obj) {
    obj.traverse(child => {
      if (!child.isMesh) return;
      child.material = new THREE.MeshLambertMaterial({ map: this._mainTex });
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }

  _cloneModel(name) {
    const src = this._namedMeshes[name];
    if (src) {
      const clone = src.clone(true);
      clone.position.set(0, 0, 0);
      this._applyTex(clone);
      clone.scale.setScalar(0.5);
      return clone;
    }
    // Fallback geometry if model not found
    const colors = { Locomotive_EU: 0x2244cc, Carriage_EU: 0x226622 };
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.4, 3.5),
      new THREE.MeshLambertMaterial({ color: colors[name] ?? 0x888888 })
    );
    mesh.castShadow = true;
    mesh.position.y = 0.7;
    return mesh;
  }

  _buildWagons(count) {
    for (const { outer } of this.wagons) this._scene.remove(outer);
    this.wagons = [];

    for (let i = 0; i < count; i++) {
      const isCabin = i === 0 || i === count - 1;
      const outer = new THREE.Group();
      const inner = new THREE.Group();
      const model = this._cloneModel(isCabin ? 'Locomotive_EU' : 'Carriage_EU');
      inner.add(model);
      outer.add(inner);
      this._scene.add(outer);
      this.wagons.push({ outer, inner });
    }
    this.wagonCount = count;
  }

  addWagon() {
    if (this.wagonCount >= MAX_WAGONS) return false;
    this._buildWagons(this.wagonCount + 1);
    return true;
  }

  getHeadPosition() {
    return new THREE.Vector3(
      Math.cos(this.headAngle) * TRACK_RADIUS,
      0,
      Math.sin(this.headAngle) * TRACK_RADIUS,
    );
  }

  isAtStation() {
    const a = ((this.headAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const diff = Math.min(a, 2 * Math.PI - a);
    return diff < BOARDING_ZONE_ARC / 2;
  }
}
