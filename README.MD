# H5游戏开发：横屏适配

## H5 普通页面适配

横屏布局 -> rotate 90 deg 竖屏布局 -> 缩放调整元素

> 强制横屏显示，对屏幕 resize 事件进行监听，当判断为竖屏时将整个根容器进行逆时针 CSS3 旋转 90 度即可

> 若包含 canvas 画布旋转，会导致 canvas 坐标系与页面坐标系颠倒。

```
$vw_base: 375;
$vw_fontsize: 20;
html {
  font-size: 20px; //不支持vw单位时，回退到px单位
  font-size: ($vw_fontsize / $vw_base) * 100vw;
}
@media screen and (orientation: landscape) {
  html {
    font-size: 20px;
    font-size: ($vw_fontsize / $vw_base) * 100vh;
  }
}


// 利用 CSS3 旋转 对根容器逆时针旋转 90 度
var detectOrient = function() {
  var width = document.documentElement.clientWidth,
      height =  document.documentElement.clientHeight,
      $wrapper =  document.getElementById("J_wrapper"),
      style = "";
  if( width >= height ){ // 横屏
      style += "width:" + width + "px;";  // 注意旋转后的宽高切换
      style += "height:" + height + "px;";
      style += "-webkit-transform: rotate(0); transform: rotate(0);";
      style += "-webkit-transform-origin: 0 0;";
      style += "transform-origin: 0 0;";
  }
  else{ // 竖屏
      style += "width:" + height + "px;"; 
      style += "height:" + width + "px;"; 
      style += "-webkit-transform: rotate(90deg); transform: rotate(90deg);";
      // 注意旋转中点的处理
      style += "-webkit-transform-origin: " + width / 2 + "px " + width / 2 + "px;";
      style += "transform-origin: " + width / 2 + "px " + width / 2 + "px;";
  }
  $wrapper.style.cssText = style;
}
window.onresize = detectOrient;
detectOrient();

```


## H5 游戏页面适配

> 对于 H5 轻互动游戏来说，要实现横屏的话，主要是解决两点：
> 1.无论用户手持方向如何，都需要保证屏幕横向显示。
> 2.由于屏幕分辨率的多样化，因此就算是横屏下也是需要进行横屏适配，保证画面在所有分辨率下都能够合理适配。

- 方案一：采用两套Canvas的方案。

> 两套 Canvas 的方案的做法是，页面包含两个 Canvas 分别用于横竖屏时的相应显示，但是它们的数据是打通的。但是，该方案难免会有局限性，比较适合游戏逻辑数据处理简单、且舞台元素少且居中的场景；

- 方案二：采用缩放的手段进行适配的方案。

> 而缩放适配方案做法是，采用的最为常见的缩放手段——利用 CSS3 Transform 的 scale 属性，达到“一种设计尺寸适配多种分辨率屏幕”的目的。


横屏画布布局 -> rotate 90 deg 竖屏画布布局 -> 缩放调整元素   

> 只旋转 canvas stage 内容，canvas 坐标系与页面坐标系一致。


## 参考资料

- [H5游戏开发](https://www.zhihu.com/column/snsgame)

- [H5游戏开发：横屏适配](https://zhuanlan.zhihu.com/p/30577906)

- [《Laya引擎－自动横屏适配》](https://layaair.ldc.layabox.com/demo/?category=2d&group=SmartScale&name=Landscape)

- [How to create mobile games for different screen sizes and resolutions](https://felgo.com/doc/felgo-different-screen-sizes/)