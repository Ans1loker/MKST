import Phaser from 'phaser'
import { loadMeta, saveMeta } from '../state/meta'

type UpgradeType = 'damage' | 'firerate' | 'shield' | 'speed' | 'magnet'

type PlayerStats = {
  hp: number
  maxHp: number
  damage: number
  fireIntervalMs: number
  speed: number
  magnetRadius: number
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody
  private playerStats!: PlayerStats
  private lastShotAt = 0
  private pointerId: number | null = null
  private score = 0
  private starfield!: Phaser.GameObjects.TileSprite
  private enemies!: Phaser.Physics.Arcade.Group
  private bullets!: Phaser.Physics.Arcade.Group
  private upgrades!: Phaser.Physics.Arcade.Group
  private boss?: Phaser.Types.Physics.Arcade.ImageWithDynamicBody
  private bossHpText?: Phaser.GameObjects.Text
  private uiText!: Phaser.GameObjects.Text
  private gameOver = false
  private meta = loadMeta()

  constructor() {
    super('Game')
  }

  create(): void {
    const { width, height } = this.scale

    // Background
    this.starfield = this.add.tileSprite(0, 0, width, height, '').setOrigin(0)
    this.drawStarfield()

    // Player
    this.player = this.physics.add.image(width / 2, height * 0.8, '')
    this.drawPlayer(this.player)
    this.player.setCollideWorldBounds(true)

    this.playerStats = {
      hp: 10 + this.meta.maxHp,
      maxHp: 10 + this.meta.maxHp,
      damage: 1 + this.meta.baseDamage,
      fireIntervalMs: Math.max(90, 220 - this.meta.fireRate * 120),
      speed: 450,
      magnetRadius: 80 + this.meta.magnet
    }

    // Groups
    this.enemies = this.physics.add.group({})
    this.bullets = this.physics.add.group({})
    this.upgrades = this.physics.add.group({})

    // Collisions
    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHitEnemy as any)
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerHit as any)
    this.physics.add.overlap(this.player, this.upgrades, this.onPickup as any)

    // UI
    this.uiText = this.add.text(10, 10, '', { fontSize: '24px', color: '#ffffff' }).setDepth(100)

    // Spawners
    this.time.addEvent({ delay: 650, loop: true, callback: this.spawnEnemy, callbackScope: this })
    this.time.addEvent({ delay: 12000, loop: true, callback: this.spawnUpgrade, callbackScope: this })
    this.time.addEvent({ delay: 30000, loop: false, callback: this.spawnBoss, callbackScope: this })

    // Input
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.pointerId === null) this.pointerId = p.id
    })
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.pointerId === p.id) this.pointerId = null
    })
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return

    // Scroll background
    this.starfield.tilePositionY -= 0.3 * (delta / 16.67)

    // Player movement via drag
    const pointer = this.input.pointer1
    if (pointer.isDown) {
      const dx = pointer.x - this.player.x
      const dy = pointer.y - this.player.y
      const len = Math.hypot(dx, dy)
      if (len > 4) {
        const vx = (dx / len) * this.playerStats.speed
        const vy = (dy / len) * this.playerStats.speed
        this.player.setVelocity(vx, vy)
      } else {
        this.player.setVelocity(0, 0)
      }
    } else {
      this.player.setVelocity(0, 0)
    }

    // Auto fire
    if (time - this.lastShotAt >= this.playerStats.fireIntervalMs) {
      this.fireBullet()
      this.lastShotAt = time
    }

    // Despawn bullets offscreen
    this.bullets.getChildren().forEach((b) => {
      const bullet = b as Phaser.Types.Physics.Arcade.ImageWithDynamicBody
      if (bullet.y < -20) bullet.destroy()
    })

    // Enemies cleanup
    this.enemies.getChildren().forEach((e) => {
      const enemy = e as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { hp?: number }
      if (enemy.y > this.scale.height + 40) enemy.destroy()
    })

    // Magnet effect
    this.upgrades.getChildren().forEach((u) => {
      const up = u as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { type?: UpgradeType }
      const d = Phaser.Math.Distance.Between(up.x, up.y, this.player.x, this.player.y)
      if (d < this.playerStats.magnetRadius) {
        const angle = Phaser.Math.Angle.Between(up.x, up.y, this.player.x, this.player.y)
        up.body?.velocity.set(Math.cos(angle) * 240, Math.sin(angle) * 240)
      }
    })

    // UI text
    this.uiText.setText(`HP ${Math.ceil(this.playerStats.hp)}/${this.playerStats.maxHp}  Очки ${this.score}`)
  }

  private drawStarfield(): void {
    const g = this.add.graphics()
    g.fillStyle(0x000000, 1)
    g.fillRect(0, 0, this.scale.width, this.scale.height)
    for (let i = 0; i < 350; i++) {
      const x = Math.random() * this.scale.width
      const y = Math.random() * this.scale.height
      const c = 0xaaaaaa + Math.floor(Math.random() * 0x444444)
      g.fillStyle(c, 1)
      g.fillCircle(x, y, Math.random() * 1.5 + 0.5)
    }
    g.generateTexture('starfield', this.scale.width, this.scale.height)
    g.destroy()
    this.starfield.setTexture('starfield')
  }

  private drawPlayer(img: Phaser.Types.Physics.Arcade.ImageWithDynamicBody): void {
    const g = this.add.graphics()
    g.fillStyle(0x00e5ff, 1)
    g.fillTriangle(0, 40, -18, -20, 18, -20)
    g.lineStyle(2, 0xffffff, 1)
    g.strokeTriangle(0, 40, -18, -20, 18, -20)
    g.generateTexture('playerShip', 40, 60)
    g.destroy()
    img.setTexture('playerShip').setCircle(16).setOffset(4, 10)
  }

  private fireBullet(): void {
    const b = this.bullets.create(this.player.x, this.player.y - 28, '') as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { damage?: number }
    const g = this.add.graphics()
    g.fillStyle(0xfff275, 1)
    g.fillRect(0, 0, 6, 18)
    g.generateTexture('bullet', 6, 18)
    g.destroy()
    b.setTexture('bullet')
    b.setVelocity(0, -800)
    b.damage = this.playerStats.damage
  }

  private spawnEnemy(): void {
    if (this.gameOver) return
    const { width } = this.scale
    const x = Phaser.Math.Between(40, width - 40)
    const y = -20
    const enemy = this.enemies.create(x, y, '') as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { hp?: number }

    const g = this.add.graphics()
    g.fillStyle(0xff477e, 1)
    g.fillCircle(14, 14, 14)
    g.generateTexture('enemyDot', 28, 28)
    g.destroy()
    enemy.setTexture('enemyDot').setCircle(12).setOffset(2, 2)

    enemy.hp = 3 + Math.floor(this.score / 50)
    enemy.setVelocity(Phaser.Math.Between(-40, 40), Phaser.Math.Between(160, 240))
  }

  private spawnUpgrade(): void {
    if (this.gameOver) return
    const types: UpgradeType[] = ['damage', 'firerate', 'shield', 'speed', 'magnet']
    const type = Phaser.Utils.Array.GetRandom(types)
    const up = this.upgrades.create(Phaser.Math.Between(40, this.scale.width - 40), -20, '') as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { type?: UpgradeType }

    const colorByType: Record<UpgradeType, number> = {
      damage: 0xffb703,
      firerate: 0x8ecae6,
      shield: 0x90be6d,
      speed: 0xf94144,
      magnet: 0x9d4edd
    }

    const g = this.add.graphics()
    g.fillStyle(colorByType[type], 1)
    g.fillRect(0, 0, 20, 20)
    g.generateTexture(`up_${type}`, 20, 20)
    g.destroy()

    up.setTexture(`up_${type}`).setVelocity(0, 120)
    up.type = type
  }

  private spawnBoss(): void {
    if (this.gameOver || this.boss) return
    const { width } = this.scale
    const boss = this.physics.add.image(width / 2, -120, '') as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { hp?: number }
    const g = this.add.graphics()
    g.fillStyle(0x7209b7, 1)
    g.fillRoundedRect(0, 0, 180, 120, 16)
    g.lineStyle(4, 0xffffff)
    g.strokeRoundedRect(0, 0, 180, 120, 16)
    g.generateTexture('bossTex', 180, 120)
    g.destroy()

    boss.setTexture('bossTex').setImmovable(true)
    boss.hp = 300 + Math.floor(this.score * 0.8)
    boss.setVelocity(0, 80)
    this.boss = boss

    // Boss enters, then patrols and shoots
    this.time.addEvent({ delay: 3000, callback: () => {
      boss.setVelocity(120, 0)
      this.time.addEvent({ delay: 1000, loop: true, callback: () => boss.setVelocity(boss.body.velocity.x * -1, 0) })
      this.time.addEvent({ delay: 700, loop: true, callback: () => this.bossShoot() })
    } })

    this.bossHpText = this.add.text(10, 42, `БОСС HP ${boss.hp}`, { fontSize: '22px', color: '#ff6b6b' }).setDepth(100)

    // Overlap with bullets
    this.physics.add.overlap(this.bullets, boss as any, (b: any, target: any) => {
      const bullet = b as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { damage?: number }
      bullet.destroy()
      target.hp = (target.hp ?? 0) - (bullet.damage ?? 1)
      this.bossHpText?.setText(`БОСС HP ${target.hp}`)
      if (target.hp <= 0) {
        this.score += 250
        this.destroyBoss()
      }
    })

    // Boss collision with player
    this.physics.add.overlap(this.player, boss, () => {
      this.applyDamage(5)
    })
  }

  private bossShoot(): void {
    if (!this.boss || this.gameOver) return
    const shots = 6
    for (let i = 0; i < shots; i++) {
      const angle = (-90 - 40) + (i * (80 / (shots - 1)))
      const rad = Phaser.Math.DegToRad(angle)
      const b = this.physics.add.image(this.boss.x, this.boss.y + 40, '') as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { enemyBullet?: boolean }
      const g = this.add.graphics()
      g.fillStyle(0xff006e, 1)
      g.fillRect(0, 0, 8, 22)
      g.generateTexture('bossBullet', 8, 22)
      g.destroy()
      b.setTexture('bossBullet')
      b.enemyBullet = true
      b.setVelocity(Math.cos(rad) * 340, Math.sin(rad) * 340)
      this.time.addEvent({ delay: 7000, callback: () => b.destroy() })
      this.physics.add.overlap(this.player, b, () => {
        b.destroy()
        this.applyDamage(2)
      })
    }
  }

  private destroyBoss(): void {
    this.boss?.destroy()
    this.bossHpText?.destroy()
    this.boss = undefined
  }

  private onBulletHitEnemy(b: Phaser.GameObjects.GameObject, e: Phaser.GameObjects.GameObject): void {
    const bullet = b as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { damage?: number }
    const enemy = e as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { hp?: number }
    bullet.destroy()
    enemy.hp = (enemy.hp ?? 1) - (bullet.damage ?? 1)
    if ((enemy.hp ?? 0) <= 0) {
      enemy.destroy()
      this.score += 5
      // small chance to spawn an extra upgrade
      if (Phaser.Math.FloatBetween(0, 1) < 0.08) this.spawnUpgrade()
    }
  }

  private onPlayerHit(_: Phaser.GameObjects.GameObject, e: Phaser.GameObjects.GameObject): void {
    const enemy = e as Phaser.Types.Physics.Arcade.ImageWithDynamicBody
    enemy.destroy()
    this.applyDamage(1)
  }

  private onPickup(_: Phaser.GameObjects.GameObject, u: Phaser.GameObjects.GameObject): void {
    const up = u as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { type?: UpgradeType }
    switch (up.type) {
      case 'damage':
        this.playerStats.damage += 1
        break
      case 'firerate':
        this.playerStats.fireIntervalMs = Math.max(60, this.playerStats.fireIntervalMs - 16)
        break
      case 'shield':
        this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + 3)
        break
      case 'speed':
        this.playerStats.speed += 20
        break
      case 'magnet':
        this.playerStats.magnetRadius += 15
        break
    }
    up.destroy()
  }

  private applyDamage(amount: number): void {
    this.playerStats.hp -= amount
    this.cameras.main.shake(80, 0.004)
    if (this.playerStats.hp <= 0) this.onGameOver()
  }

  private onGameOver(): void {
    if (this.gameOver) return
    this.gameOver = true
    const reward = Math.floor(this.score / 20)
    const m = loadMeta()
    m.currency += reward
    saveMeta(m)

    const { width, height } = this.scale
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(200)
    this.add.text(width / 2, height * 0.4, 'Вы погибли', { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5).setDepth(201)
    this.add.text(width / 2, height * 0.5, `Очки: ${this.score}  Старпыль: +${reward}`, { fontSize: '28px', color: '#ffd166' }).setOrigin(0.5).setDepth(201)

    const btnMenu = this.add.text(width / 2, height * 0.62, 'В меню', { fontSize: '36px', color: '#00e5ff' }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true })
    const btnRetry = this.add.text(width / 2, height * 0.72, 'Ещё раз', { fontSize: '36px', color: '#a0ffa0' }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true })

    btnMenu.on('pointerup', () => this.scene.start('Menu'))
    btnRetry.on('pointerup', () => this.scene.restart())
    overlay.setInteractive()
  }
}