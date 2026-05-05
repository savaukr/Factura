import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { InputManager } from './InputManager.js';
import { TrainController } from './TrainController.js';
import { PassengerSystem } from './PassengerSystem.js';
import { UIManager } from './UIManager.js';
import { CAMERA_OFFSET, MAX_WAGONS, PASSENGERS_PER_WAGON } from './constant.js';

export class Game {
  constructor() {
    this.sceneManager = new SceneManager();
    this.input = null;
    this.trainController = null;
    this.passengerSystem = null;
    this.uiManager = null;
    this.clock = new THREE.Clock();
    this._fpsFrames = 0;
    this._fpsElapsed = 0;
  }

  start() {
    const container = document.getElementById('app');
    this.uiManager = new UIManager();

    this.sceneManager.init(container, (namedMeshes, charMeshes) => {
      this.trainController = new TrainController(
        this.sceneManager.scene, namedMeshes, this.sceneManager.mainTex
      );
      this.passengerSystem = new PassengerSystem(
        this.sceneManager.scene, charMeshes, this.sceneManager.mainTex
      );
      const updateWagonBtn = () => {
        const n = this.trainController.wagonCount;
        const passengers = this.passengerSystem.trainPassengerCount;
        this.uiManager.setWagonCount(n, MAX_WAGONS, passengers);
      };
      updateWagonBtn();
      this.uiManager.onAddWagon(() => {
        const n = this.trainController.wagonCount;
        const passengers = this.passengerSystem.trainPassengerCount;
        if (passengers < n * PASSENGERS_PER_WAGON) return;
        if (this.trainController.addWagon()) {
          updateWagonBtn();
        }
      });
    });

    // Canvas is available synchronously after sceneManager.init()
    this.input = new InputManager(this.sceneManager.renderer.domElement);
    this._animate();
  }

  _update(delta) {
    if (!this.trainController) return;

    const isMoving = this.input.isMoving;
    this.trainController.update(delta, isMoving);

    const headPos = this.trainController.getHeadPosition();
    const atStation = this.trainController.isAtStation();

    const trainCapacity = this.trainController.wagonCount * PASSENGERS_PER_WAGON;
    this.passengerSystem.update(delta, isMoving, headPos, atStation, trainCapacity);
    const trainPassengers = this.passengerSystem.trainPassengerCount;
    const totalPassengers = trainPassengers + this.passengerSystem.passengers.length;
    this.uiManager.setPassengerCount(trainPassengers, totalPassengers);
    this.uiManager.setWagonCount(this.trainController.wagonCount, MAX_WAGONS, trainPassengers);

    // Third-person follow camera: translate with train, fixed world-space offset
    this.sceneManager.camera.position.copy(headPos).add(CAMERA_OFFSET);
    this.sceneManager.camera.lookAt(headPos.x, headPos.y + 1.5, headPos.z);
  }

  _updateFPS(delta) {
    this._fpsFrames++;
    this._fpsElapsed += delta;
    if (this._fpsElapsed >= 0.5) {
      this.uiManager?.setFPS(Math.round(this._fpsFrames / this._fpsElapsed));
      this._fpsFrames = 0;
      this._fpsElapsed = 0;
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this._update(delta);
    this._updateFPS(delta);
    this.sceneManager.render();
  }
}
