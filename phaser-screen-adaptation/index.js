/**
 * @author litingting
 * @date 2018
 * @desc Phaser 游戏引擎的横竖屏适配插件
 * @example
 * // 引入 Phaser
 * import PIXI from 'pixi'
 * import p2 from 'p2'
 * import Phaser from 'phaser'
 * // 引入 Phaser 适配插件
 * import ScreenAdaptation from '@o2team/phaser-screen-adaptation'
 *
 * // 初始化
 * const screenAdapt = game.plugins.add(ScreenAdaptation)
 * screenAdapt.set({
 *   designWidth: 750, // 一般设为设计稿基准的宽度，默认 auto 为动态获取屏幕宽度
 *   designHeight: 1334, // 一般设为设计稿基准的高度，默认 auto 为动态获取屏幕宽度
 *   worldBoundsX: 0, // 世界 x 坐标位置，默认为 0
 *   worldBoundsY: 0, // 世界 y 坐标位置， 默认为 0
 *   worldBoundsWidth: 750, // 世界宽度边界
 *   worldBoundsHeight: 1334, // 世界高度边界
 *   scaleMode: 'SHOW_ALL', // 适配模式，可选 'SHOW_ALL'、'EXACT_FIT'、'NO_BORDER'、'FIXED_WIDTH'、'FIXED_HEIGHT'
 *   screenMode: 'portrait', // 游戏呈现形式，可选 'portrait'、'landscape'
 *   alignH: true, // canvas是否垂直居中
 *   alignV: true, // canvas是否水平居中
 *   onOrientationChange: orientation => {} // 屏幕旋转响应回调
 * })
 *
 * // 相对定位对齐
 * // 支持配置的位置属性：top、right、left、bottom、verticalCenter、horizontalCenter
 * const musicIcon = game.add.image(0, 0, 'musicIcon', 'music_on')
 * const position = {
 *   top: 30,
 *   right: 30
 * }
 * screenAdapt.align(musicIcon, position)
 *
 * // 始终保持 graphics 元素与 canvas 一致大小
 * // 常用于 FIXED_WIDTH、FIXED_HEIGHT 适配模式下
 * // 注意：存在game.width/height更新不及时，因此，请用game.size.width/height来替代
 * const rect = game.add.graphics(0, 0)
 * rect.beginFill(0xff0000)
 * rect.drawRect(0, 0, game.size.width, game.size.height)
 * rect.endFill()
 * screenAdapt.fit(rect)
 *
 * // 设置 resize 回调
 * screenAdapt.setResizeCallback(
 *   orientation => console.log('callback', orientation)
 * )
 */

/**
 * 通过 Symbol 唯一性命名私有方法，避免外部调用
 */
import Symbol from 'symbol'
const _setCanvasSize = Symbol('_setCanvasSize')
const _setCanvasScale = Symbol('_setCanvasScale')
const _setStageRotate = Symbol('_setStageRotate')
const _fixFixedToCamera = Symbol('_fixFixedToCamera')
const _alignCanvas = Symbol('_alignCanvas')
const _adaptCanvas = Symbol('_adaptCanvas')
const _alignPosition = Symbol('_alignPosition')
const _keepFit = Symbol('_keepFit')
const _update = Symbol('_update')

/**
 * 获取（屏幕窗口）可视区域对应的宽高
 */
function getViewSize (isPortrait) {
  const screen = window.screen
  const max = Math.max(screen.width, screen.height)
  const min = Math.min(screen.width, screen.height)

  return {
    x: isPortrait ? min : max,
    y: isPortrait ? max : min
  }
}

/**
 * 获取适配比例
 * @description 根据不同适配模式，获取内容适配容器的适配比例
 * @param {string} scaleMode 适配模式
 * @param {number} contentWidth 内容宽度
 * @param {number} contentHeight 内容高度
 * @param {number} containerWidth 容器宽度
 * @param {number} containerHeight 容器高度
 */
function getScaleRadio (forceRotate, scaleMode, content, container) {
  let scaleRadio = {}
  const radioX = container.x / content.x
  const radioY = container.y / content.y
  const min = Math.min(radioX, radioY)
  const max = Math.max(radioX, radioY)

  switch (scaleMode) {
    case 'SHOW_ALL':
      // SHOW_ALL 模式，取 x、y 方向上比值的较小值
      scaleRadio.x = min
      scaleRadio.y = min
      break
    case 'EXACT_FIT':
      // EXACT_FIT 模式的缩放因子，取 x、y 方向上比值的各个比值
      scaleRadio.x = radioX
      scaleRadio.y = radioY
      break
    case 'NO_BORDER':
      // NO_BORDER 模式的缩放因子，取 x、y 方向上比值的较大值
      scaleRadio.x = max
      scaleRadio.y = max
      break
    case 'FIXED_WIDTH':
      // FIXED_WIDTH 模式的缩放因子，取内容宽度方向上的比值(在强制旋转下，width对应的是y)
      scaleRadio.x = forceRotate ? radioY : radioX
      scaleRadio.y = scaleRadio.x
      break
    case 'FIXED_HEIGHT':
      // FIXED_HEIGHT 模式的缩放因子，取内容高度方向上的比值(在强制旋转下，height对应的是x)
      scaleRadio.x = forceRotate ? radioX : radioY
      scaleRadio.y = scaleRadio.x
      break
    default:
      scaleRadio = null
  }

  return scaleRadio
}

/**
 * 获取偏移距离
 * @param {number} contentWidth 内容宽度
 * @param {number} contentHeight 内容高度
 * @param {number} containerWidth 容器宽度
 * @param {number} containerHeight 容器高度
 */
function getOffset (contentWidth, contentHeight, containerWidth, containerHeight) {
  const offsetX = Math.floor((containerWidth - contentWidth) / 2)
  const offsetY = Math.floor((containerHeight - contentHeight) / 2)

  return {
    x: offsetX,
    y: offsetY
  }
}

export default class ScreenAdaptation extends Phaser.Plugin {
  constructor (...args) {
    super(...args)
    // 横竖屏状态
    this.isPortrait = this.game.scale.isPortrait
    this.orientation = this.isPortrait ? 'portrait' : 'landscape'

    // 动态设置屏幕、设计稿基准的参数
    this.canvas = this.game.canvas
    this.view = {} // 屏幕可视区域
    this.design = {} // 设计稿尺寸
    // 因为强制旋转导致game.width／height也会随之交换，因此需要暴露不变的属性
    this.game.size = {
      width: 0,
      height: 0
    }

    this.widgets = [] // 悬挂元素，动态更新相对位置
    this.layouts = [] // 全屏布局元素，动态重绘全屏尺寸
    this.resizeCallbackList = [] // 回调函数列表

    // 默认配置
    this.defaults = {
      designWidth: 'auto', // 一般设为设计稿基准的宽度，默认 auto 为动态获取屏幕宽度
      designHeight: 'auto', // 一般设为设计稿基准的高度，默认 auto 为动态获取屏幕宽度
      worldBoundsX: 0, // 世界宽度 － camera 宽度
      worldBoundsY: 0, // 世界宽度 － camera 宽度
      worldBoundsWidth: 0, // 世界宽度 － camera 宽度
      worldBoundsHeight: 0, // 世界高度 － camera 高度
      scaleMode: 'SHOW_ALL', // 适配模式
      screenMode: 'portrait', // 游戏呈现形式
      alignH: false, // canvas是否垂直居中
      alignV: false, // canvas是否水平居中
      onOrientationChange: orientation => {}, // 屏幕旋转响应回调
    }

    // canvas默认fixed
    this.canvas.style.cssText =
    `
    position: fixed;
    left: 0;
    top: 0;
    `
    // resize响应
    let lastParentWidth = 0
    let lastParentHeight = 0
    this.game.scale.setResizeCallback((scale, parentBounds) => {
      const width = parentBounds.width
      const height = parentBounds.height
      const isVaild = width !== 0 && (lastParentWidth !== width || lastParentHeight !== height)
      if (isVaild) {
        this.orientation = width >= height ? 'landscape' : 'portrait'
        this[_update]()
        this.config.onOrientationChange(this.orientation)
        lastParentWidth = width
        lastParentHeight = height
      }
    }, this)
  }

  /**
   * 根据参数配置，并进行适配处理
   * @param {Object} config 适配参数
   */
  set (config) {
    this.config = Object.assign({}, this.defaults, config)

    // 适配处理
    this[_adaptCanvas]()

    // 居中
    this[_alignCanvas]()
  }

  /**
   * 根据定位配置，进行适配后自动对齐
   * @param {DisplayObject} createjs.DisplayObject 元素
   * @param {Object} position 位置对象，可选属性：top、left、right、bottom、verticalCenter、horizontalCenter
   */
  align (displayObject, position) {
    const item = {
      obj: displayObject,
      position
    }
    this.widgets.push(item)
    this[_alignPosition](item)
  }

  /**
   * 在适配后，根据舞台尺寸，对 createjs.Graphysics 元素自动铺满舞台
   * @param {DisplayObject} createjs.Graphysics 元素
   */
  fit (shape) {
    this.layouts.push(shape)
    this[_keepFit](shape)
  }

  /**
   * 设置 resize 回调
   * @param {function} callback 回调函数
   */
  setResizeCallback (callback) {
    if (typeof callback === 'function') this.resizeCallbackList.push(callback)
  }

  [_setCanvasSize] () {
    let canvasWidth
    let canvasHeight
    switch (this.config.scaleMode) {
      case 'FIXED_WIDTH':
        if (this.isForceRotate) {
          canvasHeight = this.design.y
          // canvas适配后大小（style.width/height）等于屏幕可视区域尺寸
          // 因此，可按等比缩放反过来计算 canvas 高度
          canvasWidth = Math.floor(this.view.x / this.scaleRadio.x)
        } else {
          canvasWidth = this.design.x
          canvasHeight = Math.floor(this.view.y / this.scaleRadio.x)
        }
        break
      case 'FIXED_HEIGHT':
        if (this.isForceRotate) {
          canvasWidth = this.design.x
          canvasHeight = Math.floor(this.view.y / this.scaleRadio.y)
        } else {
          canvasHeight = this.design.y
          canvasWidth = Math.floor(this.view.x / this.scaleRadio.y)
        }
        break
      default:
        canvasWidth = this.design.x
        canvasHeight = this.design.y
    }

    this.canvas.actualWidth = canvasWidth
    this.canvas.actualHeight = canvasHeight
    this.game.scale.setGameSize(canvasWidth, canvasHeight)
    this.canvas.styleWidth = Math.floor(this.canvas.actualWidth * this.scaleRadio.x)
    this.canvas.styleHeight = Math.floor(this.canvas.actualHeight * this.scaleRadio.y)
  }

  [_setCanvasScale] () {
    this.game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE
    this.game.scale.setUserScale(this.scaleRadio.x, this.scaleRadio.y)
  }

  [_setStageRotate] () {
    const boundWidth = this.config.worldBoundsWidth
    const boundHeight = this.config.worldBoundsHeight
    const boundX = this.config.worldBoundsX
    const boundY = this.config.worldBoundsY
    this.game.world.setBounds(boundX, boundX, boundWidth, boundHeight)

    if (this.isForceRotate) {
      this.game.world.angle = -90
      this.game.world.pivot.x = this.canvas.actualHeight
      this.game.camera.bounds.setTo(boundX, boundY - boundWidth + this.canvas.actualHeight, boundHeight, boundWidth)
    } else {
      this.game.world.angle = 0
      this.game.world.pivot.x = 0
      this.game.camera.bounds.setTo(boundX, boundY, boundWidth, boundHeight)
    }
  }

  [_fixFixedToCamera] () {
    if (this.isForceRotate) {
      Phaser.Component.FixedToCamera.postUpdate = function () {
        if (this.fixedToCamera) {
          this.position.x = (-this.game.camera.view.y + this.cameraOffset.x) / this.game.camera.scale.x
          this.position.y = (this.game.camera.view.x + this.cameraOffset.y) / this.game.camera.scale.y
        }
      }
    } else {
      Phaser.Component.FixedToCamera.postUpdate = function () {
        if (this.fixedToCamera) {
          this.position.x = (this.game.camera.view.x + this.cameraOffset.x) / this.game.camera.scale.x
          this.position.y = (this.game.camera.view.y + this.cameraOffset.y) / this.game.camera.scale.y
        }
      }
    }
  }

  [_adaptCanvas] () {
    // 更新横竖屏状态
    this.isPortrait = this.game.scale.isPortrait
    this.orientation = this.isPortrait ? 'portrait' : 'landscape'

    // 是否强制旋转
    this.isForceRotate = this.orientation !== this.config.screenMode

    // 获取尺寸
    this.view = getViewSize(this.isPortrait)

    // 设计稿尺寸，'auto' 值代表跟随屏幕可视区域大小
    this.design.width = this.config.designWidth === 'auto' ? this.view.x * 2 : this.config.designWidth
    this.design.height = this.config.designHeight === 'auto' ? this.view.y * 2 : this.config.designHeight
    // 对应x、y方向：强制旋转影响
    this.design.x = this.isForceRotate ? this.design.height : this.design.width
    this.design.y = this.isForceRotate ? this.design.width : this.design.height

    // 获取缩放比例
    this.scaleRadio = getScaleRadio(
      this.isForceRotate,
      this.config.scaleMode,
      this.design,
      this.view
    )

    // 设置舞台 Canvas 适配
    this[_setCanvasSize]()
    this[_setCanvasScale]()

    // 更新
    this.game.size.width = this.isForceRotate ? this.canvas.actualHeight : this.canvas.actualWidth
    this.game.size.height = this.isForceRotate ? this.canvas.actualWidth : this.canvas.actualHeight

    // 设置舞台内容旋转
    this[_setStageRotate]()

    // 纠正元素FixedToCamera的处理
    this[_fixFixedToCamera]()
  }

  [_alignCanvas] () {
    const alignH = this.config.alignH
    const alignV = this.config.alignV

    // 这里只是canvas宽度小于屏幕宽度时起作用，需要额外设置canvas宽度大于屏幕宽度的情况
    this.game.scale.pageAlignHorizontally = alignH
    this.game.scale.pageAlignVertically = alignV

    const offset = getOffset(
      this.canvas.styleWidth,
      this.canvas.styleHeight,
      this.view.x,
      this.view.y
    )

    if (this.config.alignV && offset.y <= 0) this.canvas.style.cssText += `top: ${offset.y}px;`
    if (this.config.alignH && offset.x <= 0) this.canvas.style.cssText += `left: ${offset.x}px;`
  }

  [_alignPosition] (item) {
    const obj = item.obj
    const position = item.position

    // 对offset按比例缩放还原
    let offsetX = Math.floor((this.canvas.styleWidth - this.view.x) / this.scaleRadio.x)
    let offsetY = Math.floor((this.canvas.styleHeight - this.view.y) / this.scaleRadio.y)
    // 偏移小于零才是溢出
    offsetX = offsetX >= 0 ? offsetX : 0
    offsetY = offsetY >= 0 ? offsetY : 0

    // 计算相对偏移值
    const offset = {}
    if (this.isForceRotate) {
      offset.left = Math.floor(offsetY / 2)
      offset.right = Math.floor(offsetY / 2)
      offset.top = Math.floor(offsetX / 2)
      offset.bottom = Math.floor(offsetX / 2)
    } else {
      offset.left = Math.floor(offsetX / 2)
      offset.right = Math.floor(offsetX / 2)
      offset.top = Math.floor(offsetY / 2)
      offset.bottom = Math.floor(offsetY / 2)
    }

    if (!this.config.alignH) {
      offset.left *= 2
      offset.right = 0
    }

    if (!this.config.alignV) {
      offset.top *= 2
      offset.bottom = 0
    }

    // 考虑强制旋转影响，找到canvas对应的宽高
    const canvas = {}
    canvas.width = this.isForceRotate ? this.canvas.actualHeight : this.canvas.actualWidth
    canvas.height = this.isForceRotate ? this.canvas.actualWidth : this.canvas.actualHeight

    // 根据相对位置进行重新定位 x、y
    if (typeof position.right === 'number') {
      obj.x = canvas.width - (offset.right + position.right + obj.getBounds().width)
    }

    if (typeof position.bottom === 'number') {
      obj.y = canvas.height - (offset.bottom + position.bottom + obj.getBounds().height)
    }

    if (typeof position.left === 'number') {
      obj.x = offset.left + position.left
    }

    if (typeof position.top === 'number') {
      obj.y = offset.top + position.top
    }

    if (typeof position.horizontalCenter === 'boolean') {
      obj.anchor.x = 0.5
      obj.x = Math.floor(canvas.width / 2)
    }

    if (typeof position.verticalCenter === 'boolean') {
      obj.anchor.y = 0.5
      obj.y = Math.floor(canvas.height / 2)
    }
  }

  [_keepFit] (graphics) {
    graphics.drawRect(0, 0, this.canvas.actualWidth, this.canvas.actualHeight)
  }

  [_update] () {
    // 更新适配处理
    this[_adaptCanvas]()
    // 居中
    this[_alignCanvas]()

    // 调整对齐位置
    this.widgets.forEach(this[_alignPosition].bind(this))

    // 重绘全屏尺寸
    this.layouts.forEach(this[_keepFit].bind(this))

    // resize回调
    this.resizeCallbackList.forEach(item => item(this.orientation))
  }
}
