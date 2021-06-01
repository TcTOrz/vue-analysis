/**
 * Not type-checking this file because it's mostly vendor code.
 */

/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson (MPL-1.1 OR Apache-2.0 OR GPL-2.0-or-later)
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

import { makeMap, no } from 'shared/util'
import { isNonPhrasingTag } from 'web/compiler/util'
import { unicodeRegExp } from 'core/util/lang'

// Regular Expressions for parsing tags and attributes
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+?\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
const doctype = /^<!DOCTYPE [^>]+>/i
// #7298: escape - to avoid being passed as HTML comment when inlined in page
// 转义 - 避免在页面内联时被作为HTML注释传递。
const comment = /^<!\--/
const conditionalComment = /^<!\[/

// Special Elements (can contain anything)
export const isPlainTextElement = makeMap('script,style,textarea', true)
const reCache = {}

const decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t',
  '&#39;': "'"
}
const encodedAttr = /&(?:lt|gt|quot|amp|#39);/g
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g

// #5992
const isIgnoreNewlineTag = makeMap('pre,textarea', true)
const shouldIgnoreFirstNewline = (tag, html) => tag && isIgnoreNewlineTag(tag) && html[0] === '\n'

function decodeAttr (value, shouldDecodeNewlines) {
  const re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr
  return value.replace(re, match => decodingMap[match])
}

// 此时html字符串已经被html.trim()过
export function parseHTML (html, options) {
  const stack = []
  const expectHTML = options.expectHTML
  // 是否是自闭合标签
  const isUnaryTag = options.isUnaryTag || no
  // 是否可以只有开始标签
  const canBeLeftOpenTag = options.canBeLeftOpenTag || no
  // 记录html字符串位置
  let index = 0
  let last, lastTag
  while (html) {
    last = html
    // Make sure we're not in a plaintext content element like script/style
    // 确保不是在 script、style、textarea 这样的纯文本元素中
    if (!lastTag || !isPlainTextElement(lastTag)) {
      // 找出首个<
      let textEnd = html.indexOf('<')
      // textEnd === 0 说明在开头找到了
      // 分别处理可能找到的注释标签、条件注释标签、Doctype、开始标签、结束标签
      // 每处理完一种情况，就会截断（continue）循环，并且重置 html 字符串，
      // 将处理过的标签截掉advance，下一次循环处理剩余的 html 字符串模版
      if (textEnd === 0) {
        // 注释标签 <!-- Comment -->
        // Comment:
        if (comment.test(html)) {
          const commentEnd = html.indexOf('-->')

          if (commentEnd >= 0) {
            if (options.shouldKeepComment) {
              // 传入三个值
              // 注释文本，开始位置，结束位置
              options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3)
            }
            // 处理完成，跳过注释节点
            advance(commentEnd + 3)
            continue
          }
        }

        // 条件注释节点
        // <![if !IE]>
        //   <link href="non-ie.css" rel="stylesheet">
        // <![endif]>
        // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        if (conditionalComment.test(html)) {
          // 结束位置
          const conditionalEnd = html.indexOf(']>')

          if (conditionalEnd >= 0) {
            // 跳过条件注释节点
            advance(conditionalEnd + 2)
            continue
          }
        }

        // <!DOCTYPE html>
        // Doctype:
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          advance(doctypeMatch[0].length)
          continue
        }

        // 结束标签
        // </div>...
        // End tag:
        // /^<\/((?:[a-zA-Z_][\-\.0-9_a-zA-Za-zA-Z]*\:)?[a-zA-Z_][\-\.0-9_a-zA-Za-zA-Z]*)[^>]*>/
        // 之所以加上非捕获括号?: ，是由于xml中可能有类似下面格式的xml
        // <q:Test></q:Test>
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          const curIndex = index
          // '</html>'.match(/^<\/([a-zA-Z_][\-\.0-9_a-zA-Za-zA-Z]*)[^>]*>/)
          // endTagMatch: ["</html>", "html", index: 0, input: "</html>", groups: undefined]
          advance(endTagMatch[0].length)
          // 处理结束标签
          parseEndTag(endTagMatch[1], curIndex, index)
          continue
        }

        // 开始标签
        // <div id="app">，startTagMatch = { tagName: 'div', attrs: [[xx], ...], start: index }
        // Start tag:
        const startTagMatch = parseStartTag()
        if (startTagMatch) {
          // 进一步处理上一步得到结果，并最后调用 options.start 方法
          // 真正的解析工作都是在这个 start 方法中做的
          handleStartTag(startTagMatch)
          if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
            advance(1)
          }
          continue
        }
      }

      let text, rest, next
      if (textEnd >= 0) {
        // 也有可能现在处于结束标签和开始标签之间
        // 能走到这儿，说明虽然在 html 中匹配到到了 <xx，但是这不属于上述几种情况，
        // 它就只是一个普通的一段文本：我是文本<
        // 于是从 html 中找到下一个 <，直到 <xx 是上述几种情况的标签，则结束，
        // 在这整个过程中一直在调整 textEnd 的值，作为 html 中下一个有效标签的开始位置
        rest = html.slice(textEnd)
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          // 走到这里说明在纯文本中出现了<符号，需要记录并跳过它
          // < in plain text, be forgiving and treat it as text
          next = rest.indexOf('<', 1)
          if (next < 0) break
          textEnd += next
          rest = html.slice(textEnd)
        }
        text = html.substring(0, textEnd)
      }

      if (textEnd < 0) {
        text = html
      }

      if (text) {
        advance(text.length)
      }

      if (options.chars && text) {
        options.chars(text, index - text.length, index)
      }
    } else {
      let endTagLength = 0
      const stackedTag = lastTag.toLowerCase()
      const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'))
      const rest = html.replace(reStackedTag, function (all, text, endTag) {
        endTagLength = endTag.length
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
        }
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1)
        }
        if (options.chars) {
          options.chars(text)
        }
        return ''
      })
      index += html.length - rest.length
      html = rest
      parseEndTag(stackedTag, index - endTagLength, index)
    }

    if (html === last) {
      options.chars && options.chars(html)
      if (process.env.NODE_ENV !== 'production' && !stack.length && options.warn) {
        options.warn(`Mal-formatted tag at end of template: "${html}"`, { start: index + html.length })
      }
      break
    }
  }

  // Clean up any remaining tags
  parseEndTag()

  function advance (n) {
    index += n
    html = html.substring(n)
  }

  function parseStartTag () {
    // /^<((?:[a-zA-Z_][\-\.0-9_a-zA-Za-zA-Z]*\:)?[a-zA-Z_][\-\.0-9_a-zA-Za-zA-Z]*)/
    // 之所以加上非捕获括号?: ，是由于xml中可能有类似下面格式的xml
    // <q:Test></q:Test> 匹配： q:Test
    // <div id="id" class="classname"></div> 匹配 div
    const start = html.match(startTagOpen)
    if (start) {
      const match = {
        tagName: start[1],
        attrs: [],
        start: index
      }
      // 跳过开始标签，不跳过包括id='' class=''等属性，类似：<div
      advance(start[0].length)
      let end, attr
      // startTagClose匹配关闭标签/^\s*(\/?)>/ '    >'
      // dynamicArgAttribute匹配动态属性 https://cn.vuejs.org/v2/guide/syntax.html#%E5%8A%A8%E6%80%81%E5%8F%82%E6%95%B0
      // /^\s*(
      //   (?:v-[\w-]+:|@|:|#)\[[^=]+?\][^\s"'<>\/=]*
      // )
      // (?:\s*
      //   (=)\s*
      //   (?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+))
      // )?/
      // attribute匹配属性
      // /^\s*
      // ([^\s"'<>\/=]+) ===> 除空白字符"'<>\/=，其他都匹配
      // (?:\s*
      //   (=)\s*
      //   (?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+))
      // )?/
      // 属性匹配，将匹配的属性push进match.attrs
      while (!(end = html.match(startTagClose)) && (attr = html.match(dynamicArgAttribute) || html.match(attribute))) {
        attr.start = index
        advance(attr[0].length)
        attr.end = index
        match.attrs.push(attr)
      }
      // 属性结束匹配，根据end位是否是/来判断是否是单闭合标签
      if (end) {
        match.unarySlash = end[1]
        advance(end[0].length)
        match.end = index
        return match
      }
    }
  }

  // 处理开始标签
  function handleStartTag (match) {
    const tagName = match.tagName
    const unarySlash = match.unarySlash

    if (expectHTML) {
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        parseEndTag(lastTag)
      }
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        parseEndTag(tagName)
      }
    }

    // 是否是自闭合标签
    const unary = isUnaryTag(tagName) || !!unarySlash

    const l = match.attrs.length
    const attrs = new Array(l)
    for (let i = 0; i < l; i++) {
      const args = match.attrs[i]
      const value = args[3] || args[4] || args[5] || ''
      const shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
        ? options.shouldDecodeNewlinesForHref
        : options.shouldDecodeNewlines
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, shouldDecodeNewlines)
      }
      // 非生产环境，记录属性的开始和结束索引
      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        attrs[i].start = args.start + args[0].match(/^\s*/).length
        attrs[i].end = args.end
      }
    }
    // 如果不是自闭合标签，则将标签信息放到 stack 数组中，
    // 待将来处理到它的闭合标签时再将其弹出 stack。
    // 如果是自闭合标签，则标签信息就没必要进入 stack 了，
    // 直接处理众多属性，将他们都设置到 element ast 对象上，
    // 就没有处理 结束标签的那一步了，这一步在处理开始标签的过程中就进行了。
    if (!unary) {
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs, start: match.start, end: match.end })
      lastTag = tagName
    }

    /**
     * 调用 start 方法，主要做了以下 6 件事情:
     *   1、创建 AST 对象
     *   2、处理存在 v-model 指令的 input 标签，分别处理 input 为 checkbox、radio、其它的情况
     *   3、处理标签上的众多指令，比如 v-pre、v-for、v-if、v-once
     *   4、如果根节点 root 不存在则设置当前元素为根节点
     *   5、如果当前元素为非自闭合标签则将自己 push 到 stack 数组，并记录 currentParent，在接下来处理子元素时用来告诉子元素自己的父节点是谁
     *   6、如果当前元素为自闭合标签，则表示该标签要处理结束了，让自己和父元素产生关系，以及设置自己的子元素
     */
    if (options.start) {
      options.start(tagName, attrs, unary, match.start, match.end)
    }
  }

  function parseEndTag (tagName, start, end) {
    let pos, lowerCasedTagName
    if (start == null) start = index
    if (end == null) end = index

    // Find the closest opened tag of the same type
    // 寻找最近已经打开的标签
    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase()
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0
    }

    if (pos >= 0) {
      // 关闭比stack中索引等于pos的栈
      // Close all the open elements, up the stack
      for (let i = stack.length - 1; i >= pos; i--) {
        if (process.env.NODE_ENV !== 'production' &&
        // 如果stack中的i和pos不对应，说明tag不匹配。
          (i > pos || !tagName) &&
          options.warn
        ) {
          options.warn(
            `tag <${stack[i].tag}> has no matching end tag.`,
            { start: stack[i].start, end: stack[i].end }
          )
        }
        if (options.end) {
          options.end(stack[i].tag, start, end)
        }
      }

      // Remove the open elements from the stack
      stack.length = pos
      lastTag = pos && stack[pos - 1].tag
    } else if (lowerCasedTagName === 'br') {
      if (options.start) {
        options.start(tagName, [], true, start, end)
      }
    } else if (lowerCasedTagName === 'p') {
      if (options.start) {
        options.start(tagName, [], false, start, end)
      }
      if (options.end) {
        options.end(tagName, start, end)
      }
    }
  }
}
