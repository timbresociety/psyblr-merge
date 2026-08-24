import {
  Application,
  ElementInput,
  Keyboard,
  Layer,
  Mouse,
  TouchDevice,
  FILLMODE_FILL_WINDOW,
  RESOLUTION_AUTO,
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
import { RaidHUD } from '../ui/RaidHUD';
import { CampaignHUD } from '../ui/CampaignHUD';
import { DealerHUD } from '../ui/DealerHUD';
import { DefenseHUD } from '../ui/DefenseHUD';
import { OpponentCampHUD } from '../ui/OpponentCampHUD';
import { TutorialHUD } from '../ui/TutorialHUD';
import { DebugOverlay } from '../debug/DebugOverlay';
import { campCellToWorld } from '../world/CampCoordinateMapper';
import { PachinkoWorld } from '../world/PachinkoWorld';
import { SpawnAuthorityService } from '../economy/SpawnAuthorityService';
import { CampaignController } from '../campaign/CampaignController';
import { SilentOnboardingDirector } from '../onboarding/SilentOnboardingDirector';
import type { CombatSnapshot, SummonInstance } from '@psyblr/contracts';

export type GameSceneMode = 'base' | 'campaign' | 'raid' | 'opponentCamp' | 'pachinko' | 'dealer' | 'defense';

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
  public raidHUD: RaidHUD;
  public campaignHUD: CampaignHUD;
  public dealerHUD: DealerHUD;
  public defenseHUD: DefenseHUD;
  public opponentCampHUD: OpponentCampHUD;
  public tutorialHUD: TutorialHUD;
  public debug: DebugOverlay;
  public spawnAuthority: SpawnAuthorityService;
  public campaignController: CampaignController;
  public onboarding: SilentOnboardingDirector;

  public currentMode: GameSceneMode = 'base';

  // Raid Series State
  private raidRoundNumber: 1 | 2 | 3 = 1;
  private raidRoundResults: ('win' | 'loss' | 'pending')[] = ['pending', 'pending', 'pending'];
  private currentRaidSnapshot: CombatSnapshot | null = null;

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

    this.app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    this.app.setCanvasResolution(RESOLUTION_AUTO);
    this.app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.app.resizeCanvas();

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

    // 3. Initialize Presentation Subsystems
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

    // 6. Initialize Scene & Controllers
    this.sceneManager = new SceneManager(
      this.app,
      this.motion,
      this.audio,
      this.vfx,
      this.events,
      this.layerWorld
    );

    this.spawnAuthority = new SpawnAuthorityService();
    this.campaignController = new CampaignController();

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
      this.inspector.open(summon, () => {
        this.cameraDirector.returnToBaseOverview();
      });
    };

    // Initialize Sub-HUDs
    this.tutorialHUD = new TutorialHUD(
      this.app,
      this.hud.fontAsset!,
      this.hud.screenEntity,
      this.layerHud
    );

    this.campaignHUD = new CampaignHUD(
      this.app,
      this.audio,
      this.hud.fontAsset!,
      this.hud.screenEntity,
      this.layerHud
    );

    this.pachinkoHUD = new PachinkoHUD(
      this.app,
      this.motion,
      this.audio,
      this.hud.fontAsset!,
      this.hud.screenEntity,
      this.layerHud
    );

    this.raidHUD = new RaidHUD(
      this.app,
      this.audio,
      this.hud.fontAsset!,
      this.hud.screenEntity,
      this.layerHud
    );

    this.dealerHUD = new DealerHUD(
      this.app,
      this.audio,
      this.hud.fontAsset!,
      this.hud.screenEntity,
      this.layerHud
    );

    this.defenseHUD = new DefenseHUD(
      this.app,
      this.audio,
      this.hud.fontAsset!,
      this.hud.screenEntity,
      this.layerHud
    );

    this.opponentCampHUD = new OpponentCampHUD(
      this.app,
      this.audio,
      this.hud.fontAsset!,
      this.hud.screenEntity,
      this.layerHud
    );

    this.debug = new DebugOverlay(this.app, this.dragController, this.sceneManager, this.layerDebug);

    // Wire Top HUD Navigation Actions
    this.hud.onCampaignClick = () => this.enterCampaign();
    this.hud.onSpawnClick = () => this.enterPachinko();
    this.hud.onRaidClick = () => this.enterRaid();
    this.hud.onDefenseClick = () => this.enterDefense();
    this.hud.onDealerClick = () => this.enterDealer();
    this.hud.onDebugClick = () => this.debug.toggle();

    // Wire Dealer
    this.dealerHUD.onClaimBalls = () => {
      const claimResult = this.spawnAuthority.claimDailyDealerBalls();
      if (claimResult.success) {
        this.hud.updateBallsDisplay(this.spawnAuthority.getBallsRemaining());
        this.dealerHUD.setClaimStatus(false, claimResult.nextClaimMs);
        this.audio.playInspectorOpen();
        this.vfx.spawnBurst([4.8, 2.3, 4.8], '#10b981');
      }
    };
    this.dealerHUD.onClose = () => this.enterBase();

    // Wire Defense Podium
    this.defenseHUD.onClose = () => this.enterBase();

    // Wire Pachinko Machine
    this.sceneManager.pachinkoWorld.onBumperHit = () => {
      const chargeResult = this.spawnAuthority.addBumperBounceCharge();
      this.pachinkoHUD.updateState(
        this.spawnAuthority.getBallsRemaining(),
        chargeResult.currentCharges,
        this.spawnAuthority.isShieldActive(),
        this.spawnAuthority.getShieldRemainingTimeMs()
      );
      this.hud.updateShieldDisplay(
        this.spawnAuthority.isShieldActive(),
        this.spawnAuthority.getShieldRemainingTimeMs()
      );
      if (chargeResult.shieldGranted) {
        this.audio.playInspectorOpen();
        this.vfx.spawnBurst([6.4, 3.0, 0], '#38bdf8');
      }
    };

    this.pachinkoHUD.onDropBall = async () => {
      if (this.spawnAuthority.getBallsRemaining() <= 0) {
        this.audio.playInspectorClose();
        return;
      }
      const result = await this.spawnAuthority.requestReleaseBall(this.sceneManager.getPlacements());
      this.hud.updateBallsDisplay(this.spawnAuthority.getBallsRemaining());
      this.pachinkoHUD.updateState(
        this.spawnAuthority.getBallsRemaining(),
        this.spawnAuthority.getShieldCharges(),
        this.spawnAuthority.isShieldActive(),
        this.spawnAuthority.getShieldRemainingTimeMs()
      );

      this.sceneManager.pachinkoWorld.dropBall(result.rewardSlot, () => {
        this.vfx.spawnBurst([6.4, 0.4, 0], '#fbbf24');
        this.cameraDirector.triggerDropImpulse(0.12);

        setTimeout(() => {
          this.enterBase();
          this.sceneManager.spawnAndTransferSummon(
            result.createdSummon,
            result.destination.cell,
            [6.4, 1.8, 0],
            (summon) => {
              const destPos = campCellToWorld(summon.currentCell);
              this.vfx.spawnBurst(destPos, '#f59e0b');
              this.cameraDirector.triggerDropImpulse(0.08);
              this.dock.setRoster(this.sceneManager.roster, this.sceneManager.getPlacements());
              this.events.emit('spawnLanded', {
                summonId: summon.instance.id,
                definitionId: summon.instance.definitionId,
                cell: summon.currentCell,
              });
            }
          );
        }, 400);
      });
    };
    this.pachinkoHUD.onClose = () => this.enterBase();

    // Wire Campaign
    this.campaignHUD.onStartBattle = () => {
      const snapshot = this.campaignController.buildCombatSnapshot(this.sceneManager.roster);
      this.sceneManager.campaignWorld.loadBattleUnits(snapshot);
      this.campaignHUD.setStatus('COMBAT ACTIVE • DETERMINISTIC RESOLUTION', '#eab308');

      this.sceneManager.campaignWorld.startCombat(snapshot, (winner) => {
        const isVictory = winner === 'player';
        if (isVictory) {
          const victoryInfo = this.campaignController.onVictory();
          this.spawnAuthority.addBalls(victoryInfo.ballsReward);
          this.hud.updateBallsDisplay(this.spawnAuthority.getBallsRemaining());
          this.campaignHUD.showResultModal(true, victoryInfo.levelCleared, victoryInfo.ballsReward);
        } else {
          this.campaignHUD.showResultModal(false, this.campaignController.currentLevel, 0);
        }
      });
    };

    this.campaignHUD.onNextLevel = () => {
      this.refreshCampaignState();
      this.campaignHUD.onStartBattle?.();
    };
    this.campaignHUD.onClose = () => this.enterBase();

    // Wire Raid 3-Round Series
    this.raidHUD.onStartCombat = () => {
      if (this.currentRaidSnapshot) {
        this.raidHUD.setStatus(`COMBAT ACTIVE • ROUND ${this.raidRoundNumber} DETERMINISTIC FIGHT`, '#eab308');
        this.sceneManager.raidWorld.startCombat(this.currentRaidSnapshot, (winner) => {
          const isWin = winner === 'player';
          this.raidRoundResults[this.raidRoundNumber - 1] = isWin ? 'win' : 'loss';

          const wins = this.raidRoundResults.filter((r) => r === 'win').length;
          const losses = this.raidRoundResults.filter((r) => r === 'loss').length;

          if (this.raidRoundNumber < 3) {
            this.raidRoundNumber = (this.raidRoundNumber + 1) as 2 | 3;
            setTimeout(() => {
              this.prepareRaidRound(this.raidRoundNumber);
            }, 800);
          } else {
            // Match complete
            const matchWon = wins >= 2;
            this.raidHUD.showMatchResult(matchWon, wins, losses);
            if (matchWon) {
              this.events.emit('raidWon', {});
            }
          }
        });
      }
    };

    this.raidHUD.onProceedToSteal = () => {
      this.enterOpponentCamp();
    };
    this.raidHUD.onClose = () => this.enterBase();

    // Wire Opponent Camp Steal
    this.sceneManager.opponentCampWorld.onSummonSelected = (entry) => {
      this.opponentCampHUD.setSelectedSummon(entry);
    };

    this.opponentCampHUD.onClaimSteal = () => {
      const selectedId = this.sceneManager.opponentCampWorld.selectedSummonId;
      if (!selectedId) return;

      const oppEntry = this.sceneManager.opponentCampWorld.opponentSummons.find(
        (s) => s.instance.id === selectedId
      );

      if (oppEntry) {
        // Find empty cell in player camp
        let destCell = { x: 0, y: 1 };
        for (let y = 1; y < 6; y++) {
          for (let x = 0; x < 6; x++) {
            if (!this.sceneManager.getPlacements().some((p) => p.cell.x === x && p.cell.y === y)) {
              destCell = { x, y };
              break;
            }
          }
        }

        const stolenSummon: SummonInstance = {
          id: `stolen:${oppEntry.instance.definitionId}:${Date.now()}`,
          definitionId: oppEntry.instance.definitionId,
          tier: oppEntry.instance.tier,
        };

        this.enterBase();
        this.sceneManager.spawnAndTransferSummon(
          stolenSummon,
          destCell,
          [0, 3.0, 0],
          () => {
            this.dock.setRoster(this.sceneManager.roster, this.sceneManager.getPlacements());
            this.events.emit('stealCompleted', { summonId: stolenSummon.id });
          }
        );
      }
    };
    this.opponentCampHUD.onClose = () => this.enterBase();

    // Wire Ground Tap detection for entering 3D structures directly
    this.dragController.onSummonTapped = (summon) => {
      const worldPos = campCellToWorld(summon.currentCell);
      this.cameraDirector.focusOnSummon(worldPos);
      this.inspector.open(summon.instance, () => {
        this.cameraDirector.returnToBaseOverview();
      });
    };

    this.dragController.onGroundTapped = (point) => {
      if (this.currentMode !== 'base') return;

      // Dealer at [4.8, 0, 4.8]
      const distDealer = Math.hypot(point.x - 4.8, point.z - 4.8);
      if (distDealer < 2.5) {
        this.enterDealer();
        return;
      }

      // Spawn Machine at [6.4, 0, 0]
      const distSpawn = Math.hypot(point.x - 6.4, point.z - 0);
      if (distSpawn < 2.5) {
        this.enterPachinko();
        return;
      }

      // Defense Podium at [-4.8, 0, 4.8]
      const distDefense = Math.hypot(point.x + 4.8, point.z - 4.8);
      if (distDefense < 2.5) {
        this.enterDefense();
        return;
      }

      // Campaign Gate at [0, 0, -6.4]
      const distCampaign = Math.hypot(point.x - 0, point.z + 6.4);
      if (distCampaign < 2.5) {
        this.enterCampaign();
        return;
      }

      // Raid Gate at [-6.4, 0, 0]
      const distRaid = Math.hypot(point.x + 6.4, point.z - 0);
      if (distRaid < 2.5) {
        this.enterRaid();
        return;
      }

      if (this.inspector.isOpen) {
        this.inspector.close();
      }
    };

    this.events.on('summonGrabbed', () => {
      if (this.inspector.isOpen) this.inspector.close();
    });

    this.events.on('summonPlaced', () => {
      this.dock.setRoster(this.sceneManager.roster, this.sceneManager.getPlacements());
    });

    // 8. Initialize Guided Onboarding
    this.onboarding = new SilentOnboardingDirector(
      this.app,
      this.events,
      this.sceneManager,
      this.hud,
      this.tutorialHUD,
      this.layerWorld
    );

    // Initial HUD Stats Update
    this.hud.updateBallsDisplay(this.spawnAuthority.getBallsRemaining());
    this.hud.updateShieldDisplay(
      this.spawnAuthority.isShieldActive(),
      this.spawnAuthority.getShieldRemainingTimeMs()
    );

    // 9. Start PlayCanvas loop
    this.app.start();
    this.app.on('update', (dt: number) => this.update(dt));
    window.addEventListener('resize', () => this.onResize());
  }

  // --- SCENE TRANSITION METHODS ---

  enterBase(): void {
    this.currentMode = 'base';
    this.closeAllModals();

    this.sceneManager.baseWorld.setVisible(true);
    this.sceneManager.campaignWorld.hide();
    this.sceneManager.raidWorld.hide();
    this.sceneManager.opponentCampWorld.hide();

    this.dock.root.enabled = true;
    this.hud.setNavVisible(true);
    this.hud.setSubtitle('BASE CAMP • HOME');
    this.cameraDirector.returnToBaseOverview();
    this.onboarding.updatePresentation();
  }

  enterCampaign(): void {
    this.currentMode = 'campaign';
    this.closeAllModals();

    this.sceneManager.baseWorld.setVisible(false);
    this.sceneManager.raidWorld.hide();
    this.sceneManager.opponentCampWorld.hide();
    this.sceneManager.campaignWorld.show();

    this.dock.root.enabled = false;
    this.hud.setNavVisible(false);
    this.cameraDirector.focusOnCampaign();

    this.refreshCampaignState();
    this.campaignHUD.open();
  }

  private refreshCampaignState(): void {
    const level = this.campaignController.currentLevel;
    const arc = this.campaignController.getArcForLevel(level);
    const isMiniBoss = this.campaignController.isMiniBossLevel(level);
    const isBoss = this.campaignController.isMainBossLevel(level);

    this.campaignHUD.setLevelInfo(level, arc, isMiniBoss, isBoss);
    const snapshot = this.campaignController.buildCombatSnapshot(this.sceneManager.roster);
    this.sceneManager.campaignWorld.loadBattleUnits(snapshot);
  }

  enterPachinko(): void {
    this.currentMode = 'pachinko';
    this.closeAllModals();

    this.dock.root.enabled = false;
    this.hud.setNavVisible(false);
    this.cameraDirector.focusOnPachinko();

    this.pachinkoHUD.updateState(
      this.spawnAuthority.getBallsRemaining(),
      this.spawnAuthority.getShieldCharges(),
      this.spawnAuthority.isShieldActive(),
      this.spawnAuthority.getShieldRemainingTimeMs()
    );
    this.pachinkoHUD.open();
  }

  enterDealer(): void {
    this.currentMode = 'dealer';
    this.closeAllModals();

    this.dock.root.enabled = false;
    this.hud.setNavVisible(false);
    this.cameraDirector.focusOnDealer();

    const canClaim = this.spawnAuthority.canClaimDailyDealer();
    const remainingMs = this.spawnAuthority.getTimeUntilNextDealerClaimMs();
    this.dealerHUD.open(canClaim, remainingMs);
  }

  enterDefense(): void {
    this.currentMode = 'defense';
    this.closeAllModals();

    this.dock.root.enabled = false;
    this.hud.setNavVisible(false);
    this.cameraDirector.focusOnDefense();
    this.defenseHUD.open(this.sceneManager.roster);
  }

  enterRaid(): void {
    this.currentMode = 'raid';
    this.closeAllModals();

    this.sceneManager.baseWorld.setVisible(false);
    this.sceneManager.campaignWorld.hide();
    this.sceneManager.opponentCampWorld.hide();
    this.sceneManager.raidWorld.show();

    this.dock.root.enabled = false;
    this.hud.setNavVisible(false);
    this.cameraDirector.focusOnRaid();

    this.raidRoundNumber = 1;
    this.raidRoundResults = ['pending', 'pending', 'pending'];
    this.prepareRaidRound(1);
    this.raidHUD.open();
  }

  private prepareRaidRound(roundNum: 1 | 2 | 3): void {
    const slotCount = roundNum === 1 ? 2 : roundNum === 2 ? 4 : 6;
    this.raidHUD.setRound(roundNum, slotCount, this.raidRoundResults);

    const playerSummons = this.sceneManager.roster.slice(0, slotCount);
    const defRoster = ['eren', 'luffy', 'naruto', 'goku', 'lelouch', 'l'];

    const snapshot: CombatSnapshot = {
      battleId: `raid_r${roundNum}_${Date.now()}`,
      mode: 'raid',
      units: [
        ...playerSummons.map((summon, index) => {
          const spawnCells = slotCount === 2
            ? [{ x: 2, z: 6 }, { x: 5, z: 6 }]
            : slotCount === 4
            ? [{ x: 2, z: 5 }, { x: 5, z: 5 }, { x: 2, z: 6 }, { x: 5, z: 6 }]
            : [{ x: 1, z: 5 }, { x: 3, z: 5 }, { x: 5, z: 5 }, { x: 2, z: 6 }, { x: 4, z: 6 }, { x: 6, z: 6 }];

          return {
            id: `player:${summon.id}:${index}`,
            definitionId: summon.definitionId,
            side: 'player' as const,
            spawnCell: spawnCells[index] ?? { x: index + 1, z: 5 },
            hp: 1000,
            atk: 110,
            def: 70,
            attacksPerSecond: 1.1,
            range: 2.0,
            moveSpeed: 4.5,
            skill1Id: 'ki_burst',
            skill1: null,
            basicAttackDamagePct: 0,
            skillPowerPct: 0,
            statusDurationPct: 0,
          };
        }),
        ...Array.from({ length: slotCount }, (_, index) => {
          const enemyCells = slotCount === 2
            ? [{ x: 2, z: 1 }, { x: 5, z: 1 }]
            : slotCount === 4
            ? [{ x: 2, z: 2 }, { x: 5, z: 2 }, { x: 2, z: 1 }, { x: 5, z: 1 }]
            : [{ x: 1, z: 2 }, { x: 3, z: 2 }, { x: 5, z: 2 }, { x: 2, z: 1 }, { x: 4, z: 1 }, { x: 6, z: 1 }];

          return {
            id: `enemy:defender:${index}`,
            definitionId: defRoster[index % defRoster.length]!,
            side: 'enemy' as const,
            spawnCell: enemyCells[index] ?? { x: index + 1, z: 2 },
            hp: 950,
            atk: 100,
            def: 65,
            attacksPerSecond: 1.0,
            range: 2.0,
            moveSpeed: 4.2,
            skill1Id: null,
            skill1: null,
            basicAttackDamagePct: 0,
            skillPowerPct: 0,
            statusDurationPct: 0,
          };
        }),
      ],
    };

    this.currentRaidSnapshot = snapshot;
    this.sceneManager.raidWorld.loadRoundUnits(snapshot);
  }

  enterOpponentCamp(): void {
    this.currentMode = 'opponentCamp';
    this.closeAllModals();

    this.sceneManager.baseWorld.setVisible(false);
    this.sceneManager.campaignWorld.hide();
    this.sceneManager.raidWorld.hide();
    this.sceneManager.opponentCampWorld.show();
    this.sceneManager.opponentCampWorld.loadOpponentCamp();

    this.dock.root.enabled = false;
    this.hud.setNavVisible(false);
    this.cameraDirector.focusOnOpponentCamp();
    this.opponentCampHUD.open();
  }

  private closeAllModals(): void {
    if (this.inspector.isOpen) this.inspector.close();
    if (this.pachinkoHUD.isOpen) this.pachinkoHUD.close();
    if (this.raidHUD.isOpen) this.raidHUD.close();
    if (this.campaignHUD.isOpen) this.campaignHUD.close();
    if (this.dealerHUD.isOpen) this.dealerHUD.close();
    if (this.defenseHUD.isOpen) this.defenseHUD.close();
    if (this.opponentCampHUD.isOpen) this.opponentCampHUD.close();
    this.tutorialHUD.hide();
  }

  private update(dt: number): void {
    const frameDt = this.clock.getDelta();

    this.motion.update(frameDt);
    this.sceneManager.update(frameDt);
    this.cameraDirector.update(frameDt);
    this.onboarding.update(frameDt);
    this.debug.update(frameDt);

    // Update Shield Timer Display
    if (this.spawnAuthority.isShieldActive()) {
      this.hud.updateShieldDisplay(true, this.spawnAuthority.getShieldRemainingTimeMs());
    }
  }

  private onResize(): void {
    this.app.resizeCanvas();
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.inputManager.destroy();
    this.feedback.destroy();
    this.onboarding.destroy();
    this.debug.destroy();
    this.inspector.destroy();
    this.dock.destroy();
    this.pachinkoHUD.destroy();
    this.raidHUD.destroy();
    this.campaignHUD.destroy();
    this.dealerHUD.destroy();
    this.defenseHUD.destroy();
    this.opponentCampHUD.destroy();
    this.tutorialHUD.destroy();
    this.hud.destroy();
    this.sceneManager.destroy();
    this.vfx.destroy();
    this.cameraDirector.destroy();
    this.events.clear();
    this.app.destroy();
  }
}
