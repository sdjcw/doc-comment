import React, { Component, PropTypes } from 'react'
import { Modal, Form, FormGroup, FormControl, ControlLabel, Button } from 'react-bootstrap'
const AV = require('leancloud-storage')

export default class MailModal extends Component {

  constructor(props) {
    super(props)
    this.state = {
      title: '',
      content: '',
      isSendMailButtonDisable: false,
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.comment) {
      return
    }
    let content = `您好：
感谢您在 LeanCloud 的文档留下评论。

<TODO>

--------------------

文档片段：
${nextProps.comment.get('snippet').get('content')}

评论内容：
${nextProps.comment.get('content')}
`
    this.setState({
      title: '回复：LeanCloud 文档评论',
      content: content
    })
  }

  handleTitleChange(e) {
    this.setState({title: e.target.value})
  }

  handleContentChange(e) {
    this.setState({content: e.target.value})
  }

  close() {
    this.props.closeMailModal()
  }

  handleSendClick() {
    this.setState({isSendMailButtonDisable: true})
    AV.Cloud.run('sendMail', {
      toUserId: this.props.comment.get('author').id,
      title: this.state.title,
      content: this.state.content,
    })
    .then(() => {
      this.setState({isSendMailButtonDisable: false})
      this.props.closeMailModal()
    })
  }

  render() {
    if (!this.props.comment) {
      return <div></div>
    }

    return (
      <Modal show={this.props.isMailModalOpen} onHide={() => this.props.closeMailModal()}>
        <Modal.Header closeButton>
          <Modal.Title>邮件回复评论</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <FormGroup>
              <ControlLabel>发件人</ControlLabel>
              <FormControl.Static>{`${AV.User.current().get('username')} <${AV.User.current().get('email')}`}></FormControl.Static>
            </FormGroup>
            <FormGroup>
              <ControlLabel>收件人</ControlLabel>
              <FormControl.Static>{`${this.props.comment.get('author').get('username')} <${this.props.comment.get('author').get('email')}`}></FormControl.Static>
            </FormGroup>
            <FormGroup>
              <ControlLabel>邮件标题</ControlLabel>
              <FormControl type="text" value={this.state.title} onChange={this.handleTitleChange.bind(this)} />
            </FormGroup>
            <FormGroup>
              <ControlLabel>正文</ControlLabel>
              <FormControl componentClass="textarea" rows='20' value={this.state.content} onChange={this.handleContentChange.bind(this)} />
            </FormGroup>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => this.props.closeMailModal()}>关闭</Button>
          <Button bsStyle='primary' disabled={this.state.isSendMailButtonDisable} onClick={this.handleSendClick.bind(this)}>发送</Button>
        </Modal.Footer>
      </Modal>
    )
  }

}

MailModal.propTypes = {
  isMailModalOpen: PropTypes.bool.isRequired,
  comment: PropTypes.object,
  closeMailModal: PropTypes.func.isRequired,
}
