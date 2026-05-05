import { PASSENGERS_PER_WAGON } from './constant.js';

export class UIManager {
  constructor() {
    this._passEl = document.getElementById('hud-passengers');
    this._wagonBtn = document.getElementById('btn-add-wagon');
    this._fpsEl = document.getElementById('hud-fps');
    this._addWagonCb = null;
    this._wagonBtn.addEventListener('click', () => this._addWagonCb?.());
  }

  setPassengerCount(n) {
    this._passEl.textContent = `Passengers: ${n}`;
  }

  setWagonCount(n, max, trainPassengers) {
    const needed = n * PASSENGERS_PER_WAGON;
    const canAfford = trainPassengers >= needed;
    this._wagonBtn.disabled = n >= max || !canAfford;
    if (n >= max) {
      this._wagonBtn.textContent = `+ Add Wagon (${n}/${max})`;
    } else if (!canAfford) {
      this._wagonBtn.textContent = `+ Add Wagon (${trainPassengers}/${needed} passengers)`;
    } else {
      this._wagonBtn.textContent = `+ Add Wagon (${n}/${max})`;
    }
  }

  onAddWagon(cb) {
    this._addWagonCb = cb;
  }

  setFPS(fps) {
    this._fpsEl.textContent = `FPS: ${fps}`;
  }
}
