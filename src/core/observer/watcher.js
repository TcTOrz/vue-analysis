/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  invokeWithErrorHandling,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
/**
 * 一个组件一个 watcher（渲染 watcher）或者一个表达式一个 watcher（用户watcher）
 * 当数据更新时 watcher 会被触发，访问 this.computedProperty 时也会触发 watcher
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean // 渲染watcher
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    // 用来看当前的函数，具体没什么用处
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      // this.getter = function() { return this.xx }
      // 在 this.get 中执行 this.getter 时会触发依赖收集
      // 待后续 this.xx 更新时就会触发响应式
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  /**
   * 执行 this.getter，并重新收集依赖
   * this.getter 是实例化 watcher 时传递的第二个参数，一个函数或者字符串，
   * 比如：updateComponent 或者 parsePath 返回的读取 this.xx 属性值的函数
   * 为什么要重新收集依赖？
   *   因为触发更新说明有响应式数据被更新了，但是被更新的数据虽然已经经过 observe 观察了，但是却没有进行依赖收集，
   *   所以，在更新页面时，会重新执行一次 render 函数，执行期间会触发读取操作，这时候进行依赖收集
   */
  get () {
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // 首先调用一次getter
      // 执行回调函数，比如 updateComponent，进入 patch 阶段
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value) // deep watch
      }
      popTarget()
      this.cleanupDeps() // 每次运行完后移除旧的订阅。避免浪费
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  // 添加dep到watcher
  // 添加watcher到dep
  addDep (dep: Dep) {
    const id = dep.id
    // 新的没有、旧的没有，增加sub，新的增加
    // 新的没有、旧的有，新的增加
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      // Vue.set() 此时被跳过 v-model, {{ name }} - {{ name }}等， 在dep.js addSub方法可以打debugger看一下
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   * 清除一些依赖收集
   * 为什么？--数据改变，每次触发重新渲染-->重新render-->重新addDep
   * 作用：把所有的 dep 做一次比对，只要新的一轮渲染中，没有对应订阅的 watcher ，
   * 就把旧的 watcher订阅 移除了，避免页面中数据已经不再使用了，但是代码修改还会触发重新渲染，浪费性能
   *  newDepIds 和 newDeps 每次都会在addDep新增，上面的判断只能保证不会重复添加旧的
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      // 新的里面没有旧的dep，移除watcher
      // 对持有的watcher进行筛选，如果新的里面都没有对应的id，则说明当前watcher用不到，可以移除。
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    // Set
    let tmp = this.depIds // 引用指向tmp 
    this.depIds = this.newDepIds // depIds引用改为newDepIds
    this.newDepIds = tmp // 将tmp引用指向newDepIds
    this.newDepIds.clear() // 上面这样操作是防止删除时，newDepIds、depId都被删除
    // array
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0 // 上面这样操作是防止删除时，newDepIds、depId都被删除
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      // 懒执行，例如computed
      // 将 dirty 置为 true，可以让 computedGetter 执行时重新计算 computed 回调函数的执行结果
      this.dirty = true
    } else if (this.sync) {
      // 同步执行，在使用 vm.$watch 或者 watch 选项时可以传一个 sync 选项，
      // 当为 true 时在数据更新时该 watcher 就不走异步更新队列，直接执行 this.run 
      // 方法进行更新
      // 这个属性在官方文档中没有出现
      this.run()
    } else {
      // 更新时一般都这里，将 watcher 放入 watcher 队列
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */

  /**
   * 由 刷新队列函数 flushSchedulerQueue 调用，完成如下几件事：
   *   1、执行实例化 watcher 传递的第二个参数，updateComponent 或者 获取 this.xx 的一个函数(parsePath 返回的函数)
   *   2、更新旧值为新值
   *   3、执行实例化 watcher 时传递的第三个参数，比如用户 watcher 的回调函数
   */
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        // 更新旧值为新值
        const oldValue = this.value
        this.value = value
        if (this.user) {
          // 如果是用户 watcher，则执行用户传递的第三个参数 —— 回调函数，参数为 val 和 oldVal
          const info = `callback for watcher "${this.expression}"`
          invokeWithErrorHandling(this.cb, this.vm, [value, oldValue], this.vm, info)
        } else {
          // 渲染 watcher，this.cb = noop，一个空函数
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  /**
   * 懒执行的 watcher 会调用该方法
   *   比如：computed，在获取 vm.computedProperty 的值时会调用该方法
   * 然后执行 this.get，即 watcher 的回调函数，得到返回值
   * this.dirty 被置为 false，作用是页面在本次渲染中只会一次 computed.key 的回调函数，
   *   这也是大家常说的 computed 和 methods 区别之一是 computed 有缓存的原理所在
   * 而页面更新后会 this.dirty 会被重新置为 true，这一步是在 this.update 方法中完成的
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
