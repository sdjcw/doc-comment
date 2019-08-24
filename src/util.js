const Remarkable = require('remarkable')
const hljs = require('highlight.js')
const AV = require('leanengine')

const md = new Remarkable({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value
      } catch (err) {
        // ignore
      }
    }
    try {
      return hljs.highlightAuto(str).value
    } catch (err) {
      // ignore
    }
    return '' // use external default escaping
  },
})

exports.renderHtml = (content) => {
  return md.render(content)
}

exports.auth = (req, res, next) => {
  const sessionToken = req.headers['session-token']
  if (!sessionToken) {
    res.status(401).send('Unauthorized')
    return
  }
  AV.User.become(sessionToken)
  .then(user => {
    if (!user) {
      res.status(401).send('Unauthorized')
      return
    }
    req.currentUser = user
    next()
  })
}

