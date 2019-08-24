import React, {Component} from 'react'
import PropTypes from 'prop-types'

export default class Login extends Component {

  componentDidMount() {
    const query = this.props.location.query
    if (query.token) {
      this.props.loginByToken(query.token)
      .then(() => {
        this.context.router.push('/')
      })
      .catch(this.props.addNotification)
    }
  }

  render() {
    return <div>
      <h2>登录或注册</h2>
      <p>目前只支持通过 LeanCloud OAuth 授权进行登录和注册。</p>
      <a href='/users/login' className='btn btn-primary'>前往 LeanCloud 授权页</a>
    </div>
  }
}

Login.propTypes = {
  location: PropTypes.object,
  loginByToken: PropTypes.func.isRequire,
  addNotification: PropTypes.func.isRequire,
}

Login.contextTypes = {
  router: PropTypes.object.isRequired
}
