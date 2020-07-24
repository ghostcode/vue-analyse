import Dep from './dep'
import { arrayMethods } from './array'
import {
  def,
  isArray,
  isPlainObject,
  hasProto,
  hasOwn
} from '../util/index'
import Watcher from "../watcher";

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However in certain cases, e.g.
 * v-for scope alias and props, we don't want to force conversion
 * because the value may be a nested value under a frozen data structure.
 *
 * So whenever we want to set a reactive property without forcing
 * conversion on the new value, we wrap that call inside this function.
 */

let shouldConvert = true
export function withoutConversion (fn) {
  shouldConvert = false
  fn()
  shouldConvert = true
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 * 收集依赖并通知更新
 * @param {Array|Object} value
 * @constructor
 */

export function Observer (value) {
  this.value = value
  // 创建收集筐，这里为何要实例化一个 dep ???
  // 为了收集数组的依赖
  this.dep = new Dep()
  //  添加__ob__属性，1.标识数据已经被Observer观察过;2.通过响应式的数据获取到 Observer 实例
  def(value, '__ob__', this)
  // 区分对象和数组，走不同的响应式遍历方法
  if (isArray(value)) {
    var augment = hasProto
      ? protoAugment
      : copyAugment
    // 避免直接覆盖全局 Array 原型的方法，所以这里只覆盖即将转换为响应式 Array 类型数据的原型
    // value.__proto__ = arrayMethods
    augment(value, arrayMethods, arrayKeys)
    this.observeArray(value)
  } else {
    // data(){
    //   return {
    //     a:1,
    //     b:[1,2,3]
    //   }
    // }
    // 第一次都会走这里
    this.walk(value)
  }
}

// Instance methods

/**
 * Walk through each property and convert them into
 * getter/setters. This method should only be called when
 * value type is Object.
 *
 *  仅当值是Object时，遍历每个属性，使其变为getter、setter。
 *
 * @param {Object} obj
 */

Observer.prototype.walk = function (obj) {
  // 遍历每个属性
  // data(){
  //   return {
  //     a:1,
  //     b:[1,2,3]
  //   }
  // }
  // 逐个遍历上面的属性 a 和 b
  var keys = Object.keys(obj)
  for (var i = 0, l = keys.length; i < l; i++) {
    this.convert(keys[i], obj[keys[i]])
  }

  //  为何不用forEach???
  //   Object.keys(obj).forEach(key=>{
  //       this.convert(key,obj[key])
  //   })
}

/**
 * Observe a list of Array items.
 *
 * @param {Array} items
 */

Observer.prototype.observeArray = function (items) {
  for (var i = 0, l = items.length; i < l; i++) {
    observe(items[i])
  }
}

/**
 * Convert a property into getter/setter so we can emit
 * the events when the property is accessed/changed.
 *
 * 把每个属性变为getter/setter之后，当属性变化或获取时我们就可以发出事件。
 *
 * @param {String} key
 * @param {*} val
 */

Observer.prototype.convert = function (key, val) {
  defineReactive(this.value, key, val)
}

/**
 * Add an owner vm, so that when $set/$delete mutations
 * happen we can notify owner vms to proxy the keys and
 * digest the watchers. This is only called when the object
 * is observed as an instance's root $data.
 *
 * @param {Vue} vm
 */

Observer.prototype.addVm = function (vm) {
  (this.vms || (this.vms = [])).push(vm)
}

/**
 * Remove an owner vm. This is called when the object is
 * swapped out as an instance's $data object.
 *
 * @param {Vue} vm
 */

Observer.prototype.removeVm = function (vm) {
  this.vms.$remove(vm)
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 *
 * @param {Object|Array} target
 * @param {Object} src
 */

function protoAugment (target, src) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 *
 * @param {Object|Array} target
 * @param {Object} proto
 */

function copyAugment (target, src, keys) {
  for (var i = 0, l = keys.length; i < l; i++) {
    var key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * 设置观察者成功则返回处理后的，若之前处理过，则直接返回。
 * @param {*} value
 * @param {Vue} [vm]
 * @return {Observer|undefined}
 * @static
 */

export function observe (value, vm) {
  if (!value || typeof value !== 'object') {
    return
  }
  var ob
  //  若已经observer则返回之前的 __ob__
  if (
    hasOwn(value, '__ob__') &&
    value.__ob__ instanceof Observer
  ) {
    ob = value.__ob__
  } else if (
    shouldConvert && (isArray(value) || isPlainObject(value)) && Object.isExtensible(value) && !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (ob && vm) {
    ob.addVm(vm)
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 *
 * 使数据具有响应，依赖收集、通知变化。
 *
 * @param {Object} obj
 * @param {String} key
 * @param {*} val
 */

export function defineReactive (obj, key, val) {
  // 每个属性都有自己的收集器
  var dep = new Dep()
  // 获得对象上指定属性的描述符
  var property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  var getter = property && property.get
  var setter = property && property.set

  var childOb = observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    //  依赖收集（把所有依赖此数据项的Watcher添加进数组）
    get: function reactiveGetter () {
      var value = getter ? getter.call(obj) : val
      // Dep.target 其实就是 watcher
      if (Dep.target) {
        //  添加进依赖数组
        //   Dep.prototype.depend = function () {
        //       Dep.target.addDep(this)  => watch.addDep(this)
        //   }

        // Watcher.prototype.addDep = function (dep) {
        //     var id = dep.id
        //     if (!this.newDepIds.has(id)) {
        //         this.newDepIds.add(id)
        //         this.newDeps.push(dep)
        //         if (!this.depIds.has(id)) {
        //             dep.addSub(this)
        //         }
        //     }
        // }
        // 把 watcher 添加到收集器中
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
        }
        if (isArray(value)) {
          for (var e, i = 0, l = value.length; i < l; i++) {
            e = value[i]
            e && e.__ob__ && e.__ob__.dep.depend()
          }
        }
      }
      return value
    },
    //  通知更新
    set: function reactiveSetter (newVal) {
      var value = getter ? getter.call(obj) : val
      //  数据没有更改，退出,這裡要是對象怎麼辦？或者說只要是對象就默認不等？
      if (newVal === value) {
        return
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = observe(newVal)
      // 调用依赖此数据项，订阅者的更新方法
      // 通知订阅我这个dep的watcher们:我更新了
      dep.notify()
    }
  })
}
