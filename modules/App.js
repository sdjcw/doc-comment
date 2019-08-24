import React, {Component} from 'react'
import PropTypes from 'prop-types'
import NotificationSystem from 'react-notification-system'
import AV from 'leancloud-storage'

import common from './common'
import GlobalNav from './GlobalNav'

export default class App extends Component {

  constructor(props) {
    super(props)
    this.state = {
      isAdmin: false,
    }
  }

  componentDidMount() {
    this._notificationSystem = this.refs.notificationSystem
    if (AV.User.current()) {
      return common.isAdmin(AV.User.current())
      .then(isAdmin => {
        this.setState({isAdmin})
      })
    } else {
      this.context.router.push('/login')
    }
  }

  addNotification(obj) {
    if (obj instanceof Error) {
      const message = obj.message
      const match = message.match(/^Cloud Code validation failed. Error detail : (.*)$/)
      this._notificationSystem.addNotification({
        message: match ? match[1] : message,
        level: 'error',
      })
    } else {
      this._notificationSystem.addNotification({
        message: obj && obj.message || '操作成功',
        level: obj && obj.level || 'success',
      })
    }
  }

  loginByToken(token) {
    return AV.User.become(token)
    .then((user) => {
      return common.isAdmin(user)
    })
    .then(isAdmin => {
      this.setState({isAdmin})
    })
  }

  logout() {
    return AV.User.logOut()
    .then(() => {
      this.setState({isAdmin: false})
      this.context.router.push('/login')
    })
  }

  getChildContext() {
    return {addNotification: this.addNotification.bind(this)}
  }

  render() {
    return (
      <div>
        <GlobalNav
          isAdmin={this.state.isAdmin}
          logout={this.logout.bind(this)}
        />
        <div className="container">
          {this.props.children && React.cloneElement(this.props.children, {
            loginByToken: this.loginByToken.bind(this),
            isAdmin: this.state.isAdmin,
          })}
        </div>
        <NotificationSystem ref="notificationSystem" />
      </div>
    )
  }
}

App.propTypes = {
  children: PropTypes.object.isRequired,
}

App.contextTypes = {
  router: PropTypes.object.isRequired
}

App.childContextTypes = {
  addNotification: PropTypes.func
}
