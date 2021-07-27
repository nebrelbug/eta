// express is set like: app.engine('html', require('eta').renderFile)

import EtaErr from './err'
import compile from './compile'
import { getConfig } from './config'
import { getPath, readFile } from './file-utils'
import { copyProps } from './utils'
import { promiseImpl } from './polyfills'

/* TYPES */

import type { EtaConfig, PartialConfig, EtaConfigWithFilename } from './config'
import type { TemplateFunction } from './compile'

export type CallbackFn = (err: Error | null, str?: string) => void

interface DataObj {
  /** Express.js settings may be stored here */
  settings?: {
    [key: string]: any // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  [key: string]: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface PartialConfigWithFilename extends Partial<EtaConfig> {
  filename: string
}

/* END TYPES */

/**
 * Reads a template, compiles it into a function, caches it if caching isn't disabled, returns the function
 *
 * @param filePath Absolute path to template file
 * @param options Eta configuration overrides
 * @param noCache Optionally, make Eta not cache the template
 */

export function loadFile(
  filePath: string,
  options: PartialConfigWithFilename,
  noCache?: boolean
): TemplateFunction {
  const config = getConfig(options)
  const template = options.readFile ? options.readFile(filePath) : readFile(filePath)
  try {
    const compiledTemplate = compile(template, config)
    if (!noCache) {
      config.templates.define((config as EtaConfigWithFilename).filename, compiledTemplate)
    }
    return compiledTemplate
  } catch (e) {
    throw EtaErr('Loading file: ' + filePath + ' failed:\n\n' + e.message)
  }
}

/**
 * Get the template from a string or a file, either compiled on-the-fly or
 * read from cache (if enabled), and cache the template if needed.
 *
 * If `options.cache` is true, this function reads the file from
 * `options.filename` so it must be set prior to calling this function.
 *
 * @param options   compilation options
 * @return Eta template function
 */

function handleCache(options: EtaConfigWithFilename): TemplateFunction {
  const filename = options.filename

  if (options.cache) {
    const func = options.templates.get(filename)
    if (func) {
      return func
    }

    return loadFile(filename, options)
  }

  // Caching is disabled, so pass noCache = true
  return loadFile(filename, options, true)
}

/**
 * Try calling handleCache with the given options and data and call the
 * callback with the result. If an error occurs, call the callback with
 * the error. Used by renderFile().
 *
 * @param data template data
 * @param options compilation options
 * @param cb callback
 */

function tryHandleCache(data: object, options: EtaConfigWithFilename, cb: CallbackFn | undefined) {
  if (cb) {
    try {
      // Note: if there is an error while rendering the template,
      // It will bubble up and be caught here
      const templateFn = handleCache(options)
      templateFn(data, options, cb)
    } catch (err) {
      return cb(err)
    }
  } else {
    // No callback, try returning a promise
    if (typeof promiseImpl === 'function') {
      return new promiseImpl<string>(function (resolve: Function, reject: Function) {
        try {
          const templateFn = handleCache(options)
          const result = templateFn(data, options)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      })
    } else {
      throw EtaErr("Please provide a callback function, this env doesn't support Promises")
    }
  }
}

/**
 * Get the template function.
 *
 * If `options.cache` is `true`, then the template is cached.
 *
 * This returns a template function and the config object with which that template function should be called.
 *
 * @remarks
 *
 * It's important that this returns a config object with `filename` set.
 * Otherwise, the included file would not be able to use relative paths
 *
 * @param path path for the specified file (if relative, specify `views` on `options`)
 * @param options compilation options
 * @return [Eta template function, new config object]
 */

function includeFile(path: string, options: EtaConfig): [TemplateFunction, EtaConfig] {
  // the below creates a new options object, using the parent filepath of the old options object and the path
  const newFileOptions = getConfig({ filename: getPath(path, options) }, options)
  // TODO: make sure properties are currectly copied over
  return [handleCache(newFileOptions as EtaConfigWithFilename), newFileOptions]
}

/**
 * Render a template from a filepath.
 *
 * @param filepath Path to template file. If relative, specify `views` on the config object
 *
 * This can take two different function signatures:
 *
 * - `renderFile(filename, dataAndConfig, [cb])`
 *   - Eta will merge `dataAndConfig` into `eta.config`
 * - `renderFile(filename, data, [config], [cb])`
 *
 * Note that renderFile does not immediately return the rendered result. If you pass in a callback function, it will be called with `(err, res)`. Otherwise, `renderFile` will return a `Promise` that resolves to the render result.
 *
 * **Examples**
 *
 * ```js
 * eta.renderFile("./template.eta", data, {cache: true}, function (err, rendered) {
 *   if (err) console.log(err)
 *   console.log(rendered)
 * })
 *
 * let rendered = await eta.renderFile("./template.eta", data, {cache: true})
 *
 * let rendered = await eta.renderFile("./template", {...data, cache: true})
 * ```
 */

function renderFile(
  filename: string,
  data: DataObj,
  config?: PartialConfig,
  cb?: CallbackFn
): Promise<string> | void

function renderFile(filename: string, data: DataObj, cb?: CallbackFn): Promise<string> | void

function renderFile(
  filename: string,
  data: DataObj,
  config?: PartialConfig,
  cb?: CallbackFn
): Promise<string> | void {
  /*
  Here we have some function overloading.
  Essentially, the first 2 arguments to renderFile should always be the filename and data
  However, with Express, configuration options will be passed along with the data.
  Thus, Express will call renderFile with (filename, dataAndOptions, cb)
  And we want to also make (filename, data, options, cb) available
  */

  let renderConfig: EtaConfigWithFilename
  let callback: CallbackFn | undefined
  data = data || {} // If data is undefined, we don't want accessing data.settings to error

  // First, assign our callback function to `callback`
  // We can leave it undefined if neither parameter is a function;
  // Callbacks are optional
  if (typeof cb === 'function') {
    // The 4th argument is the callback
    callback = cb
  } else if (typeof config === 'function') {
    // The 3rd arg is the callback
    callback = config
  }

  // If there is a config object passed in explicitly, use it
  if (typeof config === 'object') {
    renderConfig = getConfig((config as PartialConfig) || {}) as EtaConfigWithFilename
  } else {
    // Otherwise, get the config from the data object
    // And then grab some config options from data.settings
    // Which is where Express sometimes stores them
    renderConfig = getConfig(data as PartialConfig) as EtaConfigWithFilename
    if (data.settings) {
      // Pull a few things from known locations
      if (data.settings.views) {
        renderConfig.views = data.settings.views
      }
      if (data.settings['view cache']) {
        renderConfig.cache = true
      }
      // Undocumented after Express 2, but still usable, esp. for
      // items that are unsafe to be passed along with data, like `root`
      const viewOpts = data.settings['view options']

      if (viewOpts) {
        copyProps(renderConfig, viewOpts)
      }
    }
  }

  // Set the filename option on the template
  // This will first try to resolve the file path (see getPath for details)
  renderConfig.filename = getPath(filename, renderConfig)

  return tryHandleCache(data, renderConfig, callback)
}

/**
 * Render a template from a filepath asynchronously.
 *
 * @param filepath Path to template file. If relative, specify `views` on the config object
 *
 * This can take two different function signatures:
 *
 * - `renderFile(filename, dataAndConfig, [cb])`
 *   - Eta will merge `dataAndConfig` into `eta.config`
 * - `renderFile(filename, data, [config], [cb])`
 *
 * Note that renderFile does not immediately return the rendered result. If you pass in a callback function, it will be called with `(err, res)`. Otherwise, `renderFile` will return a `Promise` that resolves to the render result.
 *
 * **Examples**
 *
 * ```js
 * eta.renderFile("./template.eta", data, {cache: true}, function (err, rendered) {
 *   if (err) console.log(err)
 *   console.log(rendered)
 * })
 *
 * let rendered = await eta.renderFile("./template.eta", data, {cache: true})
 *
 * let rendered = await eta.renderFile("./template", {...data, cache: true})
 * ```
 */

function renderFileAsync(
  filename: string,
  data: DataObj,
  config?: PartialConfig,
  cb?: CallbackFn
): Promise<string> | void

function renderFileAsync(filename: string, data: DataObj, cb?: CallbackFn): Promise<string> | void

function renderFileAsync(
  filename: string,
  data: DataObj,
  config?: PartialConfig,
  cb?: CallbackFn
): Promise<string> | void {
  return renderFile(
    filename,
    typeof config === 'function' ? { ...data, async: true } : data,
    typeof config === 'object' ? { ...config, async: true } : config,
    cb
  )
}

export { includeFile, renderFile, renderFileAsync }
