import initMixin from './internal/init'
import stateMixin from './internal/state'
import eventsMixin from './internal/events'
import lifecycleMixin from './internal/lifecycle'
import miscMixin from './internal/misc'

import dataAPI from './api/data'
import domAPI from './api/dom'
import eventsAPI from './api/events'
import lifecycleAPI from './api/lifecycle'

/**
 * The exposed Vue constructor.
 *
 * API conventions:
 * - public API methods/properties are prefixed with `$`
 * - internal methods/properties are prefixed with `_`
 * - non-prefixed properties are assumed to be proxied user
 *   data.
 *
 * @constructor
 * @param {Object} [options]
 * @public
 */
// 实例入口
function Vue (options) {
  this._init(options)
}

// install internals
// 装在内部方法
initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
miscMixin(Vue)

// install instance APIs
// 装在实例方法
dataAPI(Vue)
domAPI(Vue)
eventsAPI(Vue)
lifecycleAPI(Vue)

export default Vue
