<!--
 * @Author: Li Jian
 * @Date: 2021-03-24 13:23:17
 * @LastEditTime: 2021-06-09 16:08:48
 * @LastEditors: Li Jian
-->
> 基于Vue 2.6.12注释，部分注释摘自其他人。

### Vue初始化流程

- 实例化Vue. -> new Vue()
- 初始化. -> Vue.protptype._init()
- 挂载. -> Vue.prototype.$mount()
- 执行渲染函数. -> Vue.prototype._render()
- 执行patch函数. -> Vue.prototype.__patch __()
- 渲染页面

初始化大概就做了上面这几件事，其中每一步又包含了对函数的各种处理，比如说options合并，props，data，method等对象的初始化，响应式的处理，render函数的生成，patch处理Vnode生成DOM。

### 响应式原理

- 首先，observe观察对象，并为该对象创建Observer实例。
- 在观察的过程中给每个Observer实例初始化一个Dep实例，此时，还未进行依赖收集。Dep(dependence)依赖，用来收集Watcher实例。
- 挂载/初始化过程中实例化Watcher，实例化Watcher的过程中，会触发(render函数触发的)响应式的getter方法，此时，会进行依赖收集，当前的Watcher实例会被写入到的Dep中(只有在Watcher实例化过程中读取的对象里的Dep才会被写入Watcher)，此时，VNode中的数据被更新。
- 当被观察的数据改动时，会触发响应式的setter方法，这时会触发dep.notify，此时，当前对象绑定的Dep实例中的Watcher实例会被触发，并再一次触发响应式getter方法，再一次进行依赖收集，在这过程中，VNode中的数据再次被更新。

> 注意: Dep和Watcher是多对多的关系。即一个Dep实例中可能有多个Watcher(比如watch+computed+渲染Watcher)，一个Watcher中也可能有多个Dep(这个基本上都是)。

可能解释的有些绕，我也想用一个简单的比喻来解释这一过程，可惜，想了很久，没有想到一个合适的例子。

### computed原理

本质上，computed也是一个Watcher实例。但是注意，在实例化时，初始化值中 lazy = true, 即dirty = true。

> 注意: computed中的属性不能与data、props、methods中的属性重复，否则会报 `The computed property "${key}" is already defined in xxx.`错误。

> 注意: 如果给computed属性赋值，就一定要有set函数，否则会有报错，并且赋值失败。

> 疑惑点：defineComputed函数中，在测试环境下，如果此时值函数或者是只有get的对象时，会报出`Computed property "${key}" was assigned to but it has no setter.`的警告。完全可以不用支持函数。

Watcher实例化顺序: computed Watcher -> render Watcher。

而在渲染时，先运行渲染Watcher中的get方法，进而在template中找到需要被computed的值->嵌套运行computed Watcher中的代码
更新一定是渲染Watcher触发更新，而computed Watcher只是做辅助(lazy、dirty)作用。

起到缓存作用的也是dirty参数，当值被更新时，dirty设为false，进行缓存。在实例化时将dirty值传给lazy属性并保留，当值改变时触发set，则将dirty变为true，触发更新。

### watch原理

本质上，watch也是一个Watcher实例。但是注意，在实例化时，初始化值中 user = true，标识为用户watcher。

watch 中的Watcher实例也是先于render Watcher前执行的。此时，schedule队列的作用在这里可以看出。

immediate: true 当前表达式立即触发回调。发生在render Watcher实例化之前。

### diff原理

递归循环同层新旧Vnode，循环体中一次执行下面五种if。
- 1、旧开、新开相等: 依次更新每一个elm，然后新开旧开索引加1。
- 2、旧结、新结相等：与第一条类似，然后旧结、新结索引减1。
- 3、旧开、新结相等: elm节点中将旧开第一条位置移到最后一位，然后旧开索引加1、新结索引减1。
- 4、旧结、新开相等：elm节点中将旧结最后一条位置移到第一位，然后旧结减1、新开加1。
- 5、如果上面四种情况都不符合,那么就通过遍历找到新开节点在老节点中的位置索引，然后在elm中插入、交换位置。

跳出循环后，
- 当旧开>旧结，说明新节点有剩余，则需要将剩余节点插入到elm中。
- 当新开>新结，说明旧节点有剩余，则需要在elm中移除这些节点。

### keep-alive原理

### 生命周期

- 初始化生命周期函数 -> 初始化事件 -> 初始化render函数 -> 调用beforeCreate钩子
- 初始化Inject函数 -> 响应式(props -> methods -> data -> computed -> watch) -> 初始化Provide函数 -> 调用created钩子
- 开始挂载 -> 开始编译html -> 执行parse函数，将html转化成AST抽象语法树 -> 优化AST，标记静态节点和静态根节点 -> 生成render函数 -> 编译结束 -> 调用beforeMount钩子
- 实例化渲染Watcher -> 执行render函数(期间触发响应式getter，添加依赖) -> 执行patch函数(diff算法) -> 调用mounted钩子

### 总结

其实总结下来我觉得就一句话，每个数据都有其绑定的Dep，Dep中包含的所有与本数据相关的Watcher，当该数据改变时，找到当前数据的Dep，并遍历其包含的Watcher进行一一更新。

Watcher中包含若干Dep: 哪些数据使用该Watcher，用来筛选去重相同的dep。
Dep中包含若干Watcher: 用于更新每个Watcher中的函数。

### 另外

部分注释是vscode自动加上的，比如每个页面页头位置，懒得改了，请忽略~
