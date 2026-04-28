import * as THREE from 'three';

export class Entity {
  constructor() {
    this.mesh = null;
    this.velocity = new THREE.Vector3();
    this.isAlive = true;
  }

  get position() {
    return this.mesh?.position ?? new THREE.Vector3();
  }

  addToScene(scene) {
    if (this.mesh) scene.add(this.mesh);
  }

  removeFromScene(scene) {
    if (this.mesh) scene.remove(this.mesh);
  }

  update(_delta) {}

  destroy(scene) {
    this.isAlive = false;
    this.removeFromScene(scene);
  }
}
