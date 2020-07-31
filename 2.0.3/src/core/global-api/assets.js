/* @flow */

import config from '../config'
import { warn, isPlainObject } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  // _assetTypes: [
  //   'component',
  //   'directive',
  //   'filter'
  // ],
  config._assetTypes.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production') {
          if (type === 'component' && config.isReservedTag(id)) {
            warn(
              'Do not use built-in or reserved HTML elements as component ' +
              'id: ' + id
            )
          }
        }
        // 注册组件，传入一个选项对象 (自动调用 Vue.extend)
        // Vue.component('my-component', { /* ... */ })
        // 上面这种情况就会走下面的逻辑
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id
          // Vue.component 就是调用 Vue.extend 方法
          definition = Vue.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
