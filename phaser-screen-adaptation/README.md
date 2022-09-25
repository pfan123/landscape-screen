## 简介

Phaser 游戏引擎的横竖屏适配插件

## 安装

```js
jnpm install 'phaser-screen-adaptation'
```

## 基本使用

```javascript
// 引入 Phaser
import PIXI from 'pixi'
import p2 from 'p2'
import Phaser from 'phaser'
// 引入 Phaser 适配插件，务必保证 Phaser 先引入
import ScreenAdaptation from 'phaser-screen-adaptation'
```

```javascript
const DESIGN_WIDTH = 750
const DESIGN_HEIGHT = 1334
// 初始化游戏
const game = new Phaser.Game({
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  renderer: Phaser.CANVAS // webgl在手机上会导致性能下降
})
// 初始化适配插件
const screenAdapt = game.plugins.add(ScreenAdaptation)
// 设置并生效
screenAdapt.set({
  designWidth: DESIGN_WIDTH, // 一般设为设计稿基准的宽度，默认 auto 为动态获取屏幕宽度
  designHeight: DESIGN_HEIGHT, // 一般设为设计稿基准的高度，默认 auto 为动态获取屏幕宽度
  worldBoundsX: 0, // 世界 x 坐标位置，默认为 0
  worldBoundsY: 0, // 世界 y 坐标位置， 默认为 0
  worldBoundsWidth: DESIGN_WIDTH, // 世界宽度边界，若非配合 camera 使用，一般与设计稿基准大小一致
  worldBoundsHeight: DESIGN_HEIGHT, // 世界高度边界，若非配合 camera 使用，一般与设计稿基准大小一致
  scaleMode: 'SHOW_ALL', // 适配模式，可选 'SHOW_ALL'、'EXACT_FIT'、'NO_BORDER'、'FIXED_WIDTH'、'FIXED_HEIGHT'
  screenMode: 'portrait', // 游戏呈现形式，可选 'portrait'、'landscape'
  alignH: true, // canvas是否垂直居中
  alignV: true, // canvas是否水平居中
  onOrientationChange: orientation => {} // 屏幕旋转响应回调
})
```

## 其他 API

### screenAdapt.align(displayObject，position)

相对定位对齐，是横竖屏适配方案中对齐策略的应用，会动态地根据适配后的 Canvas 自动更新相对定位。

- 参数

  {DisplayObject} displayObject 是 Phaser.DisplayObject 元素

  {Object} position 位置对象，可选属性：top、left、right、bottom，以像素为单位；verticalCenter、horizontalCenter 属于Boolean类型

- 用法示例

  ```javascript
  // 设置音乐图标距离右上角各上右30px
  const musicIcon = game.add.image(0, 0, 'musicIcon', 'music_on')
  const musicIconPos = {
    top: 30,
    right: 30
  }
  screenAdapt.align(musicIcon, musicIconPos)

  // 设置文本舞台水平垂直居中
  const text = game.add.text(0, 0, 'Hello World!', {
    font: '20px Arial',
    fill: '#ffffff',
    align: 'center',
  })
  const textPos = {
    horizontalCenter: true,
    verticalCenter: true
  }
  screenAdapt.align(text, textPos)
  ```

### screenAdapt.fit(graphics)

适配舞台大小，自动铺满，始终保持 graphics 元素与 canvas 一致大小，常用于 'FIXED_WIDTH'、'FIXED_HEIGHT' 适配模式下

- 参数

  {Graphics} graphics Phaser.Graphics 元素 

- 用法示例

  ```javascript
  // 设置矩形与舞台大小一致
  const rect = game.add.graphics(0, 0)
  rect.beginFill(0xff0000)
  rect.drawRect(0, 0, game.size.width, game.size.height) // 注意：存在game.width/height更新不及时，因此，请用game.size.width/height来替代
  rect.endFill()
  screenAdapt.fit(rect)
  ```

### screenAdapt.setResizeCallback(callback)

resize 回调，每次 canvas 响应 resize 事件时，会运行回调返回横竖屏状态

- 参数

  {Function} callback 回调函数

- 返回值

  {String} orientation 横竖屏状态：'portrait'、'landscape'

- 用法示例

  ```javascript
  // 设置回调
  const callback = orientation => console.log('callback', orientation)
  screenAdapt.setResizeCallback(callback)
  ```
