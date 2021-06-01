/*
 * @Author: Li Jian
 * @Date: 2021-03-24 13:23:17
 * @LastEditTime: 2021-06-01 10:35:45
 * @LastEditors: Li Jian
 */
/* @flow */

import { isObject, isDef, hasSymbol } from 'core/util/index'

/**
 * Runtime helper for rendering v-for lists.
 */
/**
 * @example _l((items),function(item,key){return _c('span',[_v(_s(item.value))])})
 * @param {any} val 被遍历对象 
 * @param {string | number} render render函数 
 * @param {number} index 索引
 * @returns {Array<VNode>} 返回VNode数组
 */
export function renderList (
  val: any,
  render: (
    val: any,
    keyOrIndex: string | number,
    index?: number
  ) => VNode
): ?Array<VNode> {
  let ret: ?Array<VNode>, i, l, keys, key
  if (Array.isArray(val) || typeof val === 'string') {
    // 如果是数组、字符串，则遍历数组的每一项，执行render函数
    ret = new Array(val.length)
    for (i = 0, l = val.length; i < l; i++) {
      ret[i] = render(val[i], i)
    }
  } else if (typeof val === 'number') {
    // 如果是数字，render第一个值为1，2，3，4...
    ret = new Array(val)
    for (i = 0; i < val; i++) {
      ret[i] = render(i + 1, i)
    }
  } else if (isObject(val)) {
    // 如果是对象
    if (hasSymbol && val[Symbol.iterator]) {
      // 如果是包含Symbol的对象
      /**
       * @example
       * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of
       * const iterable = {
       *   [Symbol.iterator]() {
       *     return {
       *       i: 0,
       *       next() {
       *         if (this.i < 3) {
       *           return { value: this.i++, done: false };
       *         }
       *         return { value: undefined, done: true };
       *       }
       *     };
       *   }
       * };
       * 
       * for (const value of iterable) {
       *   console.log(value);
       * }
       * 0
       * 1
       * 2
       */
      ret = []
      const iterator: Iterator<any> = val[Symbol.iterator]()
      let result = iterator.next()
      while (!result.done) {
        ret.push(render(result.value, ret.length))
        result = iterator.next()
      }
    } else {
      // 对象
      keys = Object.keys(val)
      ret = new Array(keys.length)
      for (i = 0, l = keys.length; i < l; i++) {
        key = keys[i]
        ret[i] = render(val[key], key, i)
      }
    }
  }
  if (!isDef(ret)) {
    ret = []
  }
  (ret: any)._isVList = true
  return ret
}
