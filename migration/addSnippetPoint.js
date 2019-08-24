var AV = require('leanengine')
AV.initialize(process.env.LEANCLOUD_APP_ID, process.env.LEANCLOUD_APP_KEY)

var Comment = AV.Object.extend('Comment')
var Snippet = AV.Object.extend('Snippet')

var query = new AV.Query(Comment)
query.doesNotExist('snippet')
query.limit(100)
query.find({
  success: function(result) {
    result.forEach(function(comment) {
      console.log(comment.get('snippetVersion'))
      var q = new AV.Query(Snippet)
      q.equalTo('snippetVersion', comment.get('snippetVersion'))
      q.first({
        success: function(result) {
          if(result) {
            comment.set('snippet', result)
            comment.save(null, {
              success: function() {
                console.log('ok')
              }
            })
          }
        },
        error: function(obj, err) {
          console.log('XXXXXXXXX', err)
        }
      })
    })
  }
})
