import cloud from '@lafjs/cloud'

export default async function (ctx) {
  const db = cloud.mongo.db
  const { value, isComplete, userId } = ctx.body
  
  try {
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
          message: '无权为其他用户添加待办事项'
        }
      }
    } catch (e) {
      return {
        success: false,
        code: 401,
        message: '无效的授权令牌'
      }
    }
    
    // 参数验证
    if (!value || !userId) {
      return {
        success: false,
        code: 400,
        message: '待办事项内容和用户ID不能为空'
      }
    }
    
    // 创建新的待办事项
    const newTodo = {
      value,
      isComplete: isComplete || false,
      userId, // 绑定到特定用户
      createdAt: new Date()
    }
    
    // 插入数据库
    const result = await db.collection('todos').insertOne(newTodo)
    
    return {
      success: true,
      code: 201,
      message: '添加成功',
      id: result.insertedId
    }
  } catch (error) {
    console.error('添加待办事项失败:', error)
    return {
      success: false,
      code: 500,
      message: '服务器内部错误'
    }
  }
} 