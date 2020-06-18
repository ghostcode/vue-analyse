/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'

/**
 * Compile a template.
 * 三个步骤：
 * 1.生成 AST
 * 2.优化 AST
 * 3.生成 render 函数和 staticRenderFns 数组
 */
export function compile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 生成 AST
  const ast = parse(template.trim(), options)
  // 优化 AST，对于静态节点进行缓存，在 patch 阶段、re-render 阶段直接跳过，提高性能。
  
  // 从代码中的注释我们可以看出，优化器的目的就是去找出 AST 中纯静态的子树：
  // 1.把纯静态子树提升为常量，每次重新渲染的时候就不需要创建新的节点了
  // 2.在 patch 的时候就可以跳过它们
  optimize(ast, options)
  // AST 生成 render 函数
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
}
