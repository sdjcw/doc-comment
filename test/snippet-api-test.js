const request = require('supertest-as-promised')

const app = require('../src/app')

const addSnippets = (snippets) => {
  return request(app)
  .post('/api/snippets')
  .set('Content-Type', 'application/json')
  .set('Session-Token', process.env.DOC_CREATER_TOKEN)
  .send(snippets)
}

describe('doc-api', function() {
 
  let snippetIds

  before(function() {
  })

  it('POST snippets', function() {
    return addSnippets([
      {content: '这是一个测试段落。', type: 'p'},
      {content: '# 这是注释\nconst i = 1;', type: 'pre'}
    ])
    .expect(200)
    .then(res => {
      res.body.should.with.lengthOf(2)
      snippetIds = res.body
      return addSnippets([
        {content: '这是一个测试段落。', type: 'p'},
        {content: '加了一段内容', type: 'p'},
        {content: '# 这是注释\nconst i = 1;', type: 'pre'}
      ])
      .expect(200)
    })
    .then(res => {
      res.body.should.with.lengthOf(3)
      res.body[0].should.equal(snippetIds[0])
      res.body[2].should.equal(snippetIds[1])

    })
  })

})
