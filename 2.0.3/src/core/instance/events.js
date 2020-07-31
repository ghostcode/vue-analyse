/* @flow */

import { bind, toArray } from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

export function initEvents (vm: Component) {
  // 后续存储事件列表
  vm._events = Object.create(null)
  // init parent attached events
  const listeners = vm.$options._parentListeners
  const on = bind(vm.$on, vm)
  const off = bind(vm.$off, vm)
  vm._updateListeners = (listeners, oldListeners) => {
    updateListeners(listeners, oldListeners || {}, on, off, vm)
  }
  if (listeners) {
    vm._updateListeners(listeners)
  }
}

export function eventsMixin (Vue: Class<Component>) {
  Vue.prototype.$on = function (event: string, fn: Function): Component {
    const vm: Component = this
    ;(vm._events[event] || (vm._events[event] = [])).push(fn)
    return vm
  }

  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    // 为了 $off 移除时，对比用户提供的监听器和事件列表里的方法一致
    on.fn = fn
    // 注册到监听器列表的函数其实是我们的拦截器函数 on,
    vm.$on(event, on)
    return vm
  }

  Vue.prototype.$off = function (event?: string, fn?: Function): Component {
    const vm: Component = this
    // all
    // 没有提供参数，则清空所有事件的所有的监听函数
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // specific event
    // 找到指定事件的监听函数
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    // 若只有事件名称，则直接清空该事件的所有监听函数
    if (arguments.length === 1) {
      vm._events[event] = null
      return vm
    }
    // specific handler
    // 找到指定的监听函数,然后移除
    let cb
    let i = cbs.length
    // 从后向前遍历，
    while (i--) {
      cb = cbs[i]
      // cb.fn === fn 主要是因为 $once 时，注册到事件列表的函数是拦截器 on ,而不是用户提供的监听器函数
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }

  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      for (let i = 0, l = cbs.length; i < l; i++) {
        cbs[i].apply(vm, args)
      }
    }
    return vm
  }
}
