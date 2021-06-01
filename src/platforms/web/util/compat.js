/*
 * @Author: Li Jian
 * @Date: 2021-03-24 13:23:17
 * @LastEditTime: 2021-05-25 09:55:46
 * @LastEditors: Li Jian
 */
/* @flow */

import { inBrowser } from 'core/util/index'

// 检查当前浏览器是否对属性值内的字符进行编码
// check whether current browser encodes a char inside attribute values
let div
function getShouldDecode (href: boolean): boolean {
  div = div || document.createElement('div')
  div.innerHTML = href ? `<a href="\n"/>` : `<div a="\n"/>`
  return div.innerHTML.indexOf('&#10;') > 0
}

// IE对属性值内的换行符进行编码，而其他浏览器则没有。
// #3663: IE encodes newlines inside attribute values while other browsers don't
export const shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false
// chrome对a[href]中的内容进行编码。
// #6828: chrome encodes content in a[href]
export const shouldDecodeNewlinesForHref = inBrowser ? getShouldDecode(true) : false
