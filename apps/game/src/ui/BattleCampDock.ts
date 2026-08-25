import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import type { CampPlacement, SummonInstance } from '@psyblr/contracts';
import { getSummonDefinition } from '@psyblr/game-content';

export type SummonCardClickCallback = (summon: SummonInstance) => void;
export type SummonCardDragCallback = (summon: SummonInstance, clientX: number, clientY: number) => void;

export class BattleCampDock {
  public root: Entity;
  private trayBg: Entity;
  private cardsContainer: Entity;
  private cardEntities: { root: Entity; summonId: string; statusText: Entity }[] = [];

  public onCardClick?: SummonCardClickCallback;
  public onCardDragStart?: SummonCardDragCallback;

  constructor(
    private app: Application,
    private fontAsset: Asset,
    screenEntity: Entity,
    private hudLayer?: Layer
  ) {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};

    // Root Dock Group anchored at Bottom-Center
    this.root = new Entity('BattleCampDock_Root');
    this.root.enabled = false;
    this.root.setLocalPosition(0, 18, 0);
    this.root.addComponent('element', {
      type: 'group',
      anchor: [0.5, 0, 0.5, 0], // Bottom-Center
      pivot: [0.5, 0],
      width: 620,
      height: 100,
      useInput: true,
      ...layerOpt,
    });
    screenEntity.addChild(this.root);

    // Tray Glassmorphism Background
    this.trayBg = new Entity('DockTrayBackdrop');
    this.trayBg.addComponent('element', {
      type: 'image',
      anchor: [0, 0, 1, 1],
      pivot: [0.5, 0.5],
      color: new Color(0.05, 0.09, 0.18), // Deep navy
      opacity: 0.90,
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.trayBg);

    // Gold Top Accent Trim Line
    const topTrim = new Entity('DockTopTrim');
    topTrim.setLocalPosition(0, 48, 0);
    topTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 620,
      height: 2,
      color: new Color(0.96, 0.62, 0.04),
      ...layerOpt,
    });
    this.trayBg.addChild(topTrim);

    // Container for horizontal list of cards
    this.cardsContainer = new Entity('CardsContainer');
    this.cardsContainer.addComponent('element', {
      type: 'group',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 600,
      height: 80,
      ...layerOpt,
    });
    this.root.addChild(this.cardsContainer);
  }

  setRoster(
    roster: readonly SummonInstance[],
    placements: readonly CampPlacement[]
  ): void {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};

    // Clear old card entities
    for (const item of this.cardEntities) {
      item.root.destroy();
    }
    this.cardEntities = [];

    const cardWidth = 88;
    const cardGap = 12;
    const count = roster.length;
    const totalWidth = count * cardWidth + (count - 1) * cardGap;
    const startX = -totalWidth / 2 + cardWidth / 2;

    roster.forEach((summon, index) => {
      const def = getSummonDefinition(summon.definitionId);
      const placement = placements.find((p) => p.summonInstanceId === summon.id);
      const isDeployed = placement !== undefined;

      const posX = startX + index * (cardWidth + cardGap);

      // Card Root (Frosted dark card)
      const cardRoot = new Entity(`DockCard_${summon.id}`);
      cardRoot.setLocalPosition(posX, 0, 0);
      cardRoot.addComponent('element', {
        type: 'image',
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        width: cardWidth,
        height: 76,
        color: isDeployed ? new Color(0.06, 0.10, 0.20) : new Color(0.09, 0.16, 0.30),
        opacity: 0.95,
        useInput: true,
        ...layerOpt,
      });
      this.cardsContainer.addChild(cardRoot);

      // Card Top Border Highlight
      const cardTrim = new Entity('CardTrim');
      cardTrim.setLocalPosition(0, 36, 0);
      cardTrim.addComponent('element', {
        type: 'image',
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        width: cardWidth - 4,
        height: 2,
        color: isDeployed ? new Color(0.96, 0.62, 0.04) : new Color(0.22, 0.74, 0.97),
        ...layerOpt,
      });
      cardRoot.addChild(cardTrim);

      // Name & Tier
      const nameText = new Entity('CardName');
      nameText.setLocalPosition(0, 14, 0);
      nameText.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 13,
        text: `${def.displayName.toUpperCase()} [${summon.tier}]`,
        color: new Color(1.0, 0.82, 0.2), // Bright Gold
        autoWidth: false,
        autoHeight: false,
        width: cardWidth,
        height: 24,
        alignment: [0.5, 0.5],
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        ...layerOpt,
      });
      cardRoot.addChild(nameText);

      // Status indicator
      const statusText = new Entity('CardStatus');
      statusText.setLocalPosition(0, -12, 0);
      statusText.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 11,
        text: isDeployed ? `CAMP (${placement.cell.x},${placement.cell.y})` : 'READY',
        color: isDeployed ? new Color(0.75, 0.90, 1.0) : new Color(0.35, 0.98, 0.6),
        autoWidth: false,
        autoHeight: false,
        width: cardWidth,
        height: 20,
        alignment: [0.5, 0.5],
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        ...layerOpt,
      });
      cardRoot.addChild(statusText);

      // Tap card
      const onCard = () => {
        this.onCardClick?.(summon);
      };
      cardRoot.element?.on('click', onCard);
      cardRoot.element?.on('touchend', onCard);

      this.cardEntities.push({
        root: cardRoot,
        summonId: summon.id,
        statusText,
      });
    });
  }

  destroy(): void {
    this.root.destroy();
  }
}
