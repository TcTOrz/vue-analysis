/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
// 观察者类
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    // value.__ob__ = this 这样定义有没问题？ def中配置了不可枚举属性。后续不需要循环__ob__参数
    def(value, '__ob__', this) // 这么定义是为了observe方法中，如果定义过，就直接返回属性
    if (Array.isArray(value)) {
      // value为数组
      // hasProto = '__proto__' in {}
      // 由于__proto__不是标准属性，可能存在不支持的情况
      // 操作原型链，覆盖数据默认的七个方法，实现数组的响应式
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      this.observeArray(value) // 数组循环并递归
    } else { // 对象
      // 为对象的每个属性增加响应式
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  // 遍历数组，设置响应式
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
// 响应式入口
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 非对象或者是VNode实例不做处理
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // value对象存在__ob__属性，说明已经做过观察，直接返回ob
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    // 创建观察者实例
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++ // 用来记录此Vue实例被使用次数，例如组件logo，页面头部底部都需要展示，都用到了这个组件，那么此时，vmCount就会计数为2
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
// 拦截obj[key]
// 第一次读取时收集依赖，执行render函数生成vnode时会有读取操作
// 更新时设置新值并通知依赖更新
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 实例化dep，每次实例化，对应dep.id加一
  const dep = new Dep()

  // 获取obj[key]的属性描述符，不可配置直接返回
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // 缓存 getter 与 setter
  // 防止后续通过 Object.defineProperty 时被重写
  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  // walk()方法传入长度为2
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 递归调用
  // shallow 为 false 时监听 val(对象的值)，即深度监听
  // - 当val是数组时，childOb被用来向当前watcher收集依赖
  // - 当val是普通对象时，set/del函数也会用childOb来通知val的属性添加/删除
  let childOb = !shallow && observe(val)
  // Object.defineProperty的一些缺陷
  // 只能对对象的属性进行拦截
  // 不支持数组索引的访问器定义
  // 属性必须先初始化才能定义拦截(基于属性的局限性)
  // 虽然 Object.defineProperty 有上述的缺陷，但是vue 2还是实现了几乎全场景的自动响应(只限对象和数组，数组不能索引操作)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () { // 依赖收集，执行render时，就能访问到get方法
      const value = getter ? getter.call(obj) : val // 调用默认的getter方法的值
      // 劫持get方法，在创建watcher实例时，通过调用对象的get方法往订阅器dep上添加这个创建的watcher实例
      /**
       * Dep.target 为 Dep 类的一个静态属性，值为 watcher，在实例化 Watcher 时会被设置
       * 实例化 Watcher 时会执行 new Watcher 时传递的回调函数（computed 除外，因为它懒执行）
       * 而回调函数中如果有 vm.key 的读取行为，则会触发这里的 读取 拦截，进行依赖收集
       * 回调函数执行完以后又会将 Dep.target 设置为 null，避免这里重复收集依赖
       */
      if (Dep.target) {
        // dep收集依赖
        // 依赖收集，在 dep 中添加 watcher，也在 watcher 中添加 dep
        dep.depend()
        // 如果子类观察者存在
        // 考虑到如果 value 是数组，那么 value 的 push/shift 之类的操作，
        // 是触发不了下面的 setter 的，即 dep.depend 在这种情况不会被调用。
        // 此时，childOb 即value这个数组对应的 ob，数组的操作会通知到childOb，
        // 所以可以替代 dep 来通知 watcher。
        // childOb 表示对象中嵌套对象的观察者对象，如果存在也对其进行依赖收集
        if (childOb) {
          // 子类收集依赖
          // 这就是 this.key.chidlKey 被更新时能触发响应式更新的原因
          childOb.dep.depend()
          // 如果是数组，遍历每个元素来收集依赖
          if (Array.isArray(value)) {
            // 为数组项为对象的项添加依赖
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) { // 派发更新
      // 旧的 obj[key]
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // NaN
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // 原始数据中有getter，但是没有setter则直接返回，只读属性
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      // 设置新值
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 这里需要对设置的新值进行一次观察
      childOb = !shallow && observe(newVal)
      // 依赖更新
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 更新数组指定下标的元素，Vue.set(array, idx, val)，通过 splice 方法实现响应式更新
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  // 更新对象已有属性，Vue.set(obj, key, val)，执行更新即可
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  // 不能向 Vue 实例或者 根$data 添加动态添加响应式属性，vmCount 的用处之一，
  // this.$data 的 ob.vmCount = 1，表示根组件，其它子组件的 vm.vmCount 都是 0
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // target不是响应式，则直接返回数据，不做响应式处理
  if (!ob) {
    target[key] = val
    return val
  }
  // 将该属性变为响应式/赋值
  defineReactive(ob.value /* target */, key, val)
  // 如果val不是对象或数组， defineReactive(ob.value /* target */, key, val)还可以写成下面的形式
  // ob.value[key] = val;

  // defineReactive(target, key, val)
  //  let childOb = !shallow && observe(val) 这里的ob已经实例化过了
  // ob.dep对象在Observer中
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 数组通过splice删除
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  // 属性不存在
  if (!hasOwn(target, key)) {
    return
  }
  // 删除属性
  delete target[key]
  if (!ob) {
    return
  }
  // 执行依赖更新
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
/**
 * 遍历每个数组元素，递归处理数组项为对象的情况，为其添加依赖
 * 因为前面的递归阶段无法为数组中的对象元素添加依赖
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
