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

  setWagonCount(n, max) {
    this._wagonBtn.textContent = `+ Add Wagon (${n}/${max})`;
    this._wagonBtn.disabled = n >= max;
  }

  onAddWagon(cb) {
    this._addWagonCb = cb;
  }

  setFPS(fps) {
    this._fpsEl.textContent = `FPS: ${fps}`;
  }
}
