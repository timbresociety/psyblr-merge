import {
  Application,
  Color,
  ElementInput,
  Keyboard,
  Layer,
  Mouse,
  TouchDevice,
  LAYERID_DEPTH,
  LAYERID_SKYBOX,
  LAYERID_UI,
  LAYERID_IMMEDIATE,
} from 'playcanvas';
import { PresentationEventEmitter } from '../presentation/PresentationEvents';
import { MotionDirector } from '../presentation/MotionDirector';
import { AudioDirector } from '../presentation/AudioDirector';
import { VFXDirector } from '../presentation/VFXDirector';
import { CameraDirector } from './CameraDirector';
import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { GameClock } from './GameClock';
import { CampDropTargetResolver } from '../interaction/CampDropTargetResolver';
import { InteractionFeedback } from '../interaction/InteractionFeedback';
import { DragController } from '../interaction/DragController';
import { HUDRoot } from '../ui/HUDRoot';
import { SummonInspector } from '../ui/SummonInspector';
import { BattleCampDock } from '../ui/BattleCampDock';
import { PachinkoHUD } from '../ui/PachinkoHUD';
import { DebugOverlay } from '../debug/DebugOverlay';
import { campCellToWorld } from '../world/CampCoordinateMapper';
import { PachinkoWorld } from '../world/PachinkoWorld';
import { SpawnAuthorityService } from '../economy/SpawnAuthorityService';

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
  public dock: BattleCampDock;
  public pachinkoHUD: PachinkoHUD;
  public debug: DebugOverlay;
  public spawnAuthority: SpawnAuthorityService;

  // Custom Layer references
  public layerWorld: Layer;
  public layerWorldFx: Layer;
  public layerWorldUi: Layer;
  public layerHud: Layer;
  public layerHudFx: Layer;
  public layerTransition: Layer;
  public layerDebug: Layer;

  constructor(canvas: HTMLCanvasElement) {
    // 1. Create PlayCanvas Application instance
    this.app = new Application(canvas, {
      mouse: new Mouse(canvas),
      touch: new TouchDevice(canvas),
      keyboard: new Keyboard(window),
      elementInput: new ElementInput(canvas),
    });

    this.clock = new GameClock();

    // 2. Configure 7-Layer Rendering Pipeline
    const layers = this.app.scene.layers;
    this.layerWorld = layers.getLayerByName('World')!;

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
    this.sceneManager = new SceneManager(
      this.app,
      this.motion,
      this.audio,
      this.events,
      this.layerWorld
    );

    // 7. Initialize Economy Authority
    this.spawnAuthority = new SpawnAuthorityService();

    // 8. Initialize Input & Native Screen UI
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

    this.dock = new BattleCampDock(
      this.app,
      this.hud.fontAsset!,
      this.hud.screenEntity,
      this.layerHud
    );
    this.dock.setRoster(this.sceneManager.roster, this.sceneManager.getPlacements());

    this.dock.onCardClick = (summon) => {
      const activeSummon = this.sceneManager.getSummonById(summon.id);
      if (activeSummon) {
        const worldPos = campCellToWorld(activeSummon.currentCell);
        this.cameraDirector.focusOnSummon(worldPos);
      }
      this.hud.setBadgeVisible(false);
      this.inspector.open(summon, () => {
        this.hud.setBadgeVisible(true);
        this.cameraDirector.returnToBaseOverview();
      });
    };

    this.pachinkoHUD = new PachinkoHUD(
      this.app,
      this.motion,
      this.audio,
      this.hud.fontAsset!,
      this.hud.screenEntity,
      this.layerHud
    );

    // Wire Authoritative Spawn Execution
    this.pachinkoHUD.onDropBall = async () => {
      const result = await this.spawnAuthority.requestReleaseBall(this.sceneManager.getPlacements());

      this.sceneManager.pachinkoWorld.dropBall(result.rewardSlot, () => {
        // Bin landed reward choreography
        this.vfx.spawnBurst([6.4, 0.4, 0], '#fbbf24');
        this.cameraDirector.triggerDropImpulse(0.12);

        setTimeout(() => {
          this.exitPachinko();

          // Transfer and fly the new summon into Camp
          this.sceneManager.spawnAndTransferSummon(
            result.createdSummon,
            result.destination.cell,
            [6.4, 1.8, 0],
            (summon) => {
              const destPos = campCellToWorld(summon.currentCell);
              this.vfx.spawnBurst(destPos, '#f59e0b');
              this.cameraDirector.triggerDropImpulse(0.08);
              this.dock.setRoster(this.sceneManager.roster, this.sceneManager.getPlacements());
            }
          );
        }, 400);
      });
    };

    this.pachinkoHUD.onClose = () => {
      this.exitPachinko();
    };

    this.debug = new DebugOverlay(this.app, this.dragController, this.sceneManager, this.layerDebug);

    // 9. Wire Tap-to-Inspect, Ground Dismiss, and Pachinko Entry
    this.dragController.onSummonTapped = (summon) => {
      const worldPos = campCellToWorld(summon.currentCell);
      this.cameraDirector.focusOnSummon(worldPos);
      this.hud.setBadgeVisible(false);
      this.inspector.open(summon.instance, () => {
        this.hud.setBadgeVisible(true);
        this.cameraDirector.returnToBaseOverview();
      });
    };

    this.dragController.onGroundTapped = (point) => {
      // Check if tap was on the Pachinko Spawn Machine Pad (around [6.4, 0, 0])
      const dx = point.x - PachinkoWorld.ORIGIN[0];
      const dz = point.z - PachinkoWorld.ORIGIN[2];
      const distToPachinko = Math.sqrt(dx * dx + dz * dz);

      if (distToPachinko < 2.4 && !this.pachinkoHUD.isOpen) {
        this.enterPachinko();
        return;
      }

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

    this.events.on('summonPlaced', () => {
      this.dock.setRoster(this.sceneManager.roster, this.sceneManager.getPlacements());
    });

    // 10. Start PlayCanvas loop
    this.app.start();

    // Wire frame update
    this.app.on('update', (dt: number) => this.update(dt));

    // Handle window resize
    window.addEventListener('resize', () => this.onResize());
  }

  enterPachinko(): void {
    if (this.inspector.isOpen) this.inspector.close();
    this.hud.setBadgeVisible(false);
    this.dock.root.enabled = false;
    this.cameraDirector.focusOnPachinko();
    this.pachinkoHUD.open();
  }

  exitPachinko(): void {
    this.pachinkoHUD.close();
    this.dock.root.enabled = true;
    this.hud.setBadgeVisible(true);
    this.cameraDirector.returnToBaseOverview();
  }

  private update(dt: number): void {
    const frameDt = this.clock.getDelta();

    this.motion.update(frameDt);
    this.sceneManager.update(frameDt);
    this.cameraDirector.update(frameDt);
    this.debug.update(frameDt);
  }

  private onResize(): void {
    this.app.resizeCanvas();
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.inputManager.destroy();
    this.feedback.destroy();
    this.debug.destroy();
    this.inspector.destroy();
    this.dock.destroy();
    this.pachinkoHUD.destroy();
    this.hud.destroy();
    this.sceneManager.destroy();
    this.vfx.destroy();
    this.cameraDirector.destroy();
    this.events.clear();
    this.app.destroy();
  }
}
