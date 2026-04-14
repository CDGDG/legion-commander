import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GameState, SoldierType } from '../core/GameState';
import { Player } from '../entities/Player';

const STYLE = new TextStyle({ fontFamily: 'monospace', fontSize: 14, fill: 0xffffff });
const TITLE_STYLE = new TextStyle({ fontFamily: 'monospace', fontSize: 20, fill: 0xffd700, fontWeight: 'bold' });

const SYNERGY_COLORS: Record<SoldierType, number> = {
  swordsman: 0x3366cc, spearman: 0x2299aa, archer: 0x33aa33, mage: 0x8833cc, priest: 0xccaa22,
};

export class HUD {
  container: Container;

  // Bottom HP bar
  private hpBarContainer: Container;
  private hpBarBg: Graphics;
  private hpBar: Graphics;
  private hpText: Text;

  // Top info
  private infoText: Text;
  private synergyContainer: Container;
  private roomText: Text;
  private timerText: Text;

  // Center message
  private centerMsg: Text;
  private centerMsgTimer = 0;

  // Reward UI
  private rewardContainer: Container;

  // Dash cooldown indicator
  private dashIndicator: Graphics;

  constructor(screenW: number, screenH: number) {
    this.container = new Container();
    this.container.zIndex = 1000;

    // === BOTTOM HP BAR ===
    this.hpBarContainer = new Container();
    this.container.addChild(this.hpBarContainer);

    this.hpBarBg = new Graphics();
    this.hpBarContainer.addChild(this.hpBarBg);

    this.hpBar = new Graphics();
    this.hpBarContainer.addChild(this.hpBar);

    this.hpText = new Text('', new TextStyle({
      fontFamily: 'monospace', fontSize: 16, fill: 0xffffff, fontWeight: 'bold',
      dropShadow: true, dropShadowColor: 0x000000, dropShadowDistance: 1,
    }));
    this.hpText.anchor.set(0.5);
    this.hpBarContainer.addChild(this.hpText);

    // Dash indicator
    this.dashIndicator = new Graphics();
    this.container.addChild(this.dashIndicator);

    // === TOP INFO ===
    this.infoText = new Text('', STYLE);
    this.infoText.x = 10; this.infoText.y = 10;
    this.container.addChild(this.infoText);

    this.synergyContainer = new Container();
    this.synergyContainer.y = 30;
    this.container.addChild(this.synergyContainer);

    this.roomText = new Text('', TITLE_STYLE);
    this.roomText.anchor.set(0.5, 0);
    this.container.addChild(this.roomText);

    this.timerText = new Text('', STYLE);
    this.timerText.anchor.set(1, 0);
    this.container.addChild(this.timerText);

    // Center message
    this.centerMsg = new Text('', new TextStyle({
      fontFamily: 'monospace', fontSize: 36, fill: 0xffd700, fontWeight: 'bold',
      dropShadow: true, dropShadowColor: 0x000000, dropShadowDistance: 2, dropShadowBlur: 4,
    }));
    this.centerMsg.anchor.set(0.5);
    this.centerMsg.visible = false;
    this.container.addChild(this.centerMsg);

    // Reward UI
    this.rewardContainer = new Container();
    this.rewardContainer.visible = false;
    this.container.addChild(this.rewardContainer);
  }

  showCenterMessage(msg: string, duration = 2): void {
    this.centerMsg.text = msg;
    this.centerMsg.visible = true;
    this.centerMsgTimer = duration;
  }

  update(player: Player, state: GameState, screenW: number, screenH: number, enemyCount: number, dt: number): void {
    const barH = 32;
    const barY = screenH - barH;
    const padding = 8;

    // HP bar background
    this.hpBarBg.clear();
    this.hpBarBg.beginFill(0x111111);
    this.hpBarBg.drawRect(0, barY, screenW, barH);
    this.hpBarBg.endFill();
    // Border top
    this.hpBarBg.beginFill(0x333333);
    this.hpBarBg.drawRect(0, barY, screenW, 2);
    this.hpBarBg.endFill();

    // HP fill
    this.hpBar.clear();
    const hpRatio = Math.max(0, player.hp / player.maxHp);
    const hpColor = hpRatio > 0.5 ? 0x22aa44 : hpRatio > 0.25 ? 0xccaa22 : 0xcc2222;
    const fillW = (screenW - padding * 2) * hpRatio;

    // Main bar
    this.hpBar.beginFill(hpColor);
    this.hpBar.drawRoundedRect(padding, barY + 5, fillW, barH - 10, 3);
    this.hpBar.endFill();

    // Highlight stripe
    this.hpBar.beginFill(0xffffff, 0.15);
    this.hpBar.drawRoundedRect(padding, barY + 5, fillW, (barH - 10) * 0.4, 3);
    this.hpBar.endFill();

    // HP text
    this.hpText.text = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    this.hpText.x = screenW / 2;
    this.hpText.y = barY + barH / 2;

    // Dash cooldown (small bar above HP)
    this.dashIndicator.clear();
    const dashRatio = player.dashCooldown > 0 ? 1 - (player.dashCooldown / player.dashCooldownMax) : 1;
    if (dashRatio < 1) {
      this.dashIndicator.beginFill(0x4488ff, 0.6);
      this.dashIndicator.drawRect(padding, barY - 6, (screenW - padding * 2) * dashRatio, 4);
      this.dashIndicator.endFill();
    } else {
      this.dashIndicator.beginFill(0x4488ff, 0.3);
      this.dashIndicator.drawRect(padding, barY - 6, screenW - padding * 2, 4);
      this.dashIndicator.endFill();
    }

    // Info
    this.infoText.text = `Room ${state.room}  Army: ${state.totalSoldiers}  Enemies: ${enemyCount}`;

    // Synergy indicators
    this.synergyContainer.removeChildren();
    let sx = 10;
    for (const type of ['swordsman', 'spearman', 'archer', 'mage', 'priest'] as SoldierType[]) {
      const count = state.soldierCounts[type];
      if (count === 0) continue;
      const color = SYNERGY_COLORS[type];

      const g = new Graphics();
      g.beginFill(color, 0.7);
      g.drawRoundedRect(0, 0, 52, 18, 3);
      g.endFill();

      if (count >= 3) {
        g.lineStyle(1, 0xffd700, 0.8);
        g.drawRoundedRect(-1, -1, 54, 20, 4);
        g.lineStyle(0);
      }

      const label = new Text(`${type.slice(0, 3).toUpperCase()} ${count}`, new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0xffffff }));
      label.x = 4; label.y = 3;

      const c = new Container();
      c.x = sx;
      c.addChild(g);
      c.addChild(label);
      this.synergyContainer.addChild(c);
      sx += 58;
    }

    // Room text
    this.roomText.text = state.isBossRoom ? `BOSS - Room ${state.room}` : `Room ${state.room}`;
    this.roomText.x = screenW / 2;
    this.roomText.y = 8;

    // Timer
    const mins = Math.floor(state.totalTime / 60);
    const secs = Math.floor(state.totalTime % 60);
    this.timerText.text = `${mins}:${secs.toString().padStart(2, '0')}`;
    this.timerText.x = screenW - 10;
    this.timerText.y = 10;

    // Center message
    if (this.centerMsgTimer > 0) {
      this.centerMsgTimer -= dt;
      this.centerMsg.x = screenW / 2;
      this.centerMsg.y = screenH / 2 - 60;
      this.centerMsg.alpha = Math.min(1, this.centerMsgTimer * 2);
      this.centerMsg.scale.set(1 + Math.max(0, 0.3 - this.centerMsgTimer * 0.3));
      if (this.centerMsgTimer <= 0) this.centerMsg.visible = false;
    }
  }

  showReward(
    title: string,
    choices: { label: string; desc: string; color: number; action: () => void }[],
    screenW: number,
    screenH: number,
    onDone: () => void
  ): void {
    this.rewardContainer.removeChildren();
    this.rewardContainer.visible = true;

    const overlay = new Graphics();
    overlay.beginFill(0x000000, 0.6);
    overlay.drawRect(0, 0, screenW, screenH);
    overlay.endFill();
    overlay.eventMode = 'static';
    this.rewardContainer.addChild(overlay);

    const titleText = new Text(title, new TextStyle({
      fontFamily: 'monospace', fontSize: 28, fill: 0xffd700, fontWeight: 'bold',
      dropShadow: true, dropShadowColor: 0x000000, dropShadowDistance: 2,
    }));
    titleText.anchor.set(0.5);
    titleText.x = screenW / 2;
    titleText.y = screenH / 2 - 110;
    this.rewardContainer.addChild(titleText);

    const cardW = 170;
    const cardH = 100;
    const gap = 20;
    const totalW = choices.length * cardW + (choices.length - 1) * gap;
    const startX = screenW / 2 - totalW / 2;

    choices.forEach((choice, i) => {
      const card = new Container();
      card.x = startX + i * (cardW + gap);
      card.y = screenH / 2 - 30;

      // Card background
      const bg = new Graphics();
      bg.beginFill(0x111122);
      bg.lineStyle(2, choice.color, 0.8);
      bg.drawRoundedRect(0, 0, cardW, cardH, 8);
      bg.endFill();
      // Inner glow
      bg.beginFill(choice.color, 0.08);
      bg.drawRoundedRect(4, 4, cardW - 8, cardH - 8, 6);
      bg.endFill();

      bg.eventMode = 'static';
      bg.cursor = 'pointer';
      bg.on('pointerdown', () => { choice.action(); this.hideReward(); onDone(); });
      bg.on('pointerover', () => { card.scale.set(1.06); bg.tint = 0xccccff; });
      bg.on('pointerout', () => { card.scale.set(1); bg.tint = 0xffffff; });
      card.addChild(bg);

      // Icon
      const icon = new Graphics();
      icon.beginFill(choice.color, 0.9);
      icon.drawCircle(cardW / 2, 24, 14);
      icon.endFill();
      icon.beginFill(0xffffff, 0.2);
      icon.drawCircle(cardW / 2 - 3, 21, 5);
      icon.endFill();
      card.addChild(icon);

      const label = new Text(choice.label, new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: 0xffffff, fontWeight: 'bold' }));
      label.anchor.set(0.5); label.x = cardW / 2; label.y = 50;
      card.addChild(label);

      const desc = new Text(choice.desc, new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0xaaaaaa, wordWrap: true, wordWrapWidth: cardW - 16 }));
      desc.anchor.set(0.5, 0); desc.x = cardW / 2; desc.y = 65;
      card.addChild(desc);

      this.rewardContainer.addChild(card);
    });
  }

  hideReward(): void {
    this.rewardContainer.visible = false;
    this.rewardContainer.removeChildren();
  }

  get isRewardVisible(): boolean {
    return this.rewardContainer.visible;
  }
}
