/*global LEANCLOUD_APP_ID, LEANCLOUD_APP_KEY, LEANCLOUD_APP_ENV*/
import React from 'react'
import { Router, Route, browserHistory } from 'react-router'
import AV from 'leancloud-storage'

import App from './App'
import Login from './Login'
import AdminComments from './AdminComments'
import AdminAssigneeConfig from './AdminAssigneeConfig'

AV.init({
  appId: LEANCLOUD_APP_ID,
  appKey: LEANCLOUD_APP_KEY,
})
AV.setProduction(LEANCLOUD_APP_ENV === 'production')

module.exports = (
  <Router history={browserHistory}>
    <Route path="/" component={App}>
      <Route path='/login' component={Login} />
      <Route path='/admin/comments' component={AdminComments} />
      <Route path='/admin/assigneeConfig' component={AdminAssigneeConfig} />
    </Route>
  </Router>
)
