module.exports = {
  commentStatus: {
    NEW: 0, 
    RESOLVED: 1,
    ARCHIVED: 2,
    EXPIRED: 3,
    DELETED: 4,
  },
  COMMENT_STATUS: {
    NEW: 0, // 会展示的评论，新产生的，还没人管
    RESOLVED: 1, // 不会展示的评论，一般用于指出文档问题，文档修复后将评论设置为该状态
    ARCHIVED: 2, // 会展示的评论，一般用于保留有价值的评论
    EXPIRED: 3, // 不会展示的评论，标记评论所在的文档片段过期
    DELETED: 4, // 不会展示的评论，一般用于对无意义的评论的删除
  }
}
