/*
 * @Author: Li Jian
 * @Date: 2021-03-24 13:23:17
 * @LastEditTime: 2021-05-20 15:02:23
 * @LastEditors: Li Jian
 */
import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// Vue构造函数-入口
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}


// 初始化属性到对象原型中
// vue.prototype._init
initMixin(Vue)
// Vue.prototype.$data
// Vue.prototype.$props
// Vue.prototype.$set
// Vue.prototype.$delete
// Vue.prototype.$watch
stateMixin(Vue)
// Vue.prototype.$on
// Vue.prototype.$once
// Vue.prototype.$off
// Vue.prototype.$emit
eventsMixin(Vue)
// Vue.prototype._update
// Vue.prototype.$forceUpdate
// Vue.prototype.$destroy
lifecycleMixin(Vue)
// installRenderHelpers安装各种将AST解析成VNode函数
// Vue.prototype.$nextTick
// Vue.prototype._render
renderMixin(Vue)

export default Vue
