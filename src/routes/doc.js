const crypto = require('crypto')
const router = require('express').Router()
const Promise = require('bluebird')
const _ = require('lodash')
const Joi = require('joi')
const AV = require('leanengine')

const COMMENT_STATUS = require('../../lib/constant').COMMENT_STATUS
const {renderHtml, auth} = require('../util')
const Doc = AV.Object.extend('Doc')
const Comment = AV.Object.extend('Comment')
const CommentCount = AV.Object.extend('CommentCount')

const schema = Joi.object().keys({
  releaseId: Joi.string().required(),
  fileName: Joi.string().required(),
  snippetVersions: Joi.array().required(),
}).required()

router.post('/', auth, (req, res, next) => {
  const {error, value} = Joi.validate(req.body, schema)
  if (error) {
    return next(error)
  }

  const {releaseId, fileName, snippetVersions} = value
  const docVersion = crypto.createHash('md5').update(snippetVersions.join(',')).digest('hex')
  new AV.Query('Doc')
  .equalTo('version', docVersion)
  .first()
  .then(doc => {
    if (doc) {
      return saveReleaseDocIfNotExist(releaseId, doc)
      .then(() => {
        return res.send({
          version: doc.get('version'),
        })
      })
    }

    return createDoc(fileName, docVersion, snippetVersions, req.currentUser)
    .then(doc => {
      return saveReleaseDocIfNotExist(releaseId, doc)
      .then(() => {
        return res.status(201).send({
          version: doc.get('version'),
        })
      })
    })
  })
  .catch(next)
})

router.get('/:docVersion/commentCount', function(req, res, next) {
  const query = new AV.Query(Doc)
  query.equalTo('version', req.params.docVersion)
  return query.first({useMasterKey: true}).then(function(doc) {
    if (doc == null) {
      console.log('doc is not found: version=%s', req.params.docVersion)
      res.send([])
      return
    }
    const snippetsVersion = _.map(doc.get('snippets'), function(snippet) {
      return snippet.version || snippet
    })
    return Promise.all(_.chunk(snippetsVersion, 300).map(function(versions) {
      const q = new AV.Query(CommentCount)
      q.equalTo('docFile', doc.get('file'))
      q.containedIn('snippetVersion', versions)
      return q.find()
    })).then(function(datas) {
      return _.flattenDeep(datas)
    })
  }).then(function(datas) {
    return res.send(_.map(datas, function(count) {
      return {
        snippetVersion: count.get('snippetVersion'),
        count: count.get('count')
      }
    }))
  }, function(err) {
    return next(err)
  })
})

router.get('/:docVersion/snippets/:snippetVersion/comments', function(req, res, next) {
  return AV.Query.doCloudQuery(`select include author, *
      from Comment
      where snippetVersion = ? and (status = ${COMMENT_STATUS.NEW} or status = ${COMMENT_STATUS.ARCHIVED})
      order by createdAt asc`, [req.params.snippetVersion])
  .then(function(result) {
    result.results.forEach(function(comment) {
      return comment.set('author', comment.get('author').get('username'))
    })
    return res.send(result.results)
  }, function(err) {
    return next(err)
  })
})

router.post('/:docVersion/snippets/:snippetVersion/comments', function(req, res, next) {
  if (!req.currentUser) {
    return res.sendStatus(401)
  }

  return Promise.all([
    new AV.Query('Doc')
      .equalTo('version', req.params.docVersion)
      .first({useMasterKey: true}),
    new AV.Query('Snippet')
      .equalTo('snippetVersion', req.params.snippetVersion)
      .first({useMasterKey: true}),
  ]).spread((doc, snippet) => {
    return new Comment().save({
      author: req.currentUser,
      content: req.body.content,
      content_HTML: renderHtml(req.body.content),
      docFile: doc.get('file'),
      snippetVersion: req.params.snippetVersion,
      snippet,
    })
  }).then((comment) => {
    comment.set('author', req.currentUser.get('username'))
    return res.status(201).send(comment)
  }).catch(next)
})

const createDoc = (file, version, snippets, currentUser) => {
  const doc = new AV.Object('Doc', {
    version,
    file,
    snippets,
  })
  const acl = new AV.ACL()
  acl.setWriteAccess(currentUser, true)
  acl.setReadAccess(currentUser, true)
  acl.setRoleReadAccess(new AV.Role('admin'), true)
  doc.setACL(acl)
  return doc.save()
}

const saveReleaseDocIfNotExist = (releaseId, doc) => {
  const release = AV.Object.createWithoutData('Release', releaseId)
  return new AV.Object('Release_Doc')
  .save({
    release,
    doc,
  }, {
    query: new AV.Query('Release_Doc')
      .notEqualTo('release', release)
      .notEqualTo('doc', doc)
  })
  .catch(err => {
    if (err.code === 305) {
      console.log('releaseDoc 记录已经存在: releaseId=%s, docId=%s', releaseId, doc.id)
      return
    }
    throw err
  })
}

module.exports = router
