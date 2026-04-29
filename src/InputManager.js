export class InputManager {
  constructor(canvas) {
    this.isMoving = false;

    this._onDown = () => { this.isMoving = true; };
    this._onUp = () => { this.isMoving = false; };

    canvas.addEventListener('pointerdown', this._onDown);
    document.addEventListener('pointerup', this._onUp);
    document.addEventListener('pointercancel', this._onUp);
  }

  destroy() {
    document.removeEventListener('pointerup', this._onUp);
    document.removeEventListener('pointercancel', this._onUp);
  }
}
