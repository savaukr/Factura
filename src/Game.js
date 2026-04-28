import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { InputManager } from './InputManager.js';

const MOVE_SPEED = 6;
const SPRINT_MULT = 2;

export class Game {
  constructor() {
    this.sceneManager = new SceneManager();
    this.input = null;
    this.clock = new THREE.Clock();
    this.fpsCounter = { frames: 0, elapsed: 0, display: document.getElementById('hud-fps') };
    this.entities = [];
  }

  start() {
    const container = document.getElementById('app');
    this.sceneManager.init(container);
    this.input = new InputManager(this.sceneManager.camera, document.body);
    this._animate();
  }

  addEntity(entity) {
    this.entities.push(entity);
    entity.addToScene(this.sceneManager.scene);
  }

  update(delta) {
    if (!this.input.isLocked) return;

    const move = this.input.getMovement();
    const speed = (move.sprint ? MOVE_SPEED * SPRINT_MULT : MOVE_SPEED) * delta;

    const controls = this.input.controls;
    if (move.forward) controls.moveForward(speed);
    if (move.back)    controls.moveForward(-speed);
    if (move.right)   controls.moveRight(speed);
    if (move.left)    controls.moveRight(-speed);

    for (const entity of this.entities) {
      if (entity.isAlive) entity.update(delta);
    }
  }

  _updateFPS(delta) {
    this.fpsCounter.frames++;
    this.fpsCounter.elapsed += delta;
    if (this.fpsCounter.elapsed >= 0.5) {
      const fps = Math.round(this.fpsCounter.frames / this.fpsCounter.elapsed);
      this.fpsCounter.display.textContent = `FPS: ${fps}`;
      this.fpsCounter.frames = 0;
      this.fpsCounter.elapsed = 0;
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.update(delta);
    this._updateFPS(delta);
    this.sceneManager.render();
  }
}
