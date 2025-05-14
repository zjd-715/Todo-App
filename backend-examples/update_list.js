import cloud from '@lafjs/cloud'
import { ObjectId } from 'mongodb'

export default async function (ctx) {
  const db = cloud.mongo.db
  const { id, userId } = ctx.body
  
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
          message: '无权更新其他用户的待办事项'
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
    if (!id || !userId) {
      return {
        success: false,
        code: 400,
        message: '待办事项ID和用户ID不能为空'
      }
    }
    
    // 查找该待办事项
    const todo = await db.collection('todos').findOne({
      _id: new ObjectId(id),
      userId: userId // 确保只能更新自己的待办事项
    })
    
    if (!todo) {
      return {
        success: false,
        code: 404,
        message: '待办事项不存在或无权访问'
      }
    }
    
    // 切换完成状态
    const updateResult = await db.collection('todos').updateOne(
      { _id: new ObjectId(id), userId: userId },
      { $set: { isComplete: !todo.isComplete, updatedAt: new Date() } }
    )
    
    if (updateResult.modifiedCount === 0) {
      return {
        success: false,
        code: 400,
        message: '更新失败，待办事项可能已被删除'
      }
    }
    
    return {
      success: true,
      code: 200,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新待办事项状态失败:', error)
    return {
      success: false,
      code: 500,
      message: '服务器内部错误'
    }
  }
} 