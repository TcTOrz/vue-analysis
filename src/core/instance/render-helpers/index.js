/* @flow */

import { toNumber, toString, looseEqual, looseIndexOf } from 'shared/util'
import { createTextVNode, createEmptyVNode } from 'core/vdom/vnode'
import { renderList } from './render-list'
import { renderSlot } from './render-slot'
import { resolveFilter } from './resolve-filter'
import { checkKeyCodes } from './check-keycodes'
import { bindObjectProps } from './bind-object-props'
import { renderStatic, markOnce } from './render-static'
import { bindObjectListeners } from './bind-object-listeners'
import { resolveScopedSlots } from './resolve-scoped-slots'
import { bindDynamicKeys, prependModifier } from './bind-dynamic-keys'

export function installRenderHelpers (target: any) {
  // v-once：为VNode加上静态标记，isOnce = true / isStatic = true
  target._o = markOnce
  target._n = toNumber
  target._s = toString
  // v-for： 为VNode打上标记，_isVList = true，返回一个VNode数组
  target._l = renderList
  // TODO slot
  target._t = renderSlot
  // 比较值相等，不考虑引用
  target._q = looseEqual
  // 对象中第一个松散相等的索引，没有返回-1
  target._i = looseIndexOf
  // 静态标记，为VNode加上静态标记，isOnce = true / isStatic = true
  target._m = renderStatic
  target._f = resolveFilter
  target._k = checkKeyCodes
  target._b = bindObjectProps
  // 文本VNode
  target._v = createTextVNode
  // 空节点VNode
  target._e = createEmptyVNode
  target._u = resolveScopedSlots
  target._g = bindObjectListeners
  target._d = bindDynamicKeys
  target._p = prependModifier
}
