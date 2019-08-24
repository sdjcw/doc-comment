const apm = require('leanengine-apm')
apm.init('ebc2d7d6ea4c3742e107fa6b70975c4f760df044')
apm.cloudApi()

var app = require('./app')

// 端口一定要从环境变量 `LC_APP_PORT` 中获取。
// LeanEngine 运行时会分配端口并赋值到该变量。
var PORT = parseInt(process.env.LC_APP_PORT || 3000)
app.listen(PORT, function () {
  console.log('Node app is running, port:', PORT)
  // 注册全局未捕获异常处理器
  process.on('uncaughtException', function(err) {
    console.error('Caught exception:', err.stack)
  })
  process.on('unhandledRejection', function(reason, p) {
    console.error('Unhandled Rejection at: Promise ', p, ' reason: ', reason.stack)
  })
})
