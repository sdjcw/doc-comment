const crypto = require('crypto')
const router = require('express').Router()
const _ = require('lodash')
const AV = require('leanengine')

const {renderHtml, auth} = require('../util')

router.post('/', auth, (req, res, next) => {
  const snippets = req.body
  snippets.forEach(s => {
    s.snippetVersion = crypto.createHash('md5').update(s.content).digest('hex')
  })
  return saveSnippetsIfNotExist(snippets, req.currentUser)
  .then(avObjs => {
    res.send(avObjs.map(o => o.get('snippetVersion')))
  })
  .catch(next)
})

const saveSnippetsIfNotExist = (snippets, currentUser) => {
  return new AV.Query('Snippet')
  .containedIn('snippetVersion', snippets.map(s => s.snippetVersion))
  .find()
  .then(exists => {
    return _.map(snippets, s => {
      const finded = _.find(exists, exist => exist.get('snippetVersion') === s.snippetVersion)
      if (finded) {
        // 异步补全 type 属性
        if (!finded.get('type')) {
          finded.set('type', s.type)
          finded.save()
        }
        return finded
      } else {
        const obj = new AV.Object('Snippet', {
          snippetVersion: s.snippetVersion,
          content: s.content,
          content_HTML: renderHtml(s.type === 'pre' ? '```\n' + s.content + '\n```\n' : s.content),
          type: s.type,
        })
        const acl = new AV.ACL()
        acl.setWriteAccess(currentUser, true)
        acl.setReadAccess(currentUser, true)
        acl.setRoleReadAccess(new AV.Role('admin'), true)
        obj.setACL(acl)
        return obj
      }
    })
  })
  .then(avObjs => {
    return AV.Object.saveAll(_.reject(avObjs, o => o.id))
    .then(() => {
      return avObjs
    })
  })
}

module.exports = router
