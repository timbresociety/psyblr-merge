export class GameClock {
  private lastTime: number = performance.now();
  public elapsedSeconds: number = 0;
  public frameCount: number = 0;

  getDelta(): number {
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Cap delta at 100ms to prevent huge physics jumps on tab suspension
    const dt = Math.min(0.1, Math.max(0.0001, rawDt));
    this.elapsedSeconds += dt;
    this.frameCount++;
    return dt;
  }

  reset(): void {
    this.lastTime = performance.now();
    this.elapsedSeconds = 0;
    this.frameCount = 0;
  }
}
