import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export class InputManager {
  constructor(camera, domElement) {
    this.controls = new PointerLockControls(camera, domElement);
    this.keys = new Set();

    this._onKeyDown = (e) => this.keys.add(e.code);
    this._onKeyUp = (e) => this.keys.delete(e.code);

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  get isLocked() {
    return this.controls.isLocked;
  }

  // lock() {
  //   this.controls.lock()
  // }

  // unlock() {
  //   this.controls.unlock()
  // }

  isPressed(code) {
    return this.keys.has(code);
  }

  getMovement() {
    return {
      forward: this.isPressed('KeyW') || this.isPressed('ArrowUp'),
      back:    this.isPressed('KeyS') || this.isPressed('ArrowDown'),
      left:    this.isPressed('KeyA') || this.isPressed('ArrowLeft'),
      right:   this.isPressed('KeyD') || this.isPressed('ArrowRight'),
      jump:    this.isPressed('Space'),
      sprint:  this.isPressed('ShiftLeft'),
    };
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this.controls.dispose();
  }
}
