const router = require('express').Router()
const _ = require('lodash')
const qs = require('querystring')
const request = require('request-promise')
const AV = require('leanengine')

const config = require('../config')

const serverDomain = 'https://leancloud.cn'
const oauthScope = 'client:info'
const callbackUrl = config.host + '/api/leancloud/callback'

router.get('/current', function(req, res, next) {
  if (req.currentUser) {
    return res.send({
      username: req.currentUser.get('username')
    })
  }
  if (!req.session.accessToken) {
    return res.sendStatus(401)
  }
  console.log('遗留数据: access_token:', req.session.accessToken)
  new AV.Query('OAuthUser').equalTo('access_token', req.session.accessToken)
  .first()
  .then((oauthUser) => {
    if (!oauthUser) {
      return
    }
    return signUpOrLogIn({
      access_token: oauthUser.get('access_token'),
      expires_in: oauthUser.get('expires_in'),
      token_type: oauthUser.get('token_type'),
      uid: oauthUser.get('uid'),
    })
  })
  .then((user) => {
    if (!user) {
      return res.sendStatus(401)
    }
    res.saveCurrentUser(user)
    return res.send({
      username: user.get('username')
    })
  })
  .catch(next)
})

router.get('/login', (req, res) => {
  const loginUrl = serverDomain + '/1.1/authorize?' +
    qs.stringify({
      client_id: config.leancloudOauthKey,
      response_type: 'code',
      redirect_uri: callbackUrl,
      scope: oauthScope,
    })
  res.redirect(loginUrl)
})

router.get('/callback', (req, res) => {
  getAuthData(req.query.code).then((authData) => {
    return signUpOrLogIn(authData)
    .then((user) => {
      if (!user) {
        return res.sendStatus(401)
      }
      res.saveCurrentUser(user)
      return res.send(
`<script type="text/javascript">
  if(window.opener) {
    window.opener.postMessage("login","*")
  } else {
    location.href="/login?token=${user._sessionToken}"
  }
</script>`)
    })
  })
})

const signUpOrLogIn = (authData) => {
  return getClientInfo(authData.access_token)
  .then((leanCloudUser) => {
    if (!leanCloudUser) {
      return null
    }
    authData.uid = '' + authData.uid
    return AV.User.signUpOrlogInWithAuthData(authData, 'leancloud')
    .then((user) => {
      if (_.isEqual(user.createdAt, user.updatedAt)) {
        // 第一次登录，从 LeanCloud 初始化用户信息
        return user.save({
          username: leanCloudUser.username,
          email: leanCloudUser.email,
        }, {user})
      }
      return user
    })
  })
}

const getAuthData = (code) => {
  const url = serverDomain + '/1.1/token?' +
    qs.stringify({
      grant_type: 'authorization_code',
      client_id: config.leancloudOauthKey,
      client_secret: config.leancloudOauthSecret,
      redirect_uri: callbackUrl,
      code,
    })
  return request({url, json: true})
}

router.get('/logout', function(req, res) {
  req.session.accessToken = null
  if (req.currentUser) {
    req.currentUser.logOut()
    res.clearCurrentUser()
  }
  return res.send({})
})

const getClientInfo = (accessToken) => {
  const url = serverDomain + '/1.1/open/clients/self'
  return request({
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    json: true,
  })
}

module.exports = router
