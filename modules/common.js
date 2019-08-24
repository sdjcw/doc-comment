import AV from 'leancloud-storage'

exports.isAdmin = (user) => {
  if (!user) {
    return Promise.resolve(false)
  }
  return new AV.Query(AV.Role)
  .equalTo('name', 'admin')
  .equalTo('users', user)
  .first()
  .then((role) => {
    return !!role
  })
}

exports.getAdmins = () => {
  return new AV.Query(AV.Role)
  .equalTo('name', 'admin')
  .first()
  .then((role) => {
    return role.relation('users').query()
    .find()
  })
}
