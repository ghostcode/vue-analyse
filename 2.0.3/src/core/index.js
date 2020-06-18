import config from './config'
import { initGlobalAPI } from './global-api/index'
import Vue from './instance/index'

// 扩展全局方法 Vue.mixin / Vue.component / Vue.fiter / Vue.use
initGlobalAPI(Vue)

Object.defineProperty(Vue.prototype, '$isServer', {
  get: () => config._isServer
})

Vue.version = '2.0.3'

export default Vue
