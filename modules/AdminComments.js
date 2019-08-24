import React, { Component, PropTypes } from 'react'
import { Form, FormGroup, FormControl, ControlLabel, Tooltip, OverlayTrigger, Button } from 'react-bootstrap'
import moment from 'moment'
import xss from 'xss'
import qs from 'query-string'
const AV = require('leancloud-storage')

import { COMMENT_STATUS } from '../lib/constant'
import {getAdmins} from './common'
import MailModal from './MailModal'

export default class AdminComments extends Component {

  constructor(props) {
    super(props)
    this.state = {
      assignees: [],
      comments: [],
      isMailModalOpen: false,
    }
  }

  componentDidMount() {
    return getAdmins()
    .then(assignees=> {
      this.setState({assignees})
      return this.findComments(this.props.location.query)
    })
  }
  
  componentWillReceiveProps(nextProps) {
    return this.findComments(nextProps.location.query)
  }

  findComments(filters) {
    if (Object.keys(filters).length === 0) {
      return this.updateFilter({commentStatus: COMMENT_STATUS.NEW, assigneeId: AV.User.current().id})
    }
    const {commentStatus, assigneeId} = filters
    const query = new AV.Query('Comment')
    .equalTo('status', parseInt(commentStatus))
    if (assigneeId !== '') {
      const assignee = this.state.assignees.find(a => {
        return a.id === assigneeId
      })
      query.containedIn('docFile', assignee.get('responsibilities') || [])
    }
    return query.include('author')
    .include('assignee')
    .include('snippet')
    .limit(50)
    .descending('createdAt')
    .find()
    .then(comments => {
      this.setState({comments})
    })
    .catch(this.context.addNotification)
  }

  updateFilter(filter) {
    const filters = Object.assign({}, this.props.location.query, filter)
    this.context.router.push('/admin/comments?' + qs.stringify(filters))
  }

  handleCommentStatusChange(comment, status) {
    if (status !== COMMENT_STATUS.DELETED || confirm('评论：' + comment.get('content') + '\n\n 确认删除？')) {
      comment.save({status})
      .then(() => {
        var comments = this.state.comments
        comments = comments.filter(c => c !== comment)
        this.setState({comments})
      })
      .catch(this.context.addNotification)
    }
  }

  showMailModal(comment) {
    this.setState({isMailModalOpen: true, mailComment: comment})
  }

  closeMailModal() {
    this.setState({isMailModalOpen: false, mailComment: null})
  }

  render() {
    return (
      <div>
        <h1>评论列表</h1>
        <Form inline>
          <FormGroup>
            <ControlLabel>状态</ControlLabel>
            <FormControl componentClass="select" onChange={(e) => this.updateFilter({commentStatus: e.target.value})}>
              <option value={COMMENT_STATUS.NEW}>未处理</option>
              <option value={COMMENT_STATUS.ARCHIVED}>归档保留</option>
              <option value={COMMENT_STATUS.RESOLVED}>已处理</option>
              <option value={COMMENT_STATUS.DELETED}>已删除</option>
              <option value={COMMENT_STATUS.EXPIRED}>已过期</option>
            </FormControl>
          </FormGroup>
          {' '}
          <FormGroup>
            <ControlLabel>负责人</ControlLabel>
            <FormControl componentClass="select" value={this.props.location.query && this.props.location.query.assigneeId || ''} onChange={(e) => this.updateFilter({assigneeId: e.target.value})}>
              <option key='undefined' value=''>全部</option>
              {this.state.assignees.map(assignee => {
                return <option key={assignee.id} value={assignee.id}>{assignee.get('username')}</option>
              })}
            </FormControl>
          </FormGroup>
        </Form>
        <CommentList
          comments={this.state.comments}
          handleCommentStatusChange={this.handleCommentStatusChange.bind(this)}
          showMailModal={this.showMailModal.bind(this)}
        />
        <MailModal
          isMailModalOpen={this.state.isMailModalOpen}
          comment={this.state.mailComment}
          closeMailModal={this.closeMailModal.bind(this)}
        />
      </div>
    )
  }
}

AdminComments.propTypes = {
  location: PropTypes.object,
}

AdminComments.contextTypes = {
  router: PropTypes.object.isRequired,
  addNotification: PropTypes.func.isRequired,
}

class CommentList extends Component {

  render() {
    var commentNodes = this.props.comments.map((comment) => {
      return (
        <tr key={comment.id}>
          <td><a href={'https://leancloud.cn/docs/' + comment.get('docFile') + '#' + comment.get('snippetVersion')} target='_blank'>{comment.get('docFile')}</a></td>
          <td dangerouslySetInnerHTML={{__html: xss(comment.get('snippet').get('content_HTML'))}} />
          <td dangerouslySetInnerHTML={{__html: xss(comment.get('content_HTML'))}} />
          <td>{comment.get('author').get('username')}</td>
          <td>{comment.get('assignee') && comment.get('assignee').get('username')}</td>
          <td>{moment(comment.createdAt).fromNow()}</td>
          <td><CommentOps
            handleCommentStatusChange={this.props.handleCommentStatusChange.bind(this)}
            showMailModal={this.props.showMailModal.bind(this)}
            comment={comment} /></td>
        </tr>
      )
    })
    return (
      <div>
        <table className='table table-striped'>
          <thead>
            <tr>
              <th>文档段落</th>
              <th>文档</th>
              <th>评论内容</th>
              <th>评论人</th>
              <th>负责人</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {commentNodes}
          </tbody>
        </table>
      </div>
    )
  }

}

CommentList.propTypes = {
  comments: PropTypes.array,
  handleCommentStatusChange: PropTypes.func,
  showMailModal: PropTypes.func.isRequired,
}

class CommentOps extends Component {

  render() {
    const archiveTooltip = (
      <Tooltip id='archiveTooltip'>对于有意义的补充性评论建议保留</Tooltip>
    )
    const resolveTooltip = (
      <Tooltip id='resolveTooltip'>评论指出的问题已经修复，则可以删除相关评论</Tooltip>
    )
    const removeTooltip = (
      <Tooltip id='removeTooltip'>无意义或者不合适的评论，可以直接删除</Tooltip>
    )
    const mailTooltip = (
      <Tooltip id='mailTooltip'>需要的时候可以给用户发邮件</Tooltip>
    )
    return (
      <div>
        <OverlayTrigger placement="left" overlay={archiveTooltip} delayShow={300} delayHide={150}>
          <Button bsStyle='default' onClick={() => this.props.handleCommentStatusChange(this.props.comment, COMMENT_STATUS.ARCHIVED)}>保留</Button>
        </OverlayTrigger>
        <OverlayTrigger placement="left" overlay={resolveTooltip} delayShow={300} delayHide={150}>
          <Button bsStyle='default' onClick={() => this.props.handleCommentStatusChange(this.props.comment, COMMENT_STATUS.RESOLVED)}>已解决，删除</Button>
        </OverlayTrigger>
        <OverlayTrigger placement="left" overlay={removeTooltip} delayShow={300} delayHide={150}>
          <Button bsStyle='default' onClick={() => this.props.handleCommentStatusChange(this.props.comment, COMMENT_STATUS.DELETED)}>直接删除</Button>
        </OverlayTrigger>
        <OverlayTrigger placement="left" overlay={mailTooltip} delayShow={300} delayHide={150}>
          <Button bsStyle='default' onClick={() => this.props.showMailModal(this.props.comment)}>发邮件</Button>
        </OverlayTrigger>
      </div>
    )
  }

}

CommentOps.propTypes = {
  comment: PropTypes.object.isRequired,
  handleCommentStatusChange: PropTypes.func,
  showMailModal: PropTypes.func.isRequired,
}
