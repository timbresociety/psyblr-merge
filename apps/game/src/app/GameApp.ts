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
import { getSummonDefinition } from '@psyblr/game-content';
import { resolveSummonPowerLevel, resolveTierStats, findFirstExposedCampCell, isCampCellOccupied } from '@psyblr/game-rules';

export type GameSceneMode = 'base' | 'campaign' | 'raid' | 'opponentCamp' | 'pachinko' | 'dealer' | 'defense';

export const DEFAULT_CAMPAIGN_CELLS = [
  { x: 1, z: 5 }, { x: 3, z: 5 }, { x: 5, z: 5 },
  { x: 2, z: 6 }, { x: 4, z: 6 }, { x: 6, z: 6 },
];

export const DEFAULT_RAID_CELLS: Record<2 | 4 | 6, { x: number; z: number }[]> = {
  2: [{ x: 2, z: 6 }, { x: 5, z: 6 }],
  4: [{ x: 2, z: 5 }, { x: 5, z: 5 }, { x: 2, z: 6 }, { x: 5, z: 6 }],
  6: [
    { x: 1, z: 5 }, { x: 3, z: 5 }, { x: 5, z: 5 },
    { x: 2, z: 6 }, { x: 4, z: 6 }, { x: 6, z: 6 },
  ],
};

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
  private campaignPlacements: { summon: SummonInstance; cell: { x: number; z: number } }[] = [];
  private raidPlacements: { summon: SummonInstance; cell: { x: number; z: number } }[] = [];
  private inFlightSpawns: number = 0;

  // Custom Layer references
  public layerWorld: Layer;
  public layerWorldFx: Layer;
  public layerWorldUi: Layer;
  public layerHud: Layer;
  public layerHudFx: Layer;
  public layerTransition: Layer;
  public layerDebug: Layer;

  constructor(canvas: HTMLCanvasElement) {
    if (typeof window !== 'undefined' && window.location.search.includes('reset=true')) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
        fetch('http://127.0.0.1:54321/api/player/reset', { method: 'POST' }).catch(() => {});
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {
        // Ignore
      }
    }

    if (typeof window !== 'undefined') {
      (window as any).resetGame = () => this.resetGame();
      (window as any).resetPsyblrSession = () => this.resetGame();
      (window as any).psyblrReset = () => this.resetGame();
    }

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
    this.layerHud.opaqueSortMode = 3; // SORTMODE_MANUAL
    this.layerHud.transparentSortMode = 3; // SORTMODE_MANUAL
    this.layerHudFx = new Layer({ name: 'HUD_FX', id: 1004 });
    this.layerHudFx.opaqueSortMode = 3;
    this.layerHudFx.transparentSortMode = 3;
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
    this.debug.onAddSummon = (defId, tier) => {
      const placements = this.sceneManager.getPlacements();
      const freeCell = findFirstExposedCampCell(placements);
      if (freeCell) {
        this.sceneManager.addSummonToCamp({ id: `cheat:${defId}:${Date.now()}`, definitionId: defId, tier: tier as any }, freeCell);
        this.dock.setRoster(this.sceneManager.roster, this.sceneManager.getPlacements());
      }
    };
    this.debug.onOpenPachinko = () => this.enterPachinko();
    this.debug.onOpenRaid = () => this.enterRaid();
    this.debug.onResetStarters = () => this.resetGame();

    // Wire Top HUD Navigation Actions
    this.hud.onCampaignClick = () => this.enterCampaign();
    this.hud.onSpawnClick = () => this.enterPachinko();
    this.hud.onRaidClick = () => this.enterRaid();
    this.hud.onDefenseClick = () => this.enterDefense();
    this.hud.onDealerClick = () => this.enterDealer();
    this.hud.onDebugClick = () => this.debug.toggle();

    // Wire Inspector Release Action
    this.inspector.setOnRelease(async (summon) => {
      const placement = this.sceneManager.getPlacements().find((p) => p.summonInstanceId === summon.id);
      const result = await this.spawnAuthority.requestReleaseSummon(summon, placement?.cell);
      this.sceneManager.removeSummon(summon.id);
      this.dock.setRoster(this.sceneManager.roster, this.sceneManager.getPlacements());
      this.hud.updateMedalsDisplay(this.spawnAuthority.getMedalsRemaining());
      this.inspector.close();
      this.audio.playInspectorClose();
      if (placement) {
        const worldPos = campCellToWorld(placement.cell);
        this.vfx.spawnBurst(worldPos, '#ef4444');
      }
    });

    // Wire Dealer
    this.dealerHUD.onClaimBalls = async () => {
      const claimResult = await this.spawnAuthority.requestCollectDealerStock();
      if (claimResult.collectedStock > 0) {
        this.hud.updateMedalsDisplay(this.spawnAuthority.getMedalsRemaining());
        this.dealerHUD.showCollectionSuccess(claimResult.collectedStock);
        const canClaim = this.spawnAuthority.canClaimDailyDealer();
        const remainingMs = this.spawnAuthority.getTimeUntilNextDealerClaimMs();
        this.dealerHUD.setStock(this.spawnAuthority.getDealerStock(), canClaim, remainingMs);
        this.sceneManager.baseWorld.setDealerBubbleVisible(this.spawnAuthority.canClaimDealerStock());
        this.audio.playInspectorOpen();
        this.vfx.spawnBurst([4.8, 2.3, 4.8], '#10b981');
        this.events.emit('dealerStockCollected', { medals: claimResult.collectedStock });
      }
    };
    this.dealerHUD.onClose = () => this.enterBase();

    // Wire Defense Podium
    this.defenseHUD.onClose = () => this.enterBase();

    // Wire Pachinko Machine
    this.sceneManager.pachinkoWorld.onBumperHit = () => {
      const chargeResult = this.spawnAuthority.addBumperBounceCharge();
      this.pachinkoHUD.updateState(
        this.spawnAuthority.getMedalsRemaining(),
        chargeResult.currentCharges,
        this.spawnAuthority.isShieldActive(),
        this.spawnAuthority.getShieldRemainingTimeMs(),
        this.sceneManager.roster.length + this.inFlightSpawns,
        36
      );
      this.hud.updateShieldDisplay(
        this.spawnAuthority.isShieldActive(),
        this.spawnAuthority.getShieldRemainingTimeMs()
      );
      if (chargeResult.shieldGranted) {
        this.audio.playInspectorOpen();
        this.vfx.spawnBurst([6.4, 3.0, 0], '#38bdf8');
        this.pachinkoHUD.showNotification('⚡ TIME SHIELD CHARGED +1 HOUR!', false, 3000);
      }
    };

    this.pachinkoHUD.onDropBall = async () => {
      const currentCamp = this.sceneManager.roster.length;
      if (this.spawnAuthority.getMedalsRemaining() <= 0) {
        this.pachinkoHUD.showNotification('⚠️ OUT OF MEDALS! Collect Medals from Dealer or Campaign.', true);
        this.audio.playInspectorClose();
        return false;
      }
      if (currentCamp + this.inFlightSpawns >= 36) {
        this.pachinkoHUD.showNotification('⚠️ BATTLE CAMP FULL (36/36)! Merge or Release Summons first.', true);
        this.audio.playInspectorClose();
        return false;
      }

      this.inFlightSpawns++;
      this.pachinkoHUD.updateState(
        this.spawnAuthority.getMedalsRemaining() - 1,
        this.spawnAuthority.getShieldCharges(),
        this.spawnAuthority.isShieldActive(),
        this.spawnAuthority.getShieldRemainingTimeMs(),
        currentCamp + this.inFlightSpawns,
        36
      );

      try {
        const result = await this.spawnAuthority.requestReleaseBall(this.sceneManager.getPlacements());
        this.hud.updateMedalsDisplay(this.spawnAuthority.getMedalsRemaining());
        this.pachinkoHUD.updateState(
          this.spawnAuthority.getMedalsRemaining(),
          this.spawnAuthority.getShieldCharges(),
          this.spawnAuthority.isShieldActive(),
          this.spawnAuthority.getShieldRemainingTimeMs(),
          this.sceneManager.roster.length + this.inFlightSpawns,
          36
        );

        this.sceneManager.pachinkoWorld.dropBall(result.rewardSlot, (bin) => {
          this.inFlightSpawns = Math.max(0, this.inFlightSpawns - 1);
          this.vfx.spawnBurst([6.4, 0.2, 0], '#fbbf24');
          this.cameraDirector.triggerDropImpulse(0.08);

          // Add summon to battle camp
          const summonEntity = this.sceneManager.addSummonToCamp(result.createdSummon, result.destination.cell);
          if (summonEntity) {
            const def = getSummonDefinition(result.createdSummon.definitionId);
            const name = def?.displayName ?? result.createdSummon.definitionId.toUpperCase();

            this.pachinkoHUD.showNotification(`✨ ACQUIRED [${result.createdSummon.tier}] ${name}! Transferred to Camp.`, false, 2400);

            this.pachinkoHUD.updateState(
              this.spawnAuthority.getMedalsRemaining(),
              this.spawnAuthority.getShieldCharges(),
              this.spawnAuthority.isShieldActive(),
              this.spawnAuthority.getShieldRemainingTimeMs(),
              this.sceneManager.roster.length + this.inFlightSpawns,
              36
            );

            this.events.emit('spawnLanded', {
              summonId: summonEntity.instance.id,
              definitionId: summonEntity.instance.definitionId,
              cell: summonEntity.currentCell,
            });
          }
        });

        return true;
      } catch (err) {
        this.inFlightSpawns = Math.max(0, this.inFlightSpawns - 1);
        this.pachinkoHUD.showNotification('⚠️ BATTLE CAMP FULL (36/36)!', true);
        return false;
      }
    };
    this.pachinkoHUD.onClose = () => {
      this.dock.setRoster(this.sceneManager.roster, this.sceneManager.getPlacements());
      this.enterBase();
    };

    // Wire Campaign
    this.campaignHUD.onToggleDeploy = (summon: SummonInstance) => {
      const idx = this.campaignPlacements.findIndex((p) => p.summon.id === summon.id);
      if (idx >= 0) {
        // Recall to bench
        this.campaignPlacements.splice(idx, 1);
      } else if (this.campaignPlacements.length < 6) {
        // Deploy to next free tactical cell
        const occupied = new Set(this.campaignPlacements.map((p) => `${p.cell.x}_${p.cell.z}`));
        let freeCell = DEFAULT_CAMPAIGN_CELLS.find((c) => !occupied.has(`${c.x}_${c.z}`));
        if (!freeCell) {
          for (let z = 5; z <= 7; z++) {
            for (let x = 0; x <= 7; x++) {
              if (!occupied.has(`${x}_${z}`)) {
                freeCell = { x, z };
                break;
              }
            }
            if (freeCell) break;
          }
        }
        this.campaignPlacements.push({ summon, cell: freeCell ?? { x: 1, z: 5 } });
      }
      this.updateCampaignSquadPresentation();
    };

    this.campaignHUD.onWithdrawAll = () => {
      this.campaignPlacements = [];
      this.updateCampaignSquadPresentation();
      this.audio.playInspectorClose();
    };

    this.campaignHUD.onAutoDeploy = () => {
      const sorted = [...this.sceneManager.roster].sort((a, b) => {
        const pwrA = resolveSummonPowerLevel(getSummonDefinition(a.definitionId), a.tier);
        const pwrB = resolveSummonPowerLevel(getSummonDefinition(b.definitionId), b.tier);
        return pwrB - pwrA;
      });
      const top6 = sorted.slice(0, 6);
      this.campaignPlacements = top6.map((summon, idx) => ({
        summon,
        cell: DEFAULT_CAMPAIGN_CELLS[idx] ?? { x: idx + 1, z: 5 },
      }));
      this.updateCampaignSquadPresentation();
      this.audio.playInspectorOpen();
    };

    this.campaignHUD.onCardDragStart = (summon: SummonInstance, clientX: number, clientY: number) => {
      const groundPoint = this.inputManager.screenToGround(clientX, clientY);
      this.dragController.startCardDrag(summon, groundPoint);
    };

    this.campaignHUD.onStartBattle = () => {
      if (this.campaignPlacements.length === 0) {
        this.campaignHUD.setSquadInfo(
          0,
          6,
          0,
          '⚠️ DEPLOY AT LEAST 1 SUMMON TO ENTER BATTLE!'
        );
        this.audio.playInspectorClose();
        return;
      }
      const snapshot = this.campaignController.buildCombatSnapshot(this.campaignPlacements);
      this.sceneManager.campaignWorld.loadBattleUnits(snapshot);
      this.campaignHUD.setSquadInfo(
        this.campaignPlacements.length,
        6,
        this.calculateSquadPower(this.campaignPlacements.map((p) => p.summon)),
        'COMBAT ACTIVE • DETERMINISTIC RESOLUTION'
      );
      this.dragController.setCombatActive(true);
      this.campaignHUD.setCombatActive(true);

      this.sceneManager.campaignWorld.startCombat(snapshot, (winner) => {
        this.dragController.setCombatActive(false);
        this.campaignHUD.setCombatActive(false);
        const isVictory = winner === 'player';
        if (isVictory) {
          const victoryInfo = this.campaignController.onVictory();
          this.spawnAuthority.addMedals(victoryInfo.ballsReward);
          this.hud.updateMedalsDisplay(this.spawnAuthority.getMedalsRemaining());
          this.campaignHUD.showResultModal(true, victoryInfo.levelCleared, victoryInfo.ballsReward);
          this.events.emit('campaignWon', {});
          if (this.onboarding.phase === 'CAMPAIGN') {
            this.onboarding.advanceTo('BATTLE_CAMP');
          }
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
    this.raidHUD.onToggleDeploy = (summon: SummonInstance) => {
      const slotCount = this.raidRoundNumber === 1 ? 2 : this.raidRoundNumber === 2 ? 4 : 6;
      const idx = this.raidPlacements.findIndex((p) => p.summon.id === summon.id);
      if (idx >= 0) {
        // Recall to bench
        this.raidPlacements.splice(idx, 1);
      } else if (this.raidPlacements.length < slotCount) {
        // Deploy to next free tactical cell
        const defaultCells = DEFAULT_RAID_CELLS[slotCount];
        const occupied = new Set(this.raidPlacements.map((p) => `${p.cell.x}_${p.cell.z}`));
        let freeCell = defaultCells.find((c) => !occupied.has(`${c.x}_${c.z}`));
        if (!freeCell) {
          for (let z = 5; z <= 7; z++) {
            for (let x = 0; x <= 7; x++) {
              if (!occupied.has(`${x}_${z}`)) {
                freeCell = { x, z };
                break;
              }
            }
            if (freeCell) break;
          }
        }
        this.raidPlacements.push({ summon, cell: freeCell ?? { x: 2, z: 6 } });
      }
      this.updateRaidRoundPresentation(this.raidRoundNumber, slotCount);
    };

    this.raidHUD.onWithdrawAll = () => {
      this.raidPlacements = [];
      const slotCount = this.raidRoundNumber === 1 ? 2 : this.raidRoundNumber === 2 ? 4 : 6;
      this.updateRaidRoundPresentation(this.raidRoundNumber, slotCount);
      this.audio.playInspectorClose();
    };

    this.raidHUD.onAutoDeploy = () => {
      const slotCount = this.raidRoundNumber === 1 ? 2 : this.raidRoundNumber === 2 ? 4 : 6;
      const defaultCells = DEFAULT_RAID_CELLS[slotCount];
      const sorted = [...this.sceneManager.roster].sort((a, b) => {
        const pwrA = resolveSummonPowerLevel(getSummonDefinition(a.definitionId), a.tier);
        const pwrB = resolveSummonPowerLevel(getSummonDefinition(b.definitionId), b.tier);
        return pwrB - pwrA;
      });
      const topN = sorted.slice(0, slotCount);
      this.raidPlacements = topN.map((summon, idx) => ({
        summon,
        cell: defaultCells[idx] ?? { x: idx + 1, z: 6 },
      }));
      this.updateRaidRoundPresentation(this.raidRoundNumber, slotCount);
      this.audio.playInspectorOpen();
    };

    this.raidHUD.onCardDragStart = (summon: SummonInstance, clientX: number, clientY: number) => {
      const groundPoint = this.inputManager.screenToGround(clientX, clientY);
      this.dragController.startCardDrag(summon, groundPoint);
    };

    this.raidHUD.onTimerExpired = () => {
      const slotCount = this.raidRoundNumber === 1 ? 2 : this.raidRoundNumber === 2 ? 4 : 6;
      if (this.raidPlacements.length < slotCount) {
        const defaultCells = DEFAULT_RAID_CELLS[slotCount];
        this.raidPlacements = this.sceneManager.roster.slice(0, slotCount).map((summon, idx) => ({
          summon,
          cell: defaultCells[idx] ?? { x: idx + 1, z: 6 },
        }));
      }
      this.updateRaidRoundPresentation(this.raidRoundNumber, slotCount);
      this.raidHUD.onStartCombat?.();
    };

    this.raidHUD.onStartCombat = () => {
      if (this.currentRaidSnapshot && this.raidPlacements.length > 0) {
        this.dragController.setCombatActive(true);
        this.raidHUD.setCombatActive(true);
        this.raidHUD.setStatus(`COMBAT ACTIVE • ROUND ${this.raidRoundNumber} DETERMINISTIC FIGHT`, '#eab308');
        this.sceneManager.raidWorld.startCombat(this.currentRaidSnapshot, (winner) => {
          this.dragController.setCombatActive(false);
          this.raidHUD.setCombatActive(false);
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

    // Wire Tactical Drag Controller Callbacks (Campaign & Raid)
    this.dragController.onTacticalMove = (summonId, toCell) => {
      if (this.currentMode === 'campaign') {
        const item = this.campaignPlacements.find((p) => p.summon.id === summonId);
        if (item) {
          item.cell = { ...toCell };
          this.sceneManager.campaignWorld.setPlayerUnitPosition(summonId, toCell, true);
          this.updateCampaignSquadPresentation();
        }
      } else if (this.currentMode === 'raid') {
        const item = this.raidPlacements.find((p) => p.summon.id === summonId);
        if (item) {
          item.cell = { ...toCell };
          this.sceneManager.raidWorld.setPlayerUnitPosition(summonId, toCell, true);
          const slotCount = this.raidRoundNumber === 1 ? 2 : this.raidRoundNumber === 2 ? 4 : 6;
          this.updateRaidRoundPresentation(this.raidRoundNumber, slotCount);
        }
      }
    };

    this.dragController.onTacticalSwap = (summonId1, summonId2) => {
      if (this.currentMode === 'campaign') {
        const item1 = this.campaignPlacements.find((p) => p.summon.id === summonId1);
        const item2 = this.campaignPlacements.find((p) => p.summon.id === summonId2);
        if (item1 && item2) {
          const c1 = { ...item1.cell };
          const c2 = { ...item2.cell };
          item1.cell = c2;
          item2.cell = c1;
          this.sceneManager.campaignWorld.swapPlayerUnits(summonId1, summonId2);
          this.updateCampaignSquadPresentation();
        }
      } else if (this.currentMode === 'raid') {
        const item1 = this.raidPlacements.find((p) => p.summon.id === summonId1);
        const item2 = this.raidPlacements.find((p) => p.summon.id === summonId2);
        if (item1 && item2) {
          const c1 = { ...item1.cell };
          const c2 = { ...item2.cell };
          item1.cell = c2;
          item2.cell = c1;
          this.sceneManager.raidWorld.swapPlayerUnits(summonId1, summonId2);
          const slotCount = this.raidRoundNumber === 1 ? 2 : this.raidRoundNumber === 2 ? 4 : 6;
          this.updateRaidRoundPresentation(this.raidRoundNumber, slotCount);
        }
      }
    };

    this.dragController.onTacticalRecall = (summonId) => {
      if (this.currentMode === 'campaign') {
        this.campaignPlacements = this.campaignPlacements.filter((p) => p.summon.id !== summonId);
        this.updateCampaignSquadPresentation();
      } else if (this.currentMode === 'raid') {
        this.raidPlacements = this.raidPlacements.filter((p) => p.summon.id !== summonId);
        const slotCount = this.raidRoundNumber === 1 ? 2 : this.raidRoundNumber === 2 ? 4 : 6;
        this.updateRaidRoundPresentation(this.raidRoundNumber, slotCount);
      }
    };

    this.dragController.onTacticalDeploy = (summon, cell) => {
      if (this.currentMode === 'campaign') {
        const existing = this.campaignPlacements.find((p) => p.summon.id === summon.id);
        const occupant = this.campaignPlacements.find((p) => p.cell.x === cell.x && p.cell.z === cell.z);

        if (existing) {
          if (occupant && occupant.summon.id !== summon.id) {
            const prevCell = { ...existing.cell };
            existing.cell = { ...cell };
            occupant.cell = prevCell;
          } else {
            existing.cell = { ...cell };
          }
        } else {
          if (occupant) {
            this.campaignPlacements = this.campaignPlacements.filter((p) => p.summon.id !== occupant.summon.id);
          }
          if (this.campaignPlacements.length < 6) {
            this.campaignPlacements.push({ summon, cell: { ...cell } });
          }
        }
        this.updateCampaignSquadPresentation();
      } else if (this.currentMode === 'raid') {
        const slotCount = this.raidRoundNumber === 1 ? 2 : this.raidRoundNumber === 2 ? 4 : 6;
        const existing = this.raidPlacements.find((p) => p.summon.id === summon.id);
        const occupant = this.raidPlacements.find((p) => p.cell.x === cell.x && p.cell.z === cell.z);

        if (existing) {
          if (occupant && occupant.summon.id !== summon.id) {
            const prevCell = { ...existing.cell };
            existing.cell = { ...cell };
            occupant.cell = prevCell;
          } else {
            existing.cell = { ...cell };
          }
        } else {
          if (occupant) {
            this.raidPlacements = this.raidPlacements.filter((p) => p.summon.id !== occupant.summon.id);
          }
          if (this.raidPlacements.length < slotCount) {
            this.raidPlacements.push({ summon, cell: { ...cell } });
          }
        }
        this.updateRaidRoundPresentation(this.raidRoundNumber, slotCount);
      }
    };

    // Wire Opponent Camp Steal
    this.sceneManager.opponentCampWorld.onSummonSelected = (entry) => {
      this.opponentCampHUD.setSelectedSummon(entry);
    };

    this.dragController.onOpponentSummonTapped = (entry) => {
      if (entry.isProtected) {
        this.opponentCampHUD.showProtectedNotice(entry);
        this.inspector.open(entry.instance, undefined, { allowRelease: false });
      } else {
        this.sceneManager.opponentCampWorld.selectSummon(entry.instance.id);
        this.inspector.open(entry.instance, undefined, { allowRelease: false });
      }
    };

    this.opponentCampHUD.onInspectSummon = (entry) => {
      this.inspector.open(entry.instance, undefined, { allowRelease: false });
    };

    this.opponentCampHUD.onClaimSteal = () => {
      const selectedId = this.sceneManager.opponentCampWorld.selectedSummonId;
      if (!selectedId) return;

      const oppEntry = this.sceneManager.opponentCampWorld.opponentSummons.find(
        (s) => s.instance.id === selectedId
      );

      if (oppEntry) {
        if (this.sceneManager.roster.length >= 36) {
          this.audio.playInspectorClose();
          return;
        }

        // Find empty cell in player camp
        const placements = this.sceneManager.getPlacements();
        let destCell = findFirstExposedCampCell(placements);
        if (!destCell) {
          for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
              if (!isCampCellOccupied({ x, y }, placements)) {
                destCell = { x, y };
                break;
              }
            }
            if (destCell) break;
          }
        }

        if (!destCell) {
          this.audio.playInspectorClose();
          return;
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
      if (this.inspector.isOpen && this.inspector.activeSummonId === summon.instance.id) {
        this.inspector.close();
        return;
      }
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

    this.events.on('tutorialStepChanged', ({ phase }) => {
      if (
        phase === 'BATTLE_CAMP' ||
        phase === 'ILLUMINATI' ||
        phase === 'DEALER' ||
        phase === 'SPAWN_MACHINE' ||
        phase === 'MERGE_HEROES' ||
        phase === 'RAID_BATTLE'
      ) {
        if (this.currentMode !== 'base') {
          this.enterBase();
        }
      }
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
    this.hud.updateMedalsDisplay(this.spawnAuthority.getMedalsRemaining());
    this.hud.updateShieldDisplay(
      this.spawnAuthority.isShieldActive(),
      this.spawnAuthority.getShieldRemainingTimeMs()
    );

    // If new player in CAMPAIGN step, start directly in Campaign per PRODUCT_FINAL.md
    if (this.onboarding.phase === 'CAMPAIGN') {
      this.enterCampaign();
    }

    // 9. Start PlayCanvas loop
    this.app.start();
    this.app.on('update', (dt: number) => this.update(dt));
    window.addEventListener('resize', () => this.onResize());
  }

  // --- SCENE TRANSITION METHODS ---

  enterBase(): void {
    this.currentMode = 'base';
    this.dragController.setMode('base');
    this.closeAllModals();

    this.sceneManager.setBaseVisible(true);
    this.sceneManager.campaignWorld.hide();
    this.sceneManager.raidWorld.hide();
    this.sceneManager.defenseWorld.hide();
    this.sceneManager.opponentCampWorld.hide();

    this.dock.root.enabled = false;
    this.dock.setRoster(this.sceneManager.roster, this.sceneManager.getPlacements());
    this.hud.setNavVisible(true);
    this.hud.setSubtitle('BASE CAMP - HOME', '#38bdf8');
    this.sceneManager.baseWorld.setDealerBubbleVisible(this.spawnAuthority.canClaimDealerStock());
    this.cameraDirector.returnToBaseOverview();
    this.onboarding.updatePresentation();
  }

  enterCampaign(): void {
    this.currentMode = 'campaign';
    this.dragController.setMode('campaign');
    this.closeAllModals();

    this.sceneManager.setBaseVisible(false);
    this.sceneManager.raidWorld.hide();
    this.sceneManager.opponentCampWorld.hide();
    this.sceneManager.defenseWorld.hide();
    this.sceneManager.campaignWorld.show();

    this.dock.root.enabled = false;
    this.hud.setNavVisible(false);
    this.cameraDirector.focusOnCampaign();

    this.refreshCampaignState();
    this.campaignHUD.open();
  }

  private calculateSquadPower(summons: readonly SummonInstance[]): number {
    let total = 0;
    for (const s of summons) {
      const def = getSummonDefinition(s.definitionId);
      total += resolveSummonPowerLevel(def, s.tier);
    }
    return total;
  }

  private updateCampaignSquadPresentation(): void {
    const totalPower = this.calculateSquadPower(this.campaignPlacements.map((p) => p.summon));
    const squadCount = this.campaignPlacements.length;
    const statusNote = squadCount > 0
      ? `POWER LEVEL: ${totalPower}`
      : 'DRAG OR TAP SUMMONS TO DEPLOY (UP TO 6)';

    this.campaignHUD.setSquadInfo(
      squadCount,
      6,
      totalPower,
      statusNote
    );
    this.campaignHUD.setRoster(
      this.sceneManager.roster,
      this.campaignPlacements.map((p) => p.summon.id),
      this.campaignPlacements.map((p) => ({ summonId: p.summon.id, cell: p.cell }))
    );

    const snapshot = this.campaignController.buildCombatSnapshot(this.campaignPlacements);
    this.sceneManager.campaignWorld.loadBattleUnits(snapshot);

    const tacticalUnits = this.campaignPlacements.map((p) => ({
      summonId: p.summon.id,
      definitionId: p.summon.definitionId,
      tier: p.summon.tier,
      cell: p.cell,
      worldPos: this.sceneManager.campaignWorld.cellToWorld(p.cell.x, p.cell.z),
      entity: this.sceneManager.campaignWorld.playerUnits.get(p.summon.id)?.entity,
    }));
    this.dragController.setTacticalUnits(tacticalUnits);
  }

  private refreshCampaignState(): void {
    // Sanitize campaignPlacements against current roster (removes any merged/released ghost summons)
    this.campaignPlacements = this.campaignPlacements
      .map((p) => {
        const currentSummon = this.sceneManager.roster.find((s) => s.id === p.summon.id);
        return currentSummon ? { summon: currentSummon, cell: p.cell } : null;
      })
      .filter((p): p is { summon: SummonInstance; cell: { x: number; z: number } } => p !== null);

    const level = this.campaignController.currentLevel;
    const arc = this.campaignController.getArcForLevel(level);
    const isMiniBoss = this.campaignController.isMiniBossLevel(level);
    const isBoss = this.campaignController.isMainBossLevel(level);

    this.campaignHUD.setLevelInfo(level, arc, isMiniBoss, isBoss);
    this.updateCampaignSquadPresentation();
  }

  enterPachinko(): void {
    this.currentMode = 'pachinko';
    this.closeAllModals();

    this.dock.root.enabled = false;
    this.hud.setNavVisible(false);
    this.cameraDirector.focusOnPachinko();

    this.pachinkoHUD.updateState(
      this.spawnAuthority.getMedalsRemaining(),
      this.spawnAuthority.getShieldCharges(),
      this.spawnAuthority.isShieldActive(),
      this.spawnAuthority.getShieldRemainingTimeMs(),
      this.sceneManager.roster.length,
      36
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
    const stock = this.spawnAuthority.getDealerStock();
    this.dealerHUD.open(stock, canClaim, remainingMs);
  }

  enterDefense(): void {
    this.currentMode = 'defense';
    this.closeAllModals();

    this.sceneManager.setBaseVisible(false);
    this.sceneManager.campaignWorld.hide();
    this.sceneManager.raidWorld.hide();
    this.sceneManager.opponentCampWorld.hide();
    this.sceneManager.defenseWorld.show();

    this.dock.root.enabled = false;
    this.hud.setNavVisible(false);
    this.cameraDirector.focusOnDefense();
    this.defenseHUD.open(this.sceneManager.roster);
  }

  enterRaid(): void {
    this.currentMode = 'raid';
    this.dragController.setMode('raid');
    this.closeAllModals();

    this.sceneManager.setBaseVisible(false);
    this.sceneManager.campaignWorld.hide();
    this.sceneManager.opponentCampWorld.hide();
    this.sceneManager.defenseWorld.hide();
    this.sceneManager.raidWorld.show();

    this.dock.root.enabled = false;
    this.hud.setNavVisible(false);
    this.cameraDirector.focusOnRaid();

    this.raidRoundNumber = 1;
    this.raidRoundResults = ['pending', 'pending', 'pending'];
    this.prepareRaidRound(1);
    this.raidHUD.open();
  }

  private updateRaidRoundPresentation(roundNum: 1 | 2 | 3, slotCount: 2 | 4 | 6): void {
    this.raidHUD.setRoster(
      this.sceneManager.roster,
      this.raidPlacements.map((p) => p.summon.id),
      this.raidPlacements.map((p) => ({ summonId: p.summon.id, cell: p.cell }))
    );
    const defRoster = ['eren', 'luffy', 'naruto', 'goku', 'lelouch', 'l'];

    this.currentRaidSnapshot = {
      battleId: `raid_r${roundNum}_${Date.now()}`,
      mode: 'raid',
      units: [
        ...this.raidPlacements.map((placement, index) => {
          const summon = placement.summon;
          const def = getSummonDefinition(summon.definitionId);
          const stats = resolveTierStats(def.stats, summon.tier);

          return {
            id: `player:${summon.id}:${index}`,
            definitionId: summon.definitionId,
            side: 'player' as const,
            spawnCell: placement.cell,
            hp: stats.hp,
            atk: stats.atk,
            def: stats.def,
            attacksPerSecond: stats.attacksPerSecond,
            range: stats.range,
            moveSpeed: stats.moveSpeed,
            skill1Id: def.skills.skill1,
            skill1: null,
            basicAttackDamagePct: 0,
            skillPowerPct: 0,
            statusDurationPct: 0,
          };
        }),
        ...defRoster.slice(0, slotCount).map((defId, index) => {
          const defCells =
            slotCount === 2
              ? [{ x: 2, z: 1 }, { x: 5, z: 1 }]
              : slotCount === 4
              ? [{ x: 2, z: 1 }, { x: 5, z: 1 }, { x: 2, z: 2 }, { x: 5, z: 2 }]
              : [
                  { x: 1, z: 1 }, { x: 3, z: 1 }, { x: 5, z: 1 },
                  { x: 2, z: 2 }, { x: 4, z: 2 }, { x: 6, z: 2 },
                ];

          const def = getSummonDefinition(defId);
          const stats = resolveTierStats(def.stats, 'F');

          return {
            id: `enemy:def:${defId}:${index}`,
            definitionId: defId,
            side: 'enemy' as const,
            spawnCell: defCells[index] ?? { x: index + 1, z: 1 },
            hp: stats.hp,
            atk: stats.atk,
            def: stats.def,
            attacksPerSecond: stats.attacksPerSecond,
            range: stats.range,
            moveSpeed: stats.moveSpeed,
            skill1Id: def.skills.skill1,
            skill1: null,
            basicAttackDamagePct: 0,
            skillPowerPct: 0,
            statusDurationPct: 0,
          };
        }),
      ],
    };

    this.sceneManager.raidWorld.loadRoundUnits(this.currentRaidSnapshot);

    const tacticalUnits = this.raidPlacements.map((p) => ({
      summonId: p.summon.id,
      definitionId: p.summon.definitionId,
      tier: p.summon.tier,
      cell: p.cell,
      worldPos: this.sceneManager.raidWorld.cellToWorld(p.cell.x, p.cell.z),
      entity: this.sceneManager.raidWorld.playerUnits.get(p.summon.id)?.entity,
    }));
    this.dragController.setTacticalUnits(tacticalUnits);
  }

  private prepareRaidRound(roundNum: 1 | 2 | 3): void {
    const slotCount = roundNum === 1 ? 2 : roundNum === 2 ? 4 : 6;
    const defaultCells = DEFAULT_RAID_CELLS[slotCount];
    this.raidPlacements = this.sceneManager.roster.slice(0, slotCount).map((summon, idx) => ({
      summon,
      cell: defaultCells[idx] ?? { x: idx + 1, z: 6 },
    }));
    this.raidHUD.setRound(roundNum, slotCount, this.raidRoundResults);
    this.updateRaidRoundPresentation(roundNum, slotCount);
  }

  enterOpponentCamp(): void {
    this.currentMode = 'opponentCamp';
    this.dragController.setMode('opponentCamp');
    this.closeAllModals();

    this.sceneManager.setBaseVisible(false);
    this.sceneManager.campaignWorld.hide();
    this.sceneManager.raidWorld.hide();
    this.sceneManager.defenseWorld.hide();
    this.sceneManager.opponentCampWorld.show();
    this.sceneManager.opponentCampWorld.loadOpponentCamp();
    this.dragController.setOpponentSummons(this.sceneManager.opponentCampWorld.opponentSummons);

    this.dock.root.enabled = false;
    this.hud.setNavVisible(false);
    this.cameraDirector.focusOnOpponentCamp();
    this.opponentCampHUD.open();
  }

  private closeAllModals(): void {
    if (this.inspector.isOpen) this.inspector.close(true);
    if (this.pachinkoHUD.isOpen) this.pachinkoHUD.close(true);
    if (this.raidHUD.isOpen) this.raidHUD.close(true);
    if (this.campaignHUD.isOpen) this.campaignHUD.close(true);
    if (this.dealerHUD.isOpen) this.dealerHUD.close(true);
    if (this.defenseHUD.isOpen) this.defenseHUD.close(true);
    if (this.opponentCampHUD.isOpen) this.opponentCampHUD.close(true);
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

    // Synchronize Dealer Floating Harvest Bubble in Base Camp
    if (this.currentMode === 'base') {
      this.sceneManager.baseWorld.setDealerBubbleVisible(this.spawnAuthority.canClaimDealerStock());
    }
  }

  private onResize(): void {
    this.app.resizeCanvas();
  }

  public async resetGame(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      if (typeof fetch !== 'undefined') {
        await fetch('http://127.0.0.1:54321/api/player/reset', { method: 'POST' }).catch(() => {});
      }
    } catch {
      // Offline fallback
    }

    this.spawnAuthority.reset();
    this.sceneManager.resetToStarters();
    this.campaignController.reset();
    this.onboarding.reset();
    this.campaignPlacements = [];
    this.raidPlacements = [];

    this.hud.updateMedalsDisplay(this.spawnAuthority.getMedalsRemaining());
    this.hud.updateShieldDisplay(this.spawnAuthority.isShieldActive(), 0);
    this.dock.setRoster(this.sceneManager.roster, this.sceneManager.getPlacements());

    if (this.onboarding.phase === 'CAMPAIGN') {
      this.enterCampaign();
    } else {
      this.enterBase();
    }
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
