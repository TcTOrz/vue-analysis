/*
 * @Author: Li Jian
 * @Date: 2021-03-24 13:23:17
 * @LastEditTime: 2021-05-21 10:36:12
 * @LastEditors: Li Jian
 */
/* @flow */

import { extend } from 'shared/util'
import { detectErrors } from './error-detector'
import { createCompileToFunctionFn } from './to-function'

export function createCompilerCreator (baseCompile: Function): Function {
  return function createCompiler (baseOptions: CompilerOptions) {
    /**
     * 编译函数，做了两件事：
     *   1、选项合并，将 options 配置项 合并到 finalOptions(baseOptions) 中，得到最终的编译配置对象
     *   2、调用核心编译器 baseCompile 得到编译结果
     *   3、将编译期间产生的 error 和 tip 挂载到编译结果上，返回编译结果
     */
    function compile (
      template: string,
      options?: CompilerOptions
    ): CompiledResult {
      const finalOptions = Object.create(baseOptions)
      const errors = []
      const tips = []

      let warn = (msg, range, tip) => {
        (tip ? tips : errors).push(msg)
      }

      if (options) {
        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          // 字符串开头空白长度 例如:' string'返回1，'  string'返回2
          // $flow-disable-line
          const leadingSpaceLength = template.match(/^\s*/)[0].length

          // warn方法覆盖，增强warn方法
          warn = (msg, range, tip) => {
            const data: WarningMessage = { msg }
            if (range) {
              if (range.start != null) {
                data.start = range.start + leadingSpaceLength
              }
              if (range.end != null) {
                data.end = range.end + leadingSpaceLength
              }
            }
            (tip ? tips : errors).push(data)
          }
        }
        // 合并自定义modules
        // merge custom modules
        if (options.modules) {
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules)
        }
         // 合并自定义指令
        // merge custom directives
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )
        }
        // 拷贝其它配置项
        // copy other options
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }

      finalOptions.warn = warn

      // 调用核心编译函数，传递模版字符串和最终的编译选项，得到编译结果
      // 前面做的所有事情都是为了构建平台最终的编译选项
      const compiled = baseCompile(template.trim(), finalOptions)
      if (process.env.NODE_ENV !== 'production') {
        detectErrors(compiled.ast, warn)
      }
      // 将编译期间产生的错误和提示挂载到编译结果上
      compiled.errors = errors
      compiled.tips = tips
      return compiled
    }

    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}
