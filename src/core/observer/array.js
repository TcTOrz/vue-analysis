/*
 * @Author: Li Jian
 * @Date: 2021-03-24 13:23:17
 * @LastEditTime: 2021-05-18 11:38:24
 * @LastEditors: Li Jian
 */
/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

// 当访问Array.prototype上的七个方法时，会被Array.prototype拦截，用以实现响应式
const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

// 由于这七个方法都能改变自身，所以需要实现响应式
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  // 缓存原生方法
  const original = arrayProto[method]
  def(arrayMethods, method, function mutator (...args) {
    // 执行原生方法
    const result = original.apply(this, args)
    const ob = this.__ob__
    let inserted
    // 插入元素时
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // 对新插入的元素进行响应式处理
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.dep.notify()
    return result
  })
})
