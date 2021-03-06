const Promise = require('bluebird')
const AV = require('leanengine')
const config = require('./config')
const mailgun = require('mailgun-js')({apiKey: config.mailgunKey, domain: config.mailgunDomain})

const COMMENT_STATUS = require('../lib/constant').COMMENT_STATUS
const CommentCount = AV.Object.extend('CommentCount')

AV.Cloud.afterSave('Comment', (req) => {
  const snippetVersion = req.object.get('snippetVersion')
  const docFile = req.object.get('docFile')
  return Promise.all([
    refreshCommentCount(snippetVersion, docFile, 1),
    notifyCommenters(snippetVersion, docFile, req.object),
  ])
  .catch(console.error)
})

AV.Cloud.afterUpdate('Comment', (req) => {
  const comment = req.object
  if (!comment.updatedKeys.includes('status')) {
    return
  }

  comment.set('operator', req.currentUser)
  comment.save()

  if (comment.get('status') === COMMENT_STATUS.RESOLVED
    || comment.get('status') === COMMENT_STATUS.EXPIRED
    || comment.get('status') === COMMENT_STATUS.DELETED) {
    const snippetVersion = comment.get('snippetVersion')
    const docFile = comment.get('docFile')
    return refreshCommentCount(snippetVersion, docFile, -1)
    .catch(console.error)
  }
})

const refreshCommentCount = (snippetVersion, docFile, inc) => {
  return new AV.Query(CommentCount)
  .equalTo('snippetVersion', snippetVersion)
  .equalTo('docFile', docFile)
  .first()
  .then(commentCount => {
    if (!commentCount) {
      if (inc <= 0) {
        return
      }
      return new AV.Object('CommentCount')
      .save({
        snippetVersion,
        docFile,
        count: inc
      })
    }

    if ((commentCount.get('count') + inc) === 0) {
      return commentCount.destroy()
    }

    commentCount.increment('count', inc)
    return commentCount.save()
  })
}

const notifyCommenters = (snippetVersion, docFile, currentComment) => {
  return Promise.all([
    new AV.Query('Snippet')
    .equalTo('snippetVersion', snippetVersion)
    .descending('createdAt')
    .first(),
    new AV.Query('Comment')
    .containedIn('status', [COMMENT_STATUS.NEW, COMMENT_STATUS.ARCHIVED])
    .equalTo('snippetVersion', snippetVersion)
    .equalTo('docFile', docFile)
    .notEqualTo('objectId', currentComment.id)
    .find()
  ])
  .then(([snippet, comments]) => {
    const url = `https://leancloud.cn/docs/${docFile}#${snippetVersion}`
    return Promise.map(comments, comment => {
      return comment.get('author').fetch({}, {useMasterKey: true})
      .then(author => {
        if (author.get('isSubscribe') === false) {
          return
        }

        const subToken = author._sessionToken.slice(0, 16)
        const text = 
`????????????
--------
${snippet.get('content')}

??????????????????
------------
${comment.get('content')}

????????????
--------
${currentComment.get('content')}

????????????
--------
${url}

----------

???????????????????????????????????????????????????????????????
??????????????????????????????????????????????????????
????????? https://comment.leanapp.cn/notifications/unsubscribe?_=${subToken}
??????????????? https://comment.leanapp.cn/notifications/subscribe?_=${subToken}
`
        const data = {
          from: 'LeanCloud ???????????? <doc-comment@leancloud.cn>',
          to: comment.get('author').get('email'),
          subject: '[LeanCloud ??????] ???????????????????????????????????????',
          text,
        }
        return mailgun.messages().send(data)
        .catch(err => {
          console.error('??????????????????:', data, err)
        })
      })
    })
  })
}
