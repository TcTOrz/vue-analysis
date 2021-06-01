/*
 * @Author: Li Jian
 * @Date: 2021-03-24 13:23:17
 * @LastEditTime: 2021-05-19 15:25:32
 * @LastEditors: Li Jian
 */
/* @flow */

import { mergeOptions } from '../util/index'

// 实际上就是调用了组件合并函数，在Vue初始化时还会调用，返回Vue构造函数
export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
