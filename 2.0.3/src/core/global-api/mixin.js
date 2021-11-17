/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    // mixin 其实就是参数合并
    Vue.options = mergeOptions(Vue.options, mixin)
  }
}

