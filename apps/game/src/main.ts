import { GameApp } from './app/GameApp';

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Could not find #game-canvas element to boot PSYBLR V2');
  }

  const gameApp = new GameApp(canvas);

  // Expose on window for runtime inspection and automated testing
  (window as unknown as { __PSYBLR_GAME_APP__: GameApp }).__PSYBLR_GAME_APP__ = gameApp;

  console.info('[PSYBLR V2] Game runtime initialized successfully.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
