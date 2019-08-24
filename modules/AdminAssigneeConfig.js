import React, { Component, PropTypes } from 'react'
import _ from 'lodash'
import { Table, DropdownButton, MenuItem } from 'react-bootstrap'
import AV from 'leancloud-storage'

import {getAdmins} from './common'

export default class AdminConfig extends Component {

  constructor(props) {
    super(props)
    this.state ={
      admins: [],
      docs: [],
    }
  }

  componentDidMount() {
    Promise.all([
      getAdmins(),
      new AV.Query('Release')
      .equalTo('env', 'cn-n1')
      .descending('createdAt')
      .first()
      .then(release => {
        return new AV.Query('Release_Doc')
        .equalTo('release', release)
        .include('doc')
        .limit(1000)
        .find()
        .then(releaseDocs => {
          return releaseDocs.map(rdoc => {
            return rdoc.get('doc')
          })
        })
      })
    ])
    .then(([admins, docs]) => {
      this.setState({admins, docs})
    })
  }

  handleAddOwner(doc, userId) {
    AV.Cloud.run('addDocOwner', {userId, docFile: doc.get('file')})
    .then((admin) => {
      admin = AV.parseJSON(admin)
      const admins = this.state.admins
      admins.forEach((a, i) => {
        if (a.id === admin.id) {
          admins[i] = admin
        }
      })
      this.setState({admins})
    })
  }

  handleRemoveOwner(doc, userId) {
    AV.Cloud.run('removeDocOwner', {userId, docFile: doc.get('file')})
    .then((admin) => {
      admin = AV.parseJSON(admin)
      const admins = this.state.admins
      admins.forEach((a, i) => {
        if (a.id === admin.id) {
          admins[i] = admin
        }
      })
      this.setState({admins})
    })
  }

  render() {
    const adminOptions = _.map(this.state.admins, admin => {
      return <MenuItem eventKey={admin.id}>{admin.get('username')}</MenuItem>
    })
    const docs = this.state.docs.map((doc) => {
      const owners = _.compact(this.state.admins.map((user) => {
        if (_.includes(user.get('responsibilities'), doc.get('file'))) {
          return (
            <DropdownButton noCaret title={user.get('username')} onSelect={() => this.handleRemoveOwner(doc, user.id)}>
              <MenuItem>移除</MenuItem>
            </DropdownButton>
          )
        }
      }))
      return (
        <tr key={doc.id}>
          <td><a href={'https://leancloud.cn/docs/' + doc.get('file')} target='_blank'>{doc.get('file')}</a></td>
          <td>
            {owners}
            <DropdownButton title='添加负责人' onSelect={(id) => this.handleAddOwner(doc, id)}>
              {adminOptions}
            </DropdownButton>
          </td>
        </tr>
      )
    })
    return (
      <div>
        <h1>管理员配置</h1>
        <Table striped bordered condensed hover>
          <thead>
            <tr>
              <th>文档</th>
              <th>负责人</th>
            </tr>
          </thead>
          <tbody>
            {docs}
          </tbody>
        </Table>
      </div>
    )
  }
}

AdminConfig.propTypes = {
  loadAdmins: PropTypes.func.isRequired,
  loadDocs: PropTypes.func.isRequired,
  addDocOwner: PropTypes.func.isRequired,
  removeDocOwner: PropTypes.func.isRequired,
}
