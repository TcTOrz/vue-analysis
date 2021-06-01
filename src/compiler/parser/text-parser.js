/*
 * @Author: Li Jian
 * @Date: 2021-03-24 13:23:17
 * @LastEditTime: 2021-05-25 15:49:13
 * @LastEditors: Li Jian
 */
/* @flow */

import { cached } from 'shared/util'
import { parseFilters } from './filter-parser'

// .匹配换行符以外的任意字符，+?非贪婪匹配 匹配 `{{t0}}othersize{{t1}}...`中的["{{t0}}", "{{t1}}"]
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g // ====> /\{\{((.|\r?\n)+?)\}\}/g
const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g

const buildRegex = cached(delimiters => {
  // $&: 插入匹配的子串。https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/String/replace
  // '{{test}}'.replace(/[-.*+?^${}()|[\]\/\\]/g, '\\$&') ===> \\{\\{test\\}\\}
  const open = delimiters[0].replace(regexEscapeRE, '\\$&')
  const close = delimiters[1].replace(regexEscapeRE, '\\$&')
  return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
})

type TextParseResult = {
  expression: string,
  tokens: Array<string | { '@binding': string }>
}

export function parseText (
  text: string,
  delimiters?: [string, string]
): TextParseResult | void {
  // 如果没有传入delimiters,则使用默认{{}}
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE
  if (!tagRE.test(text)) {
    return
  }
  const tokens = []
  const rawTokens = []
  // RegExp.lastIndex 是正则表达式的一个可读可写的整型属性，
  // 用来指定下一次匹配的起始索引。
  let lastIndex = tagRE.lastIndex = 0
  let match, index, tokenValue
  while ((match = tagRE.exec(text))) {
    index = match.index
    // push text token
    if (index > lastIndex) {
      rawTokens.push(tokenValue = text.slice(lastIndex, index))
      tokens.push(JSON.stringify(tokenValue))
    }
    // tag token
    const exp = parseFilters(match[1].trim())
    tokens.push(`_s(${exp})`)
    rawTokens.push({ '@binding': exp })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    rawTokens.push(tokenValue = text.slice(lastIndex))
    tokens.push(JSON.stringify(tokenValue))
  }
  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}
