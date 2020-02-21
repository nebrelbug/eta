/* eslint-disable dot-notation */
/* global template, doT, ejs, Handlebars, Sqrl, Mustache, swig, Highcharts */

/*

Modified from AUI's docs. See their license below:
==================================================
Copyright (c) 2017 糖饼

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var templateList = {}

templateList['template'] = `
<ul>
    <% for (var i = 0, l = list.length; i < l; i ++) { %>
        <li>User: <%= list[i].user %> / Web Site: <%= list[i].site %></li>
    <% } %>
</ul>`

templateList['template-raw'] = `
<ul>
    <% for (var i = 0, l = list.length; i < l; i ++) { %>
        <li>User: <%- list[i].user %> / Web Site: <%- list[i].site %></li>
    <% } %>
</ul>`

templateList['template-fast-mode'] = `
<ul>
    <% for (var i = 0, l = $data.list.length; i < l; i ++) { %>
        <li>User: <%= $data.list[i].user %> / Web Site: <%= $data.list[i].site %></li>
    <% } %>
</ul>`

templateList['template-fast-mode-raw'] = `
<ul>
    <% for (var i = 0, l = $data.list.length; i < l; i ++) { %>
        <li>User: <%- $data.list[i].user %> / Web Site: <%- $data.list[i].site %></li>
    <% } %>
</ul>`

templateList['pug'] = `
ul
    -for (var i = 0, l = list.length; i < l; i ++) {
        li User: #{list[i].user} / Web Site: #{list[i].site}
    -}`

templateList['pug-raw'] = `
ul
    -for (var i = 0, l = list.length; i < l; i ++) {
        li User: !{list[i].user} / Web Site: !{list[i].site}
    -}`

templateList['dot'] = `
<ul>
    {{ for (var i = 0, l = it.list.length; i < l; i ++) { }}
        <li>User: {{!it.list[i].user}} / Web Site: {{!it.list[i].site}}</li>
    {{ } }}
</ul>`

templateList['dot-raw'] = `
<ul>
    {{ for (var i = 0, l = it.list.length; i < l; i ++) { }}
        <li>User: {{=it.list[i].user}} / Web Site: {{=it.list[i].site}}</li>
    {{ } }}
</ul>`

templateList['mustache'] = `
<ul>
    {{#list}}
        <li>User: {{user}} / Web Site: {{site}}</li>
    {{/list}}
</ul>`

templateList['mustache-raw'] = `
<ul>
    {{#list}}
        <li>User: {{{user}}} / Web Site: {{{site}}}</li>
    {{/list}}
</ul>`

templateList['handlebars'] = `
<ul>
    {{#list}}
        <li>User: {{user}} / Web Site: {{site}}</li>
    {{/list}}
</ul>`

templateList['handlebars-raw'] = `
<ul>
    {{#list}}
        <li>User: {{{user}}} / Web Site: {{{site}}}</li>
    {{/list}}
</ul>`

templateList['squirrelly'] = `
<ul>
{{~each(it.list) => val}}
    <li>User: {{val.user}} / Web Site: {{val.site}}</li>
{{/each}}
</ul>`

templateList['swig'] = `
<ul>
    {% for key, value in list %}
        <li>User: {{value.user}} / Web Site: {{value.site}}</li>
    {% endfor %}
</ul>`

templateList['swig-raw'] = `
<ul>
    {% for key, value in list %}
        {% autoescape false %}<li>User: {{value.user}} / Web Site: {{value.site}}</li>{% endautoescape %}
    {% endfor %}
</ul>`

/* ----------------- */

var config = {
  length: 20,
  calls: 6000,
  escape: true
}

function getParameterByName (name) {
  var url = window.location.href
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)')
  var results = regex.exec(url)
  if (!results) return null
  if (!results[2]) return ''
  return decodeURIComponent(results[2].replace(/\+/g, ' '))
}

if (window.location.search) {
  if (getParameterByName('length')) {
    config.length = Number(getParameterByName('length'))
  }
  if (getParameterByName('calls')) {
    config.calls = Number(getParameterByName('calls'))
  }
  if (getParameterByName('escape')) {
    config.escape = getParameterByName('escape') === 'true'
  }
}

// 制造测试数据
var data = {
  list: []
}

for (var i = 0; i < config.length; i++) {
  data.list.push({
    index: i,
    user: '<strong style="color:red">糖饼</strong>',
    site: 'https://github.com/aui',
    weibo: 'http://weibo.com/planeart',
    QQweibo: 'http://t.qq.com/tangbin'
  })
}

// 待测试的引擎列表
var testList = [
  {
    name: 'art-template',
    tester: function () {
      var id = config.escape ? 'template' : 'template-raw'
      var source = templateList[id]
      //   console.log(fn.toString())
      var html = ''
      for (var i = 0; i < config.calls; i++) {
        var fn = template.compile(source)

        html = fn(data)
      }
      return html
    }
  },

  {
    name: 'art-template / fast mode',
    tester: function () {
      var id = config.escape ? 'template-fast-mode' : 'template-fast-mode-raw'
      var source = templateList[id]
      var html = ''
      for (var i = 0; i < config.calls; i++) {
        var fn = template.compile(source)

        html = fn(data)
      }
      return html
    }
  },

  {
    name: 'doT',
    tester: function () {
      var id = config.escape ? 'dot' : 'dot-raw'
      var source = templateList[id]
      var html = ''
      for (var i = 0; i < config.calls; i++) {
        var fn = doT.template(source)

        html = fn(data)
      }
      return html
    }
  },

  {
    name: 'ejs',
    tester: function () {
      var id = config.escape ? 'template' : 'template-raw'
      var source = templateList[id]
      var html = ''
      for (var i = 0; i < config.calls; i++) {
        var fn = ejs.compile(source)

        html = fn(data)
      }
      return html
    }
  },

  {
    name: 'Jade / pug',
    tester: function () {
      var id = config.escape ? 'pug' : 'pug-raw'
      var source = templateList[id]
      var pug = require('pug')
      var html = ''
      for (var i = 0; i < config.calls; i++) {
        var fn = pug.compile(source)

        html = fn(data)
      }
      return html
    }
  },

  {
    name: 'Handlebars',
    tester: function () {
      var id = config.escape ? 'handlebars' : 'handlebars-raw'
      var source = templateList[id]
      var html = ''
      for (var i = 0; i < config.calls; i++) {
        var fn = Handlebars.compile(source)

        html = fn(data)
      }
      return html
    }
  },
  {
    name: 'Squirrelly',
    tester: function () {
      if (!config.escape) {
        Sqrl.defaultConfig.autoEscape = false
      }
      var source = templateList['squirrelly']
      //   console.log(fn.toString())
      var html = ''
      data.$name = 'temp'
      for (var i = 0; i < config.calls; i++) {
        html = Sqrl.render(source, data)
      }
      return html
    }
  },
  {
    name: 'Mustache',
    tester: function () {
      var id = config.escape ? 'mustache' : 'mustache-raw'
      var source = templateList[id]
      var html = ''
      Mustache.templateCache = undefined

      for (var i = 0; i < config.calls; i++) {
        html = Mustache.render(source, data)
      }
      return html
    }
  },

  {
    name: 'swig',
    tester: function () {
      var id = config.escape ? 'swig' : 'swig-raw'
      var source = templateList[id]
      var html = ''
      for (var i = 0; i < config.calls; i++) {
        var fn = swig.compile(source)

        html = fn(data)
      }
      return html
    }
  }
]

Highcharts.setOptions({
  colors: [
    '#EF6F65',
    '#F3AB63',
    '#F8D56F',
    '#99DD7A',
    '#74BBF3',
    '#CB93E0',
    '#A2A2A4',
    '#E1AC65',
    '#6AF9C4'
  ]
})

var runTest = function (callback) {
  var list = testList.filter(function (test) {
    return !config.escape || test.supportEscape !== false
  })

  var Timer = function () {
    this.startTime = +new Date()
  }

  Timer.prototype.stop = function () {
    return +new Date() - this.startTime
  }

  var colors = Highcharts.getOptions().colors
  var categories = []

  for (var i = 0; i < list.length; i++) {
    categories.push(list[i].name)
  }

  var chart = new Highcharts.Chart({
    chart: {
      animation: {
        duration: 150
      },
      renderTo: 'test-container',
      height: categories.length * 32,
      type: 'bar'
    },

    title: false,

    // subtitle: {
    //     text: config.length + ' list × ' + config.calls + ' calls'
    // },

    xAxis: {
      categories: categories,
      labels: {}
    },

    yAxis: {
      min: 0,
      title: {
        text: 'Time'
      }
    },

    legend: {
      enabled: false
    },

    tooltip: {
      formatter: function () {
        return '<b>' + this.x + '</b><br/>' + this.y + 'ms'
      }
    },

    credits: {
      enabled: false
    },
    plotOptions: {
      bar: {
        dataLabels: {
          enabled: true,
          formatter: function () {
            return this.y + 'ms'
          }
        }
      }
    },
    series: [
      {
        data: []
      }
    ]
  })

  var tester = function (target) {
    var time = new Timer()
    var html = target.tester()
    console.log(target.name + '------------------\n', html)
    var endTime = time.stop()

    chart.series[0].addPoint({
      color: colors.shift(),
      y: endTime
    })

    if (!list.length) {
      callback()
      return
    }

    target = list.shift()

    setTimeout(function () {
      tester(target)
    }, 500)
  }

  var target = list.shift()
  tester(target)
}

window['restart'] = function (key, value) {
  config[key] = value
  window.location.search =
    'length=' + config.length + '&calls=' + config.calls + '&escape=' + config.escape
}

window['app'] = function (selector) {
  var app = document.querySelector(selector)
  var body = `
<h1>Rendering test</h1>
<div class="header">
    <p class="item">
        <button id="button-start" class="button">Run Test&raquo;</button>
        <button id="button-restart" class="button" style="display:none">Restart</button>
        <span>config: </span>
        <label><input type="number" value="{{length}}" onchange="restart('length', this.value)"> list</label>
        <strong>×</strong>
        <label><input type="number" value="{{calls}}" onchange="restart('calls', this.value)"> calls</label>
        <label><input type="checkbox" {{if escape}}checked{{/if}} onchange="restart('escape', this.checked)"> escape</label>
    </p>
    <p class="item">
    </p>
</div>
<div id="test-container" style="min-width: 400px; margin: 0 auto"></div>`

  var data = config
  data.testList = testList
  app.innerHTML = template.render(body, data)

  document.getElementById('button-start').onclick = function () {
    var elem = this
    this.disabled = true
    runTest(function () {
      elem.style.display = 'none'
      document.getElementById('button-restart').style.display = ''
    })
  }

  document.getElementById('button-restart').onclick = function () {
    window.location.reload()
  }
}
