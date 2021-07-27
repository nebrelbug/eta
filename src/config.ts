import { templates } from './containers'
import { copyProps, XMLEscape } from './utils'
import EtaErr from './err'

/* TYPES */

import type { TemplateFunction } from './compile'
import type { Cacher } from './storage'

type trimConfig = 'nl' | 'slurp' | false

export interface EtaConfig {
  /** Whether or not to automatically XML-escape interpolations. Default true */
  autoEscape: boolean

  /** Configure automatic whitespace trimming. Default `[false, 'nl']` */
  autoTrim: trimConfig | [trimConfig, trimConfig]

  /** Compile to async function */
  async: boolean

  /** Whether or not to cache templates if `name` or `filename` is passed */
  cache: boolean

  /** XML-escaping function */
  e: (str: string) => string

  /** Parsing options */
  parse: {
    /** Which prefix to use for evaluation. Default `""` */
    exec: string

    /** Which prefix to use for interpolation. Default `"="` */
    interpolate: string

    /** Which prefix to use for raw interpolation. Default `"~"` */
    raw: string
  }

  /** Array of plugins */
  plugins: Array<{ processFnString?: Function; processAST?: Function; processTemplate?: Function }>

  /** Remove all safe-to-remove whitespace */
  rmWhitespace: boolean

  /** Delimiters: by default `['<%', '%>']` */
  tags: [string, string]

  /** Holds template cache */
  templates: Cacher<TemplateFunction>

  /** Name of the data object. Default `it` */
  varName: string

  /** Absolute path to template file */
  filename?: string

  /** Holds cache of resolved filepaths. Set to `false` to disable */
  filepathCache?: Record<string, string> | false

  /** A filter function applied to every interpolation or raw interpolation */
  filter?: Function

  /** Function to include templates by name */
  include?: Function

  /** Function to include templates by filepath */
  includeFile?: Function

  /** Name of template */
  name?: string

  /** Where should absolute paths begin? Default '/' */
  root?: string

  /** Make data available on the global object instead of varName */
  useWith?: boolean

  /** Whether or not to cache templates if `name` or `filename` is passed: duplicate of `cache` */
  'view cache'?: boolean

  /** Directory or directories that contain templates */
  views?: string | Array<string>

  /** Function to customize reading files by path */
  readFile?: (path: string) => string

  [index: string]: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface EtaConfigWithFilename extends EtaConfig {
  filename: string
}

export type PartialConfig = Partial<EtaConfig>

/* END TYPES */

/**
 * Include a template based on its name (or filepath, if it's already been cached).
 *
 * Called like `include(templateNameOrPath, data)`
 */

function includeHelper(this: EtaConfig, templateNameOrPath: string, data: object): string {
  const template = this.templates.get(templateNameOrPath)
  if (!template) {
    throw EtaErr('Could not fetch template "' + templateNameOrPath + '"')
  }
  return template(data, this)
}

/** Eta's base (global) configuration */
const config: EtaConfig = {
  async: false,
  autoEscape: true,
  autoTrim: [false, 'nl'],
  cache: false,
  e: XMLEscape,
  include: includeHelper,
  parse: {
    exec: '',
    interpolate: '=',
    raw: '~'
  },
  plugins: [],
  rmWhitespace: false,
  tags: ['<%', '%>'],
  templates: templates,
  useWith: false,
  varName: 'it'
}

/**
 * Takes one or two partial (not necessarily complete) configuration objects, merges them 1 layer deep into eta.config, and returns the result
 *
 * @param override Partial configuration object
 * @param baseConfig Partial configuration object to merge before `override`
 *
 * **Example**
 *
 * ```js
 * let customConfig = getConfig({tags: ['!#', '#!']})
 * ```
 */

function getConfig(override: PartialConfig, baseConfig?: EtaConfig): EtaConfig {
  // TODO: run more tests on this

  const res: PartialConfig = {} // Linked
  copyProps(res, config) // Creates deep clone of eta.config, 1 layer deep

  if (baseConfig) {
    copyProps(res, baseConfig)
  }

  if (override) {
    copyProps(res, override)
  }

  return res as EtaConfig
}

/** Update Eta's base config */

function configure(options: PartialConfig): Partial<EtaConfig> {
  return copyProps(config, options)
}

export { config, getConfig, configure }
