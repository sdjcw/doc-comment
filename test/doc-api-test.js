const request = require('supertest-as-promised')
const AV = require('leanengine')

const app = require('../src/app')

const addDoc = ({releaseId, fileName, snippetVersions}) => {
  return request(app)
  .post('/api/docs')
  .set('Content-Type', 'application/json')
  .set('Session-Token', process.env.DOC_CREATER_TOKEN)
  .send({
    releaseId,
    fileName,
    snippetVersions,
  })
}

const addRelease = (docSite) => {
  return request(app)
  .post('/api/docReleases')
  .set('Content-Type', 'application/json')
  .set('Session-Token', process.env.DOC_CREATER_TOKEN)
  .send({
    docSite,
  })
}

describe('doc-api', function() {
 
  let docVersion

  before(function() {
    return new AV.Query('Release')
    .equalTo('env', 'unitTest')
    .find({useMasterKey: true})
    .then(releases => {
      return new AV.Query('Release_Doc')
      .containedIn('release', releases)
      .destroyAll({useMasterKey: true})
      .then(() => {
        return AV.Object.destroyAll(releases, {useMasterKey: true})
      })
    })
    .then(() => {
      return new AV.Query('Doc')
      .equalTo('file', 'unitTest.html')
      .destroyAll({useMasterKey: true})
    })
  })

  it('POST doc', function() {
    return addRelease('unitTest')
    .then(res => {
      return addDoc({
        releaseId: res.body.id,
        fileName: 'unitTest.html',
        snippetVersions: ['111', '222'],
      })
      .expect(201)
    })
    .then(res => {
      res.body.should.have.property('version')
      docVersion = res.body.version
    })
  })

  it('POST doc, exist', function() {
    return addRelease('unitTest')
    .then(res => {
      return addDoc({
        releaseId: res.body.id,
        fileName: 'unitTest.html',
        snippetVersions: ['111', '222'],
      })
      .expect(200)
    })
    .then(res => {
      res.body.version.should.equal(docVersion)
    })
  })

  it('POST doc, snippet updated', function() {
    return addRelease('unitTest')
    .then(res => {
      return addDoc({
        releaseId: res.body.id,
        fileName: 'unitTest.html',
        snippetVersions: ['111', '333','222'],
      })
      .expect(201)
    })
    .then(res => {
      res.body.version.should.not.equal(docVersion)
    })
  })
})
