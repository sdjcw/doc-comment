const router = require('express').Router()
const AV = require('leanengine')

router.get('/subscribe', function(req, res, next) {
  const subToken = req.query._
  if (subToken.length !== 16) {
    res.status(401).send('Unauthorized')
  }
  new AV.Query('_User')
  .startsWith('sessionToken', subToken)
  .first({useMasterKey: true})
  .then(user => {
    return user.save({isSubscribe: true}, {useMasterKey: true})
  })
  .then(() => {
    res.send(`恢复订阅成功，以后您将收到 LeanCloud 文档评论功能自动发送的邮件。<br />
谢谢使用。`)
  })
})

router.get('/unsubscribe', function(req, res, next) {
  const subToken = req.query._
  if (subToken.length !== 16) {
    res.status(401).send('Unauthorized')
  }
  new AV.Query('_User')
  .startsWith('sessionToken', subToken)
  .first({useMasterKey: true})
  .then(user => {
    return user.save({isSubscribe: false}, {useMasterKey: true})
  })
  .then(() => {
    res.send(`退订成功，以后您不会再收到 LeanCloud 文档评论功能自动发送的邮件。<br />
回复订阅，请点击过往邮件里的链接。<br />
谢谢使用。`)
  })
})

module.exports = router
