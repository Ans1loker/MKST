import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'
import { MetaScene } from './scenes/MetaScene'

const GAME_WIDTH = 720
const GAME_HEIGHT = 1280

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  input: {
    activePointers: 3
  },
  scene: [MenuScene, GameScene, MetaScene]
}

// eslint-disable-next-line no-new
new Phaser.Game(config)