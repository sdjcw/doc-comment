const crypto = require('crypto')
const Promise = require('bluebird')
const AV = require('leanengine')

AV.Cloud.define('snippetHasComment', (_req) => {
  return new AV.Query('Comment')
  .doesNotExist('checked')
  .include('snippet')
  .limit(1000)
  .find({useMasterKey: true})
  .then(comments => {
    if (comments.length === 0) {
      return 'done'
    }
    comments.forEach(comment => {
      const snippet = comment.get('snippet')
      const snippetVersion = crypto.createHash('md5').update(snippet.get('content')).digest('hex')
      if (snippetVersion !== snippet.get('snippetVersion')) {
        console.log('>> version diff', snippet.id, snippet.get('snippetVersion'))
        comment.set('snippetVersion', snippetVersion)
        snippet.set('snippetVersion', snippetVersion)
      }
      comment.set('checked', true)
      comment.get('snippet').set('hasComment', true)
    })
    return AV.Object.saveAll(comments, {useMasterKey: true})
    .then(() => {
      return 'ok'
    })
  })
})

AV.Cloud.define('changeCommentSnippet', () => {
  const now = new Date()
  return changeCommentSnippet(now)
  .catch(console.error)
})

const changeCommentSnippet = (checkVersion) => {
  return new AV.Query('Comment')
  .doesNotExist('checkedAt')
  .include('snippet')
  .limit(1000)
  .find({useMasterKey: true})
  .then(comments => {
    if (comments.length === 0) {
      console.log('done')
      return 'done'
    }
    return Promise.map(comments, (c) => {
      if (c.get('snippet')) {
        c.set('checkedAt', checkVersion)
        return c.save(null, {useMasterKey: true})
      }
      return new AV.Query('Snippet')
      .equalTo('snippetVersion', c.get('snippetVersion'))
      .descending('createdAt')
      .first({useMasterKey: true})
      .then(snippet => {
        if (!snippet) {
          console.log('!!!!!', c.id)
        }
        c.set('snippet', snippet)
        c.set('checkedAt', checkVersion)
        return c.save(null, {useMasterKey: true})
      })
    }, {concurrency: 4})
    .then(() => {
      changeCommentSnippet(checkVersion)
    })
  })
}

AV.Cloud.define('uniqSnippet', (_req) => {
  return uniqSnippet()
})

const uniqSnippet = () => {
  return new AV.Query('Snippet')
  .doesNotExist('checked')
  .limit(1000)
  .find({useMasterKey: true})
  .then(snippets => {
    if (snippets.length === 0) {
      return 'done'
    }
    return Promise.map(snippets, s => {
      return new AV.Query('Snippet')
      .equalTo('snippetVersion', s.get('snippetVersion'))
      .descending('createdAt')
      .limit(1000)
      .find({useMasterKey: true})
      .then(snippets => {
        if (snippets.length === 1) {
          s.set('checked', true)
          return s.save(null, {useMasterKey: true})
        }
        const deletes = snippets.slice(1)
        console.log('delete count:', s.get('snippetVersion'), deletes.length)
        return AV.Object.destroyAll(deletes, {useMasterKey: true})
      })
    }, {concurrency: 16})
    .then(() => {
      return uniqSnippet()
    })
  })
  .catch(err => {
    console.error(err.message)
    return uniqSnippet()
  })
}
