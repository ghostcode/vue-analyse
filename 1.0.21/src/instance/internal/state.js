import Watcher from '../../watcher'
import { compileAndLinkProps } from '../../compiler/index'
import Dep from '../../observer/dep'
import {
  observe,
  defineReactive
} from '../../observer/index'

import {
  warn,
  query,
  hasOwn,
  isReserved,
  isPlainObject,
  bind
} from '../../util/index'

export default function (Vue) {
  /**
   * Accessor for `$data` property, since setting $data
   * requires observing the new object and updating
   * proxied properties.
   */

  Object.defineProperty(Vue.prototype, '$data', {
    get () {
      return this._data
    },
    set (newData) {
      if (newData !== this._data) {
        this._setData(newData)
      }
    }
  })

  /**
   * Setup the scope of an instance, which contains:
   * 设置实例的范围
   * - observed data 观察数据
   * - computed properties 计算属性
   * - user methods 用户方法
   * - meta properties 元数据属性
   */

  Vue.prototype._initState = function () {
    this._initProps()
    this._initMeta()
    this._initMethods()
    this._initData()
    this._initComputed()
  }

  /**
   * Initialize props.
   */

  Vue.prototype._initProps = function () {
    var options = this.$options
    var el = options.el
    var props = options.props
    if (props && !el) {
      process.env.NODE_ENV !== 'production' && warn(
        'Props will not be compiled if no `el` option is ' +
        'provided at instantiation.',
        this
      )
    }
    // make sure to convert string selectors into element now
    el = options.el = query(el)
    this._propsUnlinkFn = el && el.nodeType === 1 && props
      // props must be linked in proper scope if inside v-for
      ? compileAndLinkProps(this, el, props, this._scope)
      : null
  }

  /**
   * Initialize the data.
   * 这里做了两件事：1.代理data属性；2.使data数据变成响应式
   */

  Vue.prototype._initData = function () {
    var dataFn = this.$options.data
    // 实例上挂在 this._data 属性指向配置项里的 data
    var data = this._data = dataFn ? dataFn() : {}
    if (!isPlainObject(data)) {
      data = {}
      process.env.NODE_ENV !== 'production' && warn(
        'data functions should return an object.',
        this
      )
    }
    var props = this._props
    // proxy data on instance
    // 把 data 代理到实例上
    var keys = Object.keys(data)
    var i, key
    i = keys.length
    
    while (i--) {
      key = keys[i]
      // there are two scenarios where we can proxy a data key:
      // 1. it's not already defined as a prop
      // 2. it's provided via a instantiation option AND there are no
      //    template prop present
      if (!props || !hasOwn(props, key)) {
        //  方便数据访问 this.xxx 直接访问的是 this.data.xxx
        this._proxy(key)
      } else if (process.env.NODE_ENV !== 'production') {
        warn(
          'Data field "' + key + '" is already defined ' +
          'as a prop. To provide default value for a prop, use the "default" ' +
          'prop option; if you want to pass prop values to an instantiation ' +
          'call, use the "propsData" option.',
          this
        )
      }
    }
    //  observe data
    //  从这里开始对data属性下的值进行 getter/setter处理
    observe(data, this)
  }

  /**
   * Swap the instance's $data. Called in $data's setter.
   *
   * @param {Object} newData
   */

  Vue.prototype._setData = function (newData) {
    newData = newData || {}
    var oldData = this._data
    this._data = newData
    var keys, key, i
    // unproxy keys not present in new data
    keys = Object.keys(oldData)
    i = keys.length
    while (i--) {
      key = keys[i]
      if (!(key in newData)) {
        this._unproxy(key)
      }
    }
    // proxy keys not already proxied,
    // and trigger change for changed values
    keys = Object.keys(newData)
    i = keys.length
    while (i--) {
      key = keys[i]
      if (!hasOwn(this, key)) {
        // new property
        this._proxy(key)
      }
    }
    oldData.__ob__.removeVm(this)
    observe(newData, this)
    this._digest()
  }

  /**
   * Proxy a property, so that
   * vm.prop === vm._data.prop
   * 省去通過data访问数据源
   * vm.data.xxx 变为 vm.xxx
   * 为何不直接赋值呢？
   * vm.name = vm.data.name
   * @param {String} key
   */

  Vue.prototype._proxy = function (key) {
    //  是否为保留字：$ , _，若是则跳过代理
    if (!isReserved(key)) {
      // need to store ref to self here
      // because these getter/setters might
      // be called by child scopes via
      // prototype inheritance.
      var self = this
      Object.defineProperty(self, key, {
        configurable: true,
        enumerable: true,
        get: function proxyGetter () {
          return self._data[key]
        },
        set: function proxySetter (val) {
          self._data[key] = val
        }
      })
    }
  }

  /**
   * Unproxy a property.
   *
   * @param {String} key
   */

  Vue.prototype._unproxy = function (key) {
    if (!isReserved(key)) {
      delete this[key]
    }
  }

  /**
   * Force update on every watcher in scope.
   */

  Vue.prototype._digest = function () {
    for (var i = 0, l = this._watchers.length; i < l; i++) {
      this._watchers[i].update(true) // shallow updates
    }
  }

  /**
   * Setup computed properties. They are essentially
   * special getter/setters
   */

  function noop () {}
  Vue.prototype._initComputed = function () {
    var computed = this.$options.computed
    if (computed) {
      for (var key in computed) {
        var userDef = computed[key]
        var def = {
          enumerable: true,
          configurable: true
        }
        if (typeof userDef === 'function') {
          def.get = makeComputedGetter(userDef, this)
          def.set = noop
        } else {
          def.get = userDef.get
            ? userDef.cache !== false
              ? makeComputedGetter(userDef.get, this)
              : bind(userDef.get, this)
            : noop
          def.set = userDef.set
            ? bind(userDef.set, this)
            : noop
        }
        Object.defineProperty(this, key, def)
      }
    }
  }

  function makeComputedGetter (getter, owner) {
    var watcher = new Watcher(owner, getter, null, {
      lazy: true
    })
    return function computedGetter () {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }

  /**
   * Setup instance methods. Methods must be bound to the
   * instance since they might be passed down as a prop to
   * child components.
   * 设置实例方法，方法必须绑定到当前实例(通过 bind 绑定 this)，
   * 因为它们有可能作为 prop 传给子组件。
   */

  Vue.prototype._initMethods = function () {
    var methods = this.$options.methods
    if (methods) {
      for (var key in methods) {
        this[key] = bind(methods[key], this)
      }
    }
  }

  /**
   * Initialize meta information like $index, $key & $value.
   */

  Vue.prototype._initMeta = function () {
    var metas = this.$options._meta
    if (metas) {
      for (var key in metas) {
        defineReactive(this, key, metas[key])
      }
    }
  }
}
