import React, {Component} from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'
import { Navbar, Nav, NavItem, NavDropdown, MenuItem} from 'react-bootstrap'
import {LinkContainer} from 'react-router-bootstrap'
import AV from 'leancloud-storage'

export default class GlobalNav extends Component {
  
  constructor(props) {
    super(props)
    this.state = {}
  }

  handleLogout() {
    this.setState({redirectToReferrer: true})
  }

  render() {
    return (
      <Navbar>
        <Navbar.Header>
          <Navbar.Brand>
            <Link to='/'>文档评论</Link>
          </Navbar.Brand>
          <Navbar.Toggle />
        </Navbar.Header>
        <Navbar.Collapse>
          <Nav>
            <LinkContainer to="/comments">
              <NavItem>我的评论</NavItem>
            </LinkContainer>
            {this.props.isAdmin &&
              <LinkContainer to="/admin/comments">
                <NavItem>评论控制台</NavItem>
              </LinkContainer>
            }
            {this.props.isAdmin &&
              <LinkContainer to="/admin/assigneeConfig">
                <NavItem>负责人管理</NavItem>
              </LinkContainer>
            }
          </Nav>
          <Nav pullRight>
            {AV.User.current() &&
              <NavDropdown noCaret title={AV.User.current().get('username')} id='username-dropdown'>
                <MenuItem divider />
                <MenuItem onClick={() => this.props.logout()}>登出</MenuItem>
              </NavDropdown>
            }
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    )
  }
}

GlobalNav.propTypes = {
  location: PropTypes.object,
  isAdmin: PropTypes.bool.isRequired,
  logout: PropTypes.func.isRequired,
}
