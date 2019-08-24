const path = require('path')
const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('cookie-session')
const bodyParser = require('body-parser')
const AV = require('leanengine')
const apm = require('leanengine-apm')
const timeout = require('connect-timeout')
const Raven = require('raven')

Raven.config(process.env.SENTRY_DSN).install()

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LC_APP_MASTER_KEY
})

const app = express()

app.use(Raven.requestHandler())
app.use(express.static(path.join(__dirname, '../public')))
app.use(cookieParser())
app.use(session({keys: ['t5toMaKVan7J', '269cLBbRJmTl'], secure: false}))
app.use(timeout('30s'))

app.use(apm.express())
app.use(AV.express())
require('./cloud')
require('./cloud-tmp')
require('./Comment')

app.use('/*', function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Credentials', true)
  if (req.method.toLowerCase() === 'options') {
    res.setHeader('Access-Control-Max-Age', '86400')
    res.setHeader('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS')
    res.setHeader('Content-Length', 0)
    return res.end()
  }
  return next()
})

app.set('trust proxy', 1)
app.use(AV.Cloud.HttpsRedirect())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(AV.Cloud.CookieSession({ secret: 't5toMaKVan7J', maxAge: 1000 * 60 * 60 * 24 * 7, fetchUser: true }))

app.use('/users', require('./routes/user'))
app.use('/api/leancloud', require('./routes/user'))
app.use('/docs', require('./routes/doc'))
app.use('/api/docReleases', require('./routes/doc-release'))
app.use('/api/docs', require('./routes/doc'))
app.use('/api/snippets', require('./routes/snippet'))
app.use('/notifications', require('./routes/notification'))

app.use('/*', (req, res) => {
  res.send(indexPage)
})

const indexPage =`
<!doctype html public "storage">
<html>
  <head>
    <meta charset=utf-8/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/css/bootstrap.min.css" />
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.10.0/styles/default.min.css">
  </head>
  <body>
  <div id="app"></div>
  <script>
    LEANCLOUD_APP_ID = '${process.env.LEANCLOUD_APP_ID}'
    LEANCLOUD_APP_KEY = '${process.env.LEANCLOUD_APP_KEY}'
    LEANCLOUD_APP_ENV = '${process.env.LEANCLOUD_APP_ENV}'
  </script>
  <script src='${process.env.WEBPACK_DEV_SERVER || ''}/bundle.js'></script>
  </body>
</html>
`

app.use(Raven.errorHandler())

app.use(function(err, req, res, _next) {
  var statusCode
  if (err.name === 'ValidationError') {
    err.status = 400
  }
  statusCode = err.status || 500
  if (statusCode === 500) {
    console.error(err.stack || err)
  }
  if (req.timedout) {
    console.error('请求超时: url=%s, timeout=%d, 请确认方法执行耗时很长，或没有正确的 response 回调。', req.originalUrl, err.timeout)
  }
  res.status(statusCode)
  return res.send({
    error: {
      message: err.message
    }
  })
})

module.exports = app
