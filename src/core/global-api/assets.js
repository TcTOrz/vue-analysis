/*
 * @Author: Li Jian
 * @Date: 2021-03-24 13:23:17
 * @LastEditTime: 2021-05-19 15:32:04
 * @LastEditors: Li Jian
 */
/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach(type => {
    // 比如：Vue.component(name, definition)
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      // 如果未定义则直接取option中的数据
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        if (type === 'component' && isPlainObject(definition)) {
          // 如果组件配置中存在 name，则使用，否则直接使用 id
          definition.name = definition.name || id
          // Vue.extend，所以这时的 definition 就变成了 组件构造函数，使用时可直接 new Definition()
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // 在实例化时通过 mergeOptions 将全局注册的组件合并到每个组件的配置对象的 components 中
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
