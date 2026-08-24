import { EASING, type EasingFunction } from './PresentationTokens';

export type TweenOptions = {
  id?: string | undefined;
  from: number;
  to: number;
  duration: number; // in seconds
  easing?: EasingFunction | undefined;
  delay?: number | undefined; // in seconds
  onUpdate: (value: number, progress: number) => void;
  onComplete?: (() => void) | undefined;
};

type ActiveTween = {
  id?: string | undefined;
  from: number;
  to: number;
  duration: number;
  easing: EasingFunction;
  delay: number;
  elapsed: number;
  onUpdate: (value: number, progress: number) => void;
  onComplete?: (() => void) | undefined;
};

export class MotionDirector {
  private activeTweens: ActiveTween[] = [];

  tween(options: TweenOptions): () => void {
    if (options.id !== undefined) {
      this.cancel(options.id);
    }

    const tweenItem: ActiveTween = {
      id: options.id,
      from: options.from,
      to: options.to,
      duration: Math.max(0.001, options.duration),
      easing: options.easing ?? EASING.SNAP,
      delay: options.delay ?? 0,
      elapsed: 0,
      onUpdate: options.onUpdate,
      onComplete: options.onComplete,
    };

    this.activeTweens.push(tweenItem);

    // Initial update if no delay
    if (tweenItem.delay <= 0) {
      tweenItem.onUpdate(tweenItem.from, 0);
    }

    return () => this.removeTween(tweenItem);
  }

  cancel(id: string): void {
    this.activeTweens = this.activeTweens.filter((t) => t.id !== id);
  }

  cancelAll(): void {
    this.activeTweens.length = 0;
  }

  private removeTween(tween: ActiveTween): void {
    const index = this.activeTweens.indexOf(tween);
    if (index !== -1) {
      this.activeTweens.splice(index, 1);
    }
  }

  update(dt: number): void {
    if (this.activeTweens.length === 0) return;

    // Iterate backwards so we can safely remove completed items
    for (let i = this.activeTweens.length - 1; i >= 0; i--) {
      const item = this.activeTweens[i];
      if (!item) continue;

      if (item.delay > 0) {
        item.delay -= dt;
        if (item.delay > 0) continue;
        // Delay finished, start from 0
        item.elapsed = Math.abs(item.delay);
      } else {
        item.elapsed += dt;
      }

      const linearProgress = Math.min(1, item.elapsed / item.duration);
      const easedProgress = item.easing(linearProgress);
      const currentValue = item.from + (item.to - item.from) * easedProgress;

      item.onUpdate(currentValue, linearProgress);

      if (linearProgress >= 1) {
        this.activeTweens.splice(i, 1);
        if (item.onComplete) {
          try {
            item.onComplete();
          } catch (err) {
            console.error('[MotionDirector] Error in onComplete callback:', err);
          }
        }
      }
    }
  }
}
