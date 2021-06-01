/*
 * @Author: Li Jian
 * @Date: 2021-03-24 13:23:17
 * @LastEditTime: 2021-05-18 11:43:58
 * @LastEditors: Li Jian
 */
/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
/**
 * 一个 dep 对应一个 obj.key
 * 在读取响应式数据时，负责收集依赖，每个 dep（或者说 obj.key）依赖的 watcher 有哪些
 * 在响应式数据更新时，负责通知 dep 中那些 watcher 去执行 update 方法
 */
export default class Dep {
  static target: ?Watcher; // 静态属性
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  // dep中添加Watcher
  addSub (sub: Watcher) {
    // console.log(this.id)
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 向Watcher中添加dep
  depend () {
    if (Dep.target) {
      // 让watcher自己决定是否被dep收集
      Dep.target.addDep(this)
    }
  }

  // 通知dep中的所有watcher，执行Watcher.update方法
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

/**
 * 当前正在执行的 watcher，同一时间只会有一个 watcher 在执行
 * Dep.target = 当前正在执行的 watcher
 * 通过调用 pushTarget 方法完成赋值，调用 popTarget 方法完成重置（null)
 */
// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []

// 采用堆栈的结构保留当前使用的target
// 在需要进行依赖收集的时候调用，设置 Dep.target = watcher
export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

// 依赖收集结束调用，设置 Dep.target = null
export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
