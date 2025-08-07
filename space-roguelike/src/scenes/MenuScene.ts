import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu')
  }

  create(): void {
    const { width, height } = this.scale

    this.add.text(width / 2, height * 0.3, 'SPACE ROGUELIKE', {
      fontFamily: 'sans-serif',
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5)

    const startBtn = this.add.text(width / 2, height * 0.5, 'Играть', {
      fontFamily: 'sans-serif',
      fontSize: '40px',
      color: '#00e5ff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    const metaBtn = this.add.text(width / 2, height * 0.62, 'Мета‑прогресс', {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      color: '#a0ffa0'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    startBtn.on('pointerup', () => this.scene.start('Game'))
    metaBtn.on('pointerup', () => this.scene.start('Meta'))

    this.add.text(width / 2, height * 0.9, 'Управление: тач/перетаскивание\nКорабль стреляет автоматически', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#cccccc',
      align: 'center'
    }).setOrigin(0.5)
  }
}