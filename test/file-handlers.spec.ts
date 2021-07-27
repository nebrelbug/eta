/* global it, expect, describe */

import { renderFile, renderFileAsync, __express, templates, compile } from '../src/index'

import { buildRegEx } from './err.spec'

const path = require('path'),
  filePath = path.join(__dirname, 'templates/simple.eta'),
  errFilePath = path.join(__dirname, 'templates/badsyntax.eta'),
  fakeFilePath = path.join(__dirname, 'templates/fake.eta')

describe('Simple renderFile tests', () => {
  it('renders a simple template file', async () => {
    const renderedFile = await renderFile(filePath, { name: 'Ben' })

    expect(renderedFile).toEqual('Hi Ben')
  })

  it('renderFile is aliased as __express', async () => {
    const renderedFile = await __express(filePath, { name: 'Ben' })

    expect(renderedFile).toEqual('Hi Ben')
  })

  it('renders async template with callback', (done) => {
    function cb(_err: Error | null, res?: string) {
      try {
        expect(res).toBe('Hi Ada Lovelace')
        done()
      } catch (error) {
        done(error)
      }
    }

    renderFile(filePath, { name: 'Ada Lovelace', async: true }, cb)
  })

  it('renders a simple template w/ a callback', async () => {
    renderFile(filePath, { name: 'Ben' }, function (_err: Error | null, res?: string) {
      expect(res).toEqual('Hi Ben')
    })
  })

  it('renders a simple template w/ callback and explicit config', async () => {
    // Note that rmWhitespace doesn't do anything specific
    renderFile(filePath, { name: 'Ben' }, { rmWhitespace: true }, function (
      _err: Error | null,
      res?: string
    ) {
      expect(res).toEqual('Hi Ben')
    })
  })

  it('renders an async template using Promises', async () => {
    const res = await renderFile(filePath, { name: 'Ada', async: true })
    expect(res).toEqual('Hi Ada')
  })

  it('renders an async template with an explicit config using Promises', async () => {
    const res = await renderFile(filePath, { name: 'Ada' }, { async: true })
    expect(res).toEqual('Hi Ada')
  })

  it('uses cached version of a file', async () => {
    templates.define(fakeFilePath, compile('This template does not exist'))

    // renderFile should just look straight in the cache for the template
    renderFile(fakeFilePath, { cache: true }, function (_err: Error | null, res?: string) {
      expect(res).toEqual('This template does not exist')
    })
  })

  it('parses a simple template w/ settings from Express', async () => {
    renderFile(
      filePath,
      {
        name: '<p>Ben</p>',
        cache: true,
        settings: {
          views: [path.join(__dirname, 'templates'), path.join(__dirname, 'othertemplates')],
          'view cache': true,
          'view options': { autoEscape: false }
        }
      },
      function (_err: Error | null, res?: string) {
        expect(res).toEqual('Hi <p>Ben</p>')
      }
    )
  })
})

describe('File location tests', () => {
  it('locates a file with the views option', async () => {
    const res = await renderFile(
      'simple.eta',
      { name: 'Ada' },
      { views: path.join(__dirname, 'templates') }
    )

    expect(res).toEqual('Hi Ada')
  })

  it('uses file content using a custom function', async () => {
    const res = await renderFile(
      'simple.eta',
      { name: 'Ada' },
      { readFile: (filename: string) => filename == 'simple.eta' ? 'Hi <%= it.name %>' : '' }
    )

    expect(res).toEqual('Hi Ada')
  })
})

describe('renderFile error tests', () => {
  it('render file with callback works on error', (done) => {
    function cb(err: Error, _res?: string) {
      expect(err).toBeTruthy()
      expect(err.message).toMatch(
        buildRegEx(`
var tR='',__l,__lP,include=E.include.bind(E),includeFile=E.includeFile.bind(E)
function layout(p,d){__l=p;__lP=d}
tR+='Hi '
tR+=E.e(badSyntax(=!)
if(__l)tR=await includeFile(__l,Object.assign(it,{body:tR},__lP))
if(cb){cb(null,tR)} return tR
`)
      )
      done()
    }

    renderFile(errFilePath, { name: 'Ada Lovelace', async: true }, cb)
  })

  test('throws with bad inner JS syntax using Promises', async () => {
    await expect(async () => {
      await renderFile(errFilePath, {})
    }).rejects.toThrow(
      buildRegEx(`
var tR='',__l,__lP,include=E.include.bind(E),includeFile=E.includeFile.bind(E)
function layout(p,d){__l=p;__lP=d}
tR+='Hi '
tR+=E.e(badSyntax(=!)
if(__l)tR=includeFile(__l,Object.assign(it,{body:tR},__lP))
if(cb){cb(null,tR)} return tR
`)
    )
  })
})

describe('renderFileAsync function', () => {
  it('should render properly', async () => {
    expect(await renderFileAsync(filePath, { name: 'foo' })).toBe('Hi foo')
  })
})

// NOTE: the errors will really look like this:

/*
Loading file: /home/nebrelbug/Coding/eta/test/templates/badsyntax.eta failed:

Bad template syntax

Unexpected token '='
====================
var tR='',__l,__lP,include=E.include.bind(E),includeFile=E.includeFile.bind(E)
function layout(p,d){__l=p;__lP=d}
tR+='Hi '
tR+=E.e(badSyntax(=!)
if(__l)tR=includeFile(__l,Object.assign(it,{body:tR},__lP))
if(cb){cb(null,tR)} return tR
*/

// Unfortunately, Node throws different errors ("Unexpected token '='", "Unexpected token =", "Invalid or unexpected token") depending on the version so we can't test against the first part of the string.
