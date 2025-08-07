import Phaser from 'phaser'
import { loadMeta, saveMeta, type MetaProgress } from '../state/meta'

export class MetaScene extends Phaser.Scene {
  private meta!: MetaProgress

  constructor() {
    super('Meta')
  }

  create(): void {
    const { width, height } = this.scale
    this.meta = loadMeta()

    this.add.text(width / 2, height * 0.15, 'Мета‑прогресс', {
      fontFamily: 'sans-serif',
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.25, `Старпыль: ${this.meta.currency}`, {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#ffd166'
    }).setOrigin(0.5)

    const items = [
      { key: 'baseDamage', name: 'Базовый урон', step: 1, price: 20 },
      { key: 'fireRate', name: 'Скорострельность', step: 0.05, price: 25 },
      { key: 'maxHp', name: 'Макс. HP', step: 5, price: 30 },
      { key: 'magnet', name: 'Магнит радиус', step: 10, price: 15 }
    ] as const

    items.forEach((item, i) => {
      const level = this.meta[item.key]
      const y = height * 0.35 + i * 90
      this.add.text(60, y, `${item.name}: ${level}`, { fontSize: '28px', color: '#ffffff' })
      const btn = this.add.text(width - 60, y, `Купить (${item.price})`, {
        fontSize: '26px', color: this.meta.currency >= item.price ? '#a0ffa0' : '#888888'
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true })

      btn.on('pointerup', () => {
        if (this.meta.currency < item.price) return
        this.meta.currency -= item.price
        const k = item.key as keyof MetaProgress
        // @ts-ignore safe numeric field
        this.meta[k] = Number((Number(this.meta[k]) + Number(item.step)).toFixed(2))
        saveMeta(this.meta)
        this.scene.restart()
      })
    })

    const back = this.add.text(width / 2, height * 0.9, 'Назад', {
      fontSize: '32px', color: '#00e5ff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    back.on('pointerup', () => this.scene.start('Menu'))
  }
}