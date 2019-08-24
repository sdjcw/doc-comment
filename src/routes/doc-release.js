const router = require('express').Router()
const Joi = require('joi')
const AV = require('leanengine')

const {auth} = require('../util')

const schema = Joi.object().keys({
  docSite: Joi.string().required(),
}).required()

router.post('/', auth, (req, res, next) => {
  const {error, value} = Joi.validate(req.body, schema)
  if (error) {
    return next(error)
  }

  const {docSite} = value
  if (!docSite || docSite.trim().length === 0) {
    return next(new Error('docSite is null'))
  }
  return new AV.Object('Release').save({
    env: docSite,
  })
  .then(release => {
    res.status(201).send({
      id: release.id
    })
  })
  .catch(next)
})

module.exports = router
