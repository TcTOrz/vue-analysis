/*
 * @Author: Li Jian
 * @Date: 2021-03-24 13:23:17
 * @LastEditTime: 2021-05-19 15:08:55
 * @LastEditors: Li Jian
 */
/* @flow */

import { toArray } from '../util/index'

/**
 * 定义 Vue.use，负责为 Vue 安装插件，做了以下两件事：
 *   1、判断插件是否已经被安装，如果安装则直接结束
 *   2、安装插件，执行插件的 install 方法
 */
export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    // 已经安装插件
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    // 判断是否已经安装，已安装直接返回该插件
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    // 此时，第一个参数Vue被删除
    const args = toArray(arguments, 1)
    // Vue构造函数放在第一个位置
    args.unshift(this)
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    // 添加新安装的插件
    installedPlugins.push(plugin)
    return this
  }
}
