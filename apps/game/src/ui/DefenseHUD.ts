import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import type { AudioDirector } from '../presentation/AudioDirector';
import type { SummonInstance } from '@psyblr/contracts';
import { getSummonDefinition } from '@psyblr/game-content';

export class DefenseHUD {
  public root: Entity;
  public isOpen: boolean = false;

  private backdropCatcher: Entity;
  private panelBg: Entity;
  private headerText: Entity;
  private subText: Entity;
  private closeXBtn: Entity;
  private r1Container: Entity;
  private r2Container: Entity;
  private r3Container: Entity;
  private autoDeployBtn: Entity;
  private saveBtn: Entity;
  private returnBtn: Entity;
  private rosterTrayContainer: Entity;

  // Defense assignments (instance IDs)
  public r1Defenders: (string | null)[] = [null, null];
  public r2Defenders: (string | null)[] = [null, null, null, null];
  public r3Defenders: (string | null)[] = [null, null, null, null, null, null];

  public selectedSlot: { round: 1 | 2 | 3; index: number } | null = null;
  private currentRoster: readonly SummonInstance[] = [];

  public onSaveDefense?: (defense: { r1: string[]; r2: string[]; r3: string[] }) => void;
  public onClose?: () => void;

  constructor(
    private app: Application,
    private audio: AudioDirector,
    private fontAsset: Asset,
    screenEntity: Entity,
    private hudLayer?: Layer
  ) {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};

    this.root = new Entity('DefenseHUD_Root');
    this.root.enabled = false;
    screenEntity.addChild(this.root);
    this.root.setLocalPosition(0, 0, 0);

    // 1. Fullscreen transparent backdrop click catcher
    this.backdropCatcher = new Entity('DefenseBackdropCatcher');
    this.root.addChild(this.backdropCatcher);
    this.backdropCatcher.addComponent('element', {
      type: 'image',
      anchor: [0, 0, 1, 1],
      pivot: [0.5, 0.5],
      color: new Color(0, 0, 0),
      opacity: 0.65,
      useInput: true,
      ...layerOpt,
    });
    this.backdropCatcher.setLocalPosition(0, 0, 0);
    this.backdropCatcher.element?.on('click', () => this.close());

    // 2. Center Modal Panel (840x580)
    this.panelBg = new Entity('DefensePanelBackdrop');
    this.root.addChild(this.panelBg);
    this.panelBg.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 840,
      height: 580,
      color: new Color(0.04, 0.07, 0.16),
      opacity: 0.98,
      useInput: true,
      ...layerOpt,
    });
    this.panelBg.setLocalPosition(0, 0, 0);

    // Top Indigo Trim
    const topTrim = new Entity('DefTopTrim');
    this.panelBg.addChild(topTrim);
    topTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 840,
      height: 4,
      color: new Color(0.4, 0.45, 1.0),
      ...layerOpt,
    });
    topTrim.setLocalPosition(0, 288, 0);

    // Top-Right [X] Close Button
    this.closeXBtn = new Entity('DefCloseXBtn');
    this.panelBg.addChild(this.closeXBtn);
    this.closeXBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 36,
      height: 36,
      color: new Color(0.15, 0.2, 0.35),
      useInput: true,
      ...layerOpt,
    });
    this.closeXBtn.setLocalPosition(385, 250, 0);

    const xText = new Entity('DefCloseXText');
    this.closeXBtn.addChild(xText);
    xText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 16,
      text: 'X',
      color: new Color(0.9, 0.95, 1),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    xText.setLocalPosition(0, 0, 0);

    this.closeXBtn.element?.on('click', () => this.close());
    this.closeXBtn.element?.on('touchend', () => this.close());

    // Header Title (Y: +250)
    this.headerText = new Entity('DefTitle');
    this.panelBg.addChild(this.headerText);
    this.headerText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 18,
      text: 'DEFENSE PODIUM • RAID DEFENSE FORMATION',
      color: new Color(0.6, 0.65, 1.0),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.headerText.setLocalPosition(0, 250, 0);

    // Subtitle (Y: +220)
    this.subText = new Entity('DefSub');
    this.panelBg.addChild(this.subText);
    this.subText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 11,
      text: 'Assign your defenders across 3 rounds (2v2, 4v4, 6v6). Tap a slot then tap a summon below to assign.',
      color: new Color(0.7, 0.75, 0.9),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.subText.setLocalPosition(0, 220, 0);

    // Round 1 Slot Container (2 Units) (Y: +160)
    this.r1Container = this.createRoundRow('Round 1 (2 Defenders)', 160, 1, 2);

    // Round 2 Slot Container (4 Units) (Y: +85)
    this.r2Container = this.createRoundRow('Round 2 (4 Defenders)', 85, 2, 4);

    // Round 3 Slot Container (6 Units) (Y: +10)
    this.r3Container = this.createRoundRow('Round 3 (6 Defenders)', 10, 3, 6);

    // Bottom Available Roster Tray Label (Y: -65)
    const rosterLabel = new Entity('DefRosterTrayLabel');
    this.panelBg.addChild(rosterLabel);
    rosterLabel.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: 'AVAILABLE SUMMONS IN CAMP (TAP TO DEPLOY INTO SELECTED SLOT):',
      color: new Color(0.96, 0.62, 0.04),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    rosterLabel.setLocalPosition(0, -65, 0);

    // Roster Tray Container (Y: -125)
    this.rosterTrayContainer = new Entity('DefRosterTray');
    this.panelBg.addChild(this.rosterTrayContainer);
    this.rosterTrayContainer.addComponent('element', {
      type: 'group',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 780,
      height: 60,
      ...layerOpt,
    });
    this.rosterTrayContainer.setLocalPosition(0, -125, 0);

    // Bottom Control Buttons Bar (Y: -220)
    // 1. [AUTO-DEPLOY] Button
    this.autoDeployBtn = new Entity('DefAutoDeployBtn');
    this.panelBg.addChild(this.autoDeployBtn);
    this.autoDeployBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 210,
      height: 44,
      color: new Color(0.12, 0.35, 0.65),
      useInput: true,
      ...layerOpt,
    });
    this.autoDeployBtn.setLocalPosition(-250, -220, 0);

    const autoText = new Entity('AutoDeployText');
    this.autoDeployBtn.addChild(autoText);
    autoText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '⚡ AUTO-DEPLOY ALL',
      color: new Color(1, 1, 1),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    autoText.setLocalPosition(0, 0, 0);

    this.autoDeployBtn.element?.on('click', () => this.autoDeployAll());
    this.autoDeployBtn.element?.on('touchend', () => this.autoDeployAll());

    // 2. [LOCK & SAVE DEFENSE] Button
    this.saveBtn = new Entity('SaveDefBtn');
    this.panelBg.addChild(this.saveBtn);
    this.saveBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 230,
      height: 44,
      color: new Color(0.35, 0.4, 0.95),
      useInput: true,
      ...layerOpt,
    });
    this.saveBtn.setLocalPosition(0, -220, 0);

    const saveText = new Entity('SaveBtnText');
    this.saveBtn.addChild(saveText);
    saveText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'LOCK & SAVE DEFENSE',
      color: new Color(1, 1, 1),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    saveText.setLocalPosition(0, 0, 0);

    const onSave = () => {
      this.audio.playInspectorOpen();
      this.onSaveDefense?.({
        r1: this.r1Defenders.filter(Boolean) as string[],
        r2: this.r2Defenders.filter(Boolean) as string[],
        r3: this.r3Defenders.filter(Boolean) as string[],
      });
      this.close();
    };
    this.saveBtn.element?.on('click', onSave);
    this.saveBtn.element?.on('touchend', onSave);

    // 3. [RETURN TO BASE CAMP] Button
    this.returnBtn = new Entity('DefReturnBtn');
    this.panelBg.addChild(this.returnBtn);
    this.returnBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 210,
      height: 44,
      color: new Color(0.15, 0.2, 0.32),
      useInput: true,
      ...layerOpt,
    });
    this.returnBtn.setLocalPosition(250, -220, 0);

    const retText = new Entity('DefReturnText');
    this.returnBtn.addChild(retText);
    retText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '← RETURN TO BASE',
      color: new Color(0.85, 0.9, 0.98),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    retText.setLocalPosition(0, 0, 0);

    this.returnBtn.element?.on('click', () => this.close());
    this.returnBtn.element?.on('touchend', () => this.close());

    // ESC key listener to exit
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  private createRoundRow(title: string, yPos: number, roundNum: 1 | 2 | 3, slotCount: number): Entity {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};
    const row = new Entity(`Row_${roundNum}`);
    this.panelBg.addChild(row);
    row.addComponent('element', {
      type: 'group',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 780,
      height: 60,
      ...layerOpt,
    });
    row.setLocalPosition(0, yPos, 0);

    const label = new Entity('RowLabel');
    row.addChild(label);
    label.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: title,
      color: new Color(0.8, 0.85, 0.95),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    label.setLocalPosition(-280, 0, 0);

    const cardWidth = 72;
    const cardGap = 10;
    const totalW = slotCount * cardWidth + (slotCount - 1) * cardGap;
    const startX = 60 - totalW / 2 + cardWidth / 2;

    for (let i = 0; i < slotCount; i++) {
      const slot = new Entity(`Slot_${i}`);
      row.addChild(slot);
      slot.addComponent('element', {
        type: 'image',
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        width: cardWidth,
        height: 48,
        color: new Color(0.08, 0.12, 0.22),
        useInput: true,
        ...layerOpt,
      });
      slot.setLocalPosition(startX + i * (cardWidth + cardGap), 0, 0);

      const slotText = new Entity('SlotText');
      slot.addChild(slotText);
      slotText.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 10,
        text: `SLOT ${i + 1}`,
        color: new Color(0.45, 0.55, 0.7),
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        ...layerOpt,
      });
      slotText.setLocalPosition(0, 0, 0);

      const onSlotClick = () => {
        this.selectedSlot = { round: roundNum, index: i };
        this.audio.playInspectorOpen();
        this.refreshVisuals();
      };
      slot.element?.on('click', onSlotClick);
      slot.element?.on('touchend', onSlotClick);
    }

    return row;
  }

  private buildRosterTray(): void {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};
    const children = [...this.rosterTrayContainer.children];
    for (const child of children) {
      child.destroy();
    }

    const cardWidth = 84;
    const cardGap = 8;
    const count = this.currentRoster.length;
    const totalW = count * cardWidth + (count - 1) * cardGap;
    const startX = -totalW / 2 + cardWidth / 2;

    this.currentRoster.forEach((summon, idx) => {
      const def = getSummonDefinition(summon.definitionId);
      const card = new Entity(`RosterCard_${summon.id}`);
      this.rosterTrayContainer.addChild(card);
      card.addComponent('element', {
        type: 'image',
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        width: cardWidth,
        height: 52,
        color: new Color(0.1, 0.16, 0.28),
        useInput: true,
        ...layerOpt,
      });
      card.setLocalPosition(startX + idx * (cardWidth + cardGap), 0, 0);

      const cardText = new Entity('CardText');
      card.addChild(cardText);
      cardText.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 10,
        text: `${def.displayName.slice(0, 5)}\n[${summon.tier}]`,
        color: new Color(0.96, 0.62, 0.04),
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        ...layerOpt,
      });
      cardText.setLocalPosition(0, 0, 0);

      const onCardClick = () => {
        if (!this.selectedSlot) {
          this.selectedSlot = { round: 1, index: 0 };
        }

        const { round, index } = this.selectedSlot;
        if (round === 1) this.r1Defenders[index] = summon.id;
        else if (round === 2) this.r2Defenders[index] = summon.id;
        else if (round === 3) this.r3Defenders[index] = summon.id;

        this.audio.playInspectorOpen();
        this.refreshVisuals();
      };
      card.element?.on('click', onCardClick);
      card.element?.on('touchend', onCardClick);
    });
  }

  autoDeployAll(): void {
    const sorted = [...this.currentRoster];
    this.r1Defenders = [sorted[0]?.id ?? null, sorted[1]?.id ?? null];
    this.r2Defenders = [sorted[0]?.id ?? null, sorted[1]?.id ?? null, sorted[2]?.id ?? null, sorted[3]?.id ?? null];
    this.r3Defenders = [
      sorted[0]?.id ?? null,
      sorted[1]?.id ?? null,
      sorted[2]?.id ?? null,
      sorted[3]?.id ?? null,
      sorted[4]?.id ?? null,
      sorted[5]?.id ?? null,
    ];
    this.audio.playInspectorOpen();
    this.refreshVisuals();
  }

  private refreshVisuals(): void {
    this.updateRoundSlots(this.r1Container, 1, this.r1Defenders, 2);
    this.updateRoundSlots(this.r2Container, 2, this.r2Defenders, 4);
    this.updateRoundSlots(this.r3Container, 3, this.r3Defenders, 6);
  }

  private updateRoundSlots(
    row: Entity,
    roundNum: 1 | 2 | 3,
    assignedIds: (string | null)[],
    slotCount: number
  ): void {
    for (let i = 0; i < slotCount; i++) {
      const slot = row.findByName(`Slot_${i}`) as Entity | null;
      if (!slot) continue;
      const slotText = slot.findByName('SlotText') as Entity | null;
      if (!slotText?.element) continue;

      const isSelected = this.selectedSlot?.round === roundNum && this.selectedSlot?.index === i;
      const summonId = assignedIds[i];
      const summon = summonId ? this.currentRoster.find((r) => r.id === summonId) : null;

      if (summon) {
        const def = getSummonDefinition(summon.definitionId);
        slotText.element.text = `${def.displayName.slice(0, 4)} [${summon.tier}]`;
        slotText.element.color = new Color(0.96, 0.62, 0.04);
        if (slot.element) {
          slot.element.color = isSelected ? new Color(0.25, 0.45, 0.8) : new Color(0.12, 0.2, 0.35);
        }
      } else {
        slotText.element.text = `SLOT ${i + 1}`;
        slotText.element.color = new Color(0.45, 0.55, 0.7);
        if (slot.element) {
          slot.element.color = isSelected ? new Color(0.2, 0.35, 0.6) : new Color(0.08, 0.12, 0.22);
        }
      }
    }
  }

  open(roster: readonly SummonInstance[] = []): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.currentRoster = roster;
    this.selectedSlot = { round: 1, index: 0 };

    if (this.r1Defenders.every((id) => id === null)) {
      this.autoDeployAll();
    } else {
      this.refreshVisuals();
    }

    this.buildRosterTray();
    this.root.enabled = true;
    this.audio.playInspectorOpen();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.enabled = false;
    this.audio.playInspectorClose();
    this.onClose?.();
  }

  destroy(): void {
    this.root.destroy();
  }
}
