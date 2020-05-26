/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'

/**
 * Compile a template.
 */
export function compile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 生成 AST
  const ast = parse(template.trim(), options)
  // 优化 AST，对于静态节点进行缓存，在 patch 阶段、re-render 阶段直接跳过，提高性能。
  optimize(ast, options)
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
}
