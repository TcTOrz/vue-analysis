> 基于Vue 2.6.12注释，部分注释摘自其他人。

### Vue初始化流程

- 实例化Vue. -> new Vue()
- 初始化. -> Vue.protptype._init()
- 挂载. -> Vue.prototype.$mount()
- 执行渲染函数. -> Vue.prototype._render()
- 执行patch函数. -> Vue.prototype.__patch __()
- 渲染页面

初始化大概就做了上面这几件事，其中每一步又包含了对函数的各种处理，比如说options合并，props，data，method等对象的初始化，响应式的处理，render函数的生成，patch处理Vnode生成DOM。
