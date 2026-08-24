import {
  Application,
  ElementInput,
  FILLMODE_FILL_WINDOW,
  Keyboard,
  Layer,
  LAYERID_DEPTH,
  LAYERID_IMMEDIATE,
  LAYERID_SKYBOX,
  LAYERID_UI,
  LAYERID_WORLD,
  Mouse,
  RESOLUTION_AUTO,
  TouchDevice,
} from 'playcanvas';
import { GameClock } from './GameClock';
import { CameraDirector } from './CameraDirector';
import { InputManager } from './InputManager';
import { SceneManager } from './SceneManager';
import { PresentationEventEmitter } from '../presentation/PresentationEvents';
import { MotionDirector } from '../presentation/MotionDirector';
import { AudioDirector } from '../presentation/AudioDirector';
import { VFXDirector } from '../presentation/VFXDirector';
import { CampDropTargetResolver } from '../interaction/CampDropTargetResolver';
import { InteractionFeedback } from '../interaction/InteractionFeedback';
import { DragController } from '../interaction/DragController';
import { HUDRoot } from '../ui/HUDRoot';
import { SummonInspector } from '../ui/SummonInspector';
import { DebugOverlay } from '../debug/DebugOverlay';
import { campCellToWorld } from '../world/CampCoordinateMapper';

export class GameApp {
  public app: Application;
  public clock: GameClock;
  public events: PresentationEventEmitter;
  public motion: MotionDirector;
  public audio: AudioDirector;
  public vfx: VFXDirector;
  public cameraDirector: CameraDirector;
  public resolver: CampDropTargetResolver;
  public feedback: InteractionFeedback;
  public dragController: DragController;
  public sceneManager: SceneManager;
  public inputManager: InputManager;
  public hud: HUDRoot;
  public inspector: SummonInspector;
  public debug: DebugOverlay;

  // Custom Layer references
  public layerWorld: Layer;
  public layerWorldFx: Layer;
  public layerWorldUi: Layer;
  public layerHud: Layer;
  public layerHudFx: Layer;
  public layerTransition: Layer;
  public layerDebug: Layer;

  constructor(canvas: HTMLCanvasElement) {
    this.clock = new GameClock();

    // 1. Initialize PlayCanvas Engine Application directly
    this.app = new Application(canvas, {
      mouse: new Mouse(canvas),
      touch: new TouchDevice(canvas),
      elementInput: new ElementInput(canvas),
      keyboard: new Keyboard(window),
    });

    this.app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    this.app.setCanvasResolution(RESOLUTION_AUTO);

    // 2. Setup Explicit Render Layer Architecture
    const layers = this.app.scene.layers;
    this.layerWorld = layers.getLayerById(LAYERID_WORLD)!;

    this.layerWorldFx = new Layer({ name: 'WORLD_FX', id: 1001 });
    this.layerWorldUi = new Layer({ name: 'WORLD_UI', id: 1002 });
    this.layerHud = new Layer({ name: 'HUD', id: 1003 });
    this.layerHudFx = new Layer({ name: 'HUD_FX', id: 1004 });
    this.layerTransition = new Layer({ name: 'TRANSITION', id: 1005 });
    this.layerDebug = new Layer({ name: 'DEBUG', id: 1006 });

    // Push custom layers into composition
    layers.push(this.layerWorldFx);
    layers.push(this.layerWorldUi);
    layers.push(this.layerHud);
    layers.push(this.layerHudFx);
    layers.push(this.layerTransition);
    layers.push(this.layerDebug);

    const allCameraLayers = [
      this.layerWorld,
      layers.getLayerById(LAYERID_DEPTH)!,
      layers.getLayerById(LAYERID_SKYBOX)!,
      this.layerWorldFx,
      this.layerWorldUi,
      layers.getLayerById(LAYERID_UI)!,
      this.layerHud,
      this.layerHudFx,
      this.layerTransition,
      this.layerDebug,
      layers.getLayerById(LAYERID_IMMEDIATE)!,
    ].filter(Boolean);

    // 3. Initialize Presentation & Motion Subsystems
    this.events = new PresentationEventEmitter();
    this.motion = new MotionDirector();
    this.audio = new AudioDirector(this.events);
    this.vfx = new VFXDirector(this.app, this.motion, this.events, this.layerWorldFx);

    // 4. Initialize Camera & World
    this.cameraDirector = new CameraDirector(this.app, this.motion, allCameraLayers);

    // 5. Initialize Interaction
    this.resolver = new CampDropTargetResolver();
    this.feedback = new InteractionFeedback(this.app, this.motion, this.layerWorldUi);
    this.dragController = new DragController(
      this.resolver,
      this.feedback,
      this.events,
      this.cameraDirector
    );

    // 6. Initialize Scene & Summons
    this.sceneManager = new SceneManager(this.app, this.motion, this.layerWorld);

    // 7. Initialize Input & Native Screen UI
    this.inputManager = new InputManager(this.app, this.dragController, this.sceneManager);
    this.inputManager.setCamera(this.cameraDirector.cameraComponent);

    this.hud = new HUDRoot(this.app, this.layerHud);
    this.inspector = new SummonInspector(
      this.app,
      this.motion,
      this.audio,
      this.hud.fontAsset!,
      this.hud.screenEntity,
      this.layerHud
    );

    this.debug = new DebugOverlay(this.app, this.dragController, this.sceneManager, this.layerDebug);

    // 8. Wire Tap-to-Inspect and Ground Dismiss
    this.dragController.onSummonTapped = (summon) => {
      const worldPos = campCellToWorld(summon.currentCell);
      this.cameraDirector.focusOnSummon(worldPos);
      this.hud.setBadgeVisible(false);
      this.inspector.open(summon.instance, () => {
        this.hud.setBadgeVisible(true);
        this.cameraDirector.returnToBaseOverview();
      });
    };

    this.dragController.onGroundTapped = () => {
      if (this.inspector.isOpen) {
        this.hud.setBadgeVisible(true);
        this.inspector.close();
      }
    };

    this.events.on('summonGrabbed', () => {
      if (this.inspector.isOpen) {
        this.hud.setBadgeVisible(true);
        this.inspector.close();
      }
    });

    // 9. Start PlayCanvas loop
    this.app.start();

    // Wire frame update
    this.app.on('update', (dt: number) => this.update(dt));

    // Handle window resize
    window.addEventListener('resize', () => this.onResize());
  }

  private update(dt: number): void {
    const frameDt = this.clock.getDelta();

    // Advance motion/tweens
    this.motion.update(frameDt);

    // Update camera impulse and transitions
    this.cameraDirector.update(frameDt);

    // Update scene & summons (idle breathing, drag positions, floating objects)
    this.sceneManager.update(frameDt);

    // Update drag controller & feedback pulse
    this.dragController.update(frameDt);

    // Update debug stats
    this.debug.update(frameDt);
  }

  private onResize(): void {
    this.app.resizeCanvas();
  }

  destroy(): void {
    window.removeEventListener('resize', () => this.onResize());
    this.inputManager.destroy();
    this.debug.destroy();
    this.inspector.destroy();
    this.hud.destroy();
    this.feedback.destroy();
    this.sceneManager.destroy();
    this.vfx.destroy();
    this.cameraDirector.destroy();
    this.app.destroy();
  }
}
