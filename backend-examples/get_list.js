import cloud from '@lafjs/cloud'

export default async function (ctx: FunctionContext) {
  const db = cloud.mongo.db
  
  try {
    // 从请求中获取用户ID
    const userId = ctx.query.userId
    
    // 检查授权令牌
    const token = ctx.headers['authorization']?.replace('Bearer ', '')
    
    if (!token) {
      return {
        success: false,
        code: 401,
        message: '未提供授权令牌'
      }
    }
    
    // 验证令牌
    try {
      const payload = cloud.parseToken(token)
      
      // 确保令牌中的用户ID和请求中的用户ID匹配
      if (payload.uid !== userId) {
        return {
          success: false,
          code: 403,
          message: '无权访问其他用户的待办事项'
        }
      }
    } catch (e) {
      return {
        success: false,
        code: 401,
        message: '无效的授权令牌'
      }
    }
    
    // 通过用户ID过滤待办事项
    const filter = { userId: userId }
    
    // 查询当前用户的待办事项列表
    const todoList = await db.collection('todos').find(filter).toArray()
    
    return {
      success: true,
      code: 200,
      message: '获取成功',
      list: todoList
    }
  } catch (error) {
    console.error('获取待办事项列表失败:', error)
    return {
      success: false,
      code: 500,
      message: '服务器内部错误'
    }
  }
} 