const _ = require('lodash')
const Promise = require('bluebird')
const AV = require('leanengine')

const config = require('./config')
const mailgun = require('mailgun-js')({apiKey: config.mailgunKey, domain: config.mailgunDomain})
const COMMENT_STATUS = require('../lib/constant').COMMENT_STATUS

const CommentCount = AV.Object.extend('CommentCount')
const MailLog = AV.Object.extend('MailLog')

AV.Cloud.define('addDocOwner', (req) => {
  return checkAdmin(req.currentUser)
  .then(() => {
    return new AV.Query('_User').get(req.params.userId)
  })
  .then(user => {
    user.addUnique('responsibilities', req.params.docFile)
    return user.save(null, {useMasterKey: true})
  })
  .then(user => {
    return user.toFullJSON()
  })
})

AV.Cloud.define('removeDocOwner', (req) => {
  return checkAdmin(req.currentUser)
  .then(() => {
    return new AV.Query('_User').get(req.params.userId)
  })
  .then(user => {
    user.remove('responsibilities', req.params.docFile)
    return user.save(null, {useMasterKey: true})
  })
  .then(user => {
    return user.toFullJSON()
  })
})

AV.Cloud.define('refreshCommentCount', function(req, res) {
  return destroyAll(CommentCount).then(function() {
    return reduceComments()
  }).then(function(counts) {
    const commentCounts = _.map(counts, function(count, key) {
      const [snippetVersion, docFile] = key.split(',')
      return new CommentCount({
        docFile,
        snippetVersion,
        count,
      })
    })
    return AV.Object.saveAll(commentCounts)
  }).then(function() {
    return res.success()
  }).catch(res.error)
})

const releaseEnvs = ['cn-n1']

AV.Cloud.define('expireComment', (_req) => {
  const now = new Date()
  return Promise.all([
    AV.Query.or(
      new AV.Query('Comment').doesNotExist('checkedAt'),
      new AV.Query('Comment').lessThan('checkedAt', now)
    )
    .containedIn('status', [COMMENT_STATUS.NEW, COMMENT_STATUS.ARCHIVED])
    .limit(1000)
    .find({useMasterKey: true}),
    new AV.Query('Release_Doc')
    .matchesQuery('release', new AV.Query('Release')
      .equalTo('env', releaseEnvs[0])
      .descending('createdAt')
      .limit(1)
    )
    .include('doc')
    .limit(1000)
    .find({useMasterKey: true})
    .then(releaseDocs => {
      return releaseDocs.map(r => r.get('doc'))
    })
  ])
  .then(([comments, docs]) => {
    comments.forEach(comment => {
      const doc = _.find(docs, d => d.get('file') === comment.get('docFile'))
      if (!doc || doc.get('snippets').indexOf(comment.get('snippetVersion')) === -1) {
        comment.set('status', COMMENT_STATUS.EXPIRED)
      }
      comment.set('checkedAt', now)
    })
    return AV.Object.saveAll(comments, {useMasterKey: true})
    .then(() => {
      return 'ok'
    })
  })
})

AV.Cloud.define('sendMail', (req) => {
  const {toUserId, title, content} = req.params
  const from = req.currentUser
  checkAdmin(from)
  .then(() => {
    new AV.Query('_User').get(toUserId)
    .then(user => {
      if (user === null) {
        throw new AV.Cloud.Error('用户不存在：toUserId=' + toUserId)
      }
      const data = {
        from: from.get('username') + ' <' + from.get('email') + '>',
        to: user.get('email'),
        subject: title,
        text: content,
      }
      return mailgun.messages().send(data, function(err, body) {
        new MailLog().save(_.extend({
          result: body
        }, data))
        return 
      })
    })
  })
})

AV.Cloud.define('changeDocName', (req) => {
  const {from, to} = req.params
  let comment, commentCount, doc, user
  return new AV.Query('Comment')
  .equalTo('docFile', from)
  .limit(1000)
  .find()
  .then(objs => {
    comment = objs.length
    objs.forEach(o => o.set('docFile', to))
    return AV.Object.saveAll(objs, {useMasterKey: true})
  })
  .then(() => {
    return new AV.Query('CommentCount')
    .equalTo('docFile', from)
    .limit(1000)
    .find()
    .then(objs => {
      commentCount = objs.length
      objs.forEach(o => o.set('docFile', to))
      return AV.Object.saveAll(objs, {useMasterKey: true})
    })
  })
  .then(() => {
    return new AV.Query('Doc')
    .equalTo('file', from)
    .limit(1000)
    .find()
    .then(objs => {
      doc = objs.length
      objs.forEach(o => o.set('file', to))
      return AV.Object.saveAll(objs, {useMasterKey: true})
    })
  })
  .then(() => {
    return new AV.Query('_User')
    .equalTo('responsibilities', from)
    .limit(1000)
    .find({useMasterKey: true})
    .then(objs => {
      user = objs.length
      objs.forEach(o => {
        o.remove('responsibilities', from)
        o.addUnique('responsibilities', to)
      })
      return AV.Object.saveAll(objs, {useMasterKey: true})
    })
  })
  .then(() => {
    return {comment, commentCount, doc, user}
  })
})

const reduceComments = function(result, skip) {
  result = result || {}
  skip = skip || 0
  let limit = 1000
  return new AV.Query('Comment')
  .containedIn('status', [COMMENT_STATUS.NEW, COMMENT_STATUS.ARCHIVED])
  .limit(limit)
  .skip(skip)
  .find({useMasterKey: true})
  .then(function(comments) {
    if (comments.length === 0) {
      return result
    }
    comments.forEach(function(comment) {
      const key = comment.get('snippetVersion') + ',' + comment.get('docFile')
      let count = result[key]
      if (!count) {
        return result[key] = 1
      } else {
        return result[key] = count + 1
      }
    })
    return reduceComments(result, skip + limit)
  })
}

const destroyAll = function(clazz) {
  var count, query
  query = new AV.Query(clazz)
  query.select('objectId')
  query.limit(1000)
  count = 0
  return query.find().then(function(objs) {
    count = objs.length
    return AV.Object.destroyAll(objs)
  }).then(function() {
    if (count === 0) {
      return
    }
    return destroyAll(clazz)
  })
}

const checkAdmin = (currentUser) => {
  if (!currentUser) {
    throw new AV.Cloud.Error('Unauthorized', {status: 401})
  }
  return new AV.Query(AV.Role)
  .equalTo('name', 'admin')
  .equalTo('users', currentUser)
  .first()
  .then((role) => {
    if (!role) {
      throw new AV.Cloud.Error('Unauthorized', {status: 401})
    }
  })
}

module.exports = AV.Cloud
