/* global MutationObserver */

// can we use __proto__?
export const hasProto = '__proto__' in {}

// Browser environment sniffing
export const inBrowser =
  typeof window !== 'undefined' &&
  Object.prototype.toString.call(window) !== '[object Object]'

// detect devtools
export const devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__

// UA sniffing for working around browser-specific quirks
const UA = inBrowser && window.navigator.userAgent.toLowerCase()
// 为何没有全部使用 test 来验证 ???
export const isIE9 = UA && UA.indexOf('msie 9.0') > 0
export const isAndroid = UA && UA.indexOf('android') > 0
export const isIos = UA && /(iphone|ipad|ipod|ios)/i.test(UA)
export const isWechat = UA && UA.indexOf('micromessenger') > 0

let transitionProp
let transitionEndEvent
let animationProp
let animationEndEvent

// Transition property/event sniffing
if (inBrowser && !isIE9) {
  const isWebkitTrans =
    window.ontransitionend === undefined &&
    window.onwebkittransitionend !== undefined
  const isWebkitAnim =
    window.onanimationend === undefined &&
    window.onwebkitanimationend !== undefined
  transitionProp = isWebkitTrans
    ? 'WebkitTransition'
    : 'transition'
  transitionEndEvent = isWebkitTrans
    ? 'webkitTransitionEnd'
    : 'transitionend'
  animationProp = isWebkitAnim
    ? 'WebkitAnimation'
    : 'animation'
  animationEndEvent = isWebkitAnim
    ? 'webkitAnimationEnd'
    : 'animationend'
}

export {
  transitionProp,
  transitionEndEvent,
  animationProp,
  animationEndEvent
}

/**
 * Defer a task to execute it asynchronously. Ideally this
 * should be executed as a microtask, so we leverage
 * MutationObserver if it's available, and fallback to
 * setTimeout(0).
 *
 * @param {Function} cb 回调
 * @param {Object} ctx  上下文
 */

/**
 * 异步执行一些延迟微任务，如果 MutationOberver 存在则使用，
 * 否则降级到 -> setImmediate -> setTimeout(0);
 */

// 立即执行函数，整体是一个闭包，返回一个函数
export const nextTick = (function () {
  var callbacks = []
  var pending = false
  var timerFunc

  function nextTickHandler () {

    pending = false

    var copies = callbacks.slice(0)

    callbacks = []

    for (var i = 0; i < copies.length; i++) {
      copies[i]()
    }

  }

  /* istanbul ignore if */
  //  存在 MutationObserver 并且不在微信和 iOS
  if (typeof MutationObserver !== 'undefined' && !(isWechat && isIos)) {
    var counter = 1
    var observer = new MutationObserver(nextTickHandler)
    var textNode = document.createTextNode(counter)
    observer.observe(textNode, {
      characterData: true
    })
    timerFunc = function () {
      counter = (counter + 1) % 2
      textNode.data = counter
    }
  } else {
    // webpack attempts to inject a shim for setImmediate
    // if it is used as a global, so we have to work around that to
    // avoid bundling unnecessary code.
    const context = inBrowser
      ? window
      : typeof global !== 'undefined' ? global : {}
    timerFunc = context.setImmediate || setTimeout
  }
  // 返回的函数
  return function (cb, ctx) {
    var func = ctx
      ? function () { cb.call(ctx) }
      : cb

    callbacks.push(func)

    if (pending){
        return
    }

    pending = true

    timerFunc(nextTickHandler, 0)
  }
})()

let _Set
/* istanbul ignore if */
// 检测运行环境是否有 Set
// Set.toString().match(/native code/) 这种验证方法还没见过，以前都是用特征检测
if (typeof Set !== 'undefined' && Set.toString().match(/native code/)) {
  // use native Set when available.
  _Set = Set
} else {
  // a non-standard Set polyfill that only works with primitive keys.
  _Set = function () {
    this.set = Object.create(null)
  }
  _Set.prototype.has = function (key) {
    return this.set[key] !== undefined
  }
  _Set.prototype.add = function (key) {
    this.set[key] = 1
  }
  _Set.prototype.clear = function () {
    this.set = Object.create(null)
  }
}

export { _Set }
