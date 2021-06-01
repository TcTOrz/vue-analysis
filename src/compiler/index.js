/*
 * @Author: Li Jian
 * @Date: 2021-03-24 13:23:17
 * @LastEditTime: 2021-05-31 15:48:58
 * @LastEditors: Li Jian
 */
/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

/**
 * 在这之前做的所有的事情，只有一个目的，就是为了构建平台特有的编译选项（options），比如 web 平台
 * 
 * 1、将 html 模版解析成 ast
 * 2、对 ast 树进行静态标记
 * 3、将 ast 生成渲染函数
 *    静态渲染函数放到  code.staticRenderFns 数组中
 *    code.render 为动态渲染函数
 *    在将来渲染时执行渲染函数得到 vnode
 */
// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 将html转化为AST对象
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    // 优化，也叫静态标记，遍历 AST 对象，标记每个节点是否为静态节点，以及标记出静态根节点
    // 优化，遍历 AST，为每个节点做静态标记
    // 标记每个节点是否为静态节点，然后进一步标记出静态根节点
    // 这样在后续更新的过程中就可以跳过这些静态节点了
    // 标记静态根，用于生成渲染函数阶段，生成静态根节点的渲染函数
    optimize(ast, options)
  }
  // 将 AST 对象生成渲染函数
  // 代码生成，将 ast 转换成可执行的 render 函数的字符串形式
  // code = {
  //   render: `with(this){return ${_c(tag, data, children, normalizationType)}}`,
  //   staticRenderFns: [_c(tag, data, children, normalizationType), ...]
  // }
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
