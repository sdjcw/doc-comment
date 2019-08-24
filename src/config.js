const env = process.env.NODE_ENV || 'development'

let host
if (env === 'development') {
  host = 'http://localhost:' + process.env.LEANCLOUD_APP_PORT
} else if (env === 'stage') {
  host = process.env.COMMENT_HOST_STG
} else {
  host = process.env.COMMENT_HOST
}

module.exports = {
  host,
  leancloudOauthKey: process.env.LEANCLOUD_OAUTH_KEY,
  leancloudOauthSecret: process.env.LEANCLOUD_OAUTH_SECRET,
  mailgunKey: process.env.MAILGUN_KEY,
  mailgunDomain: process.env.MAILGUN_DOMAIN,
}
