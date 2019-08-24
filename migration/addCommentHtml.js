var AV = require('leanengine')
AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY,
})
AV.Cloud.useMasterKey()
const renderHtml = require('../src/util').renderHtml

//const Comment = AV.Object.extend('Comment')
//
//new AV.Query(Comment)
//.doesNotExist('content_HTML')
//.limit(1000)
//.find()
//.then(comments => {
//  comments.forEach(c => c.set('content_HTML', renderHtml(c.get('content'))))
//  return AV.Object.saveAll(comments)
//})
//.catch(console.error)

const Snippet = AV.Object.extend('Snippet')

const addSnippetContentHtml = () => {
  new AV.Query(Snippet)
  .doesNotExist('content_HTML')
  .limit(1000)
  .find()
  .then(objs => {
    if (objs.length === 0) {
      return
    } else {
      objs.forEach(c => c.set('content_HTML', renderHtml(c.get('content'))))
      return AV.Object.saveAll(objs)
      .then(addSnippetContentHtml)
    }
  })
  .catch(console.error)
}

addSnippetContentHtml()
