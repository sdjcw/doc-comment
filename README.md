# LeanCloud 文档段落评论插件

可以实现文档的段落评论。

该部分为 server 端。使用 LeanEngine 实现。

## API

* 测试环境: http://dev.comment.avosapps.com
* 生产环境: https://comment.avosapps.com

### 获取指定文档所有片段的评论数

```
GET /docs/${docVersion}/commentCount
```

响应

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

[{"snippetVersion":"06e4f90a2c480330879e3338a9fa7da3","count":1},{"snippetVersion":"06e4f90a2c480330879e3338a9fa7da4","count":2}]
```

### 获取指定文档指定片段的所有评论

```
GET /docs/${docVersion}/snippets/${snippetVersion}/comments
```

响应

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

[{"snippetVersion":"06e4f90a2c480330879e3338a9fa7da3","docVersion":"b63e8e4af811ab29603573e632aefb30","content": "testestt","author":"sdjcw","objectId":"5575559ce4b029ae60058611","createdAt":"2015-06-08T08:43:08.326Z","updatedAt":"2015-06-08T08:43:08.326Z"}]
```

### 创建评论

```
POST /docs/${docVersion}/snippets/${snippetVersion}/comments

content=testComment
```

响应

如果未登录

```
HTTP/1.1 302 Moved Temporarily
Location: /users/login
```

如果已经登录

```
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{"content":"testestt","docVersion":"b63e8e4af811ab29603573e632aefb30","snippetVersion":"06e4f90a2c480330879e3338a9fa7da3","author":"sdjcw","objectId":"55759276e4b029ae6014f94c","createdAt":"2015-06-08T13:02:46.004Z","updatedAt":"2015-06-08T13:02:46.004Z"}
```

### 用户登录

因为现在只支持 LeanCloud OAuth 登录，所以登录不需要传递任何参数

```
GET /users/login
```

响应

```
HTTP/1.1 302 Moved Temporarily
Location: https://leancloud.cn/1.1/authorize?client_id=3MEQH98FRcQ5juifG9cP3nzzI90ooiM7&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fusers%2Foauth2%2Fcallback&scope=client%3Ainfo
```

跳转到 `Location` 指定的 URL 即可进行 OAuth 授权。授权完成后自动跳转到 `/users/oauth2/callback?code=vnl84m2z` 样子的地址，该地址响应：

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"username":"wchen"}
```

此时 cookie 已经保存用户的登录信息，即可提交 comment。

### 用户登出

```
GET /users/logout
```

响应

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{}
```

### 当前用户

```
GET /users/current
```

响应

如果登录

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"username":"wchen"}
```

如果未登录

```
HTTP/1.1 401 OK
Content-Type: text/plain; charset=utf-8

Unauthorized
```
