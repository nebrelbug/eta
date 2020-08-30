import compileToString from './compile-string.ts'
import { getConfig } from './config.ts'
import EtaErr from './err.ts'

/* TYPES */

import { EtaConfig, PartialConfig } from './config.ts'
import { CallbackFn } from './file-handlers.ts'
import { getAsyncFunctionConstructor } from './polyfills.ts'
export type TemplateFunction = (data: object, config: EtaConfig, cb?: CallbackFn) => string

/* END TYPES */

export default function compile(str: string, env?: PartialConfig): TemplateFunction {
  var options: EtaConfig = getConfig(env || {})
  var ctor // constructor

  /* ASYNC HANDLING */
  // The below code is modified from mde/ejs. All credit should go to them.
  if (options.async) {
    ctor = getAsyncFunctionConstructor() as FunctionConstructor
  } else {
    ctor = Function
  }
  /* END ASYNC HANDLING */
  try {
    return new ctor(
      options.varName,
      'E', // EtaConfig
      'cb', // optional callback
      compileToString(str, options)
    ) as TemplateFunction // eslint-disable-line no-new-func
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw EtaErr(
        'Bad template syntax\n\n' +
          e.message +
          '\n' +
          Array(e.message.length + 1).join('=') +
          '\n' +
          compileToString(str, options) +
          '\n' // This will put an extra newline before the callstack for extra readability
      )
    } else {
      throw e
    }
  }
}