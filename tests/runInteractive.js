import { createInterface } from 'node:readline';
import axios from 'axios';

// API基础URL
const API_BASE_URL = 'https://doh6cthxf8.hzh.sealos.run';

// 用户认证相关信息
let currentUser = {
  userId: null,
  username: null,
  token: null
};

// 创建包含授权令牌的请求头
const createAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Authorization': currentUser.token ? `Bearer ${currentUser.token}` : ''
  };
};

// 创建一个交互式的输入函数
const getUserInput = async (question) => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

// 用户注册功能
const register = async () => {
  console.log('\n=== 用户注册 ===');
  
  // 获取用户输入的注册信息
  const username = await getUserInput('请输入用户名: ');
  if (!username.trim()) {
    console.log('❌ 用户名不能为空');
    return false;
  }
  
  const password = await getUserInput('请输入密码: ');
  if (!password.trim()) {
    console.log('❌ 密码不能为空');
    return false;
  }
  
  const confirmPassword = await getUserInput('请确认密码: ');
  if (password !== confirmPassword) {
    console.log('❌ 两次输入的密码不一致');
    return false;
  }
  
  const email = await getUserInput('请输入邮箱(可选): ');
  
  try {
    console.log('正在注册...');
    
    const response = await axios.post(`${API_BASE_URL}/login`, {
      username,
      password,
      email: email.trim() || undefined
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ 注册成功!');
      
      // 询问是否立即登录
      const loginNow = await getUserInput('是否立即登录? (y/n): ');
      if (loginNow.toLowerCase() === 'y') {
        return await login(username, password);
      }
      
      return true;
    } else {
      console.log(`❌ 注册失败: ${response.data.message || '未知错误'}`);
      return false;
    }
  } catch (error) {
    console.error('注册失败:', error.response?.data?.message || error.message);
    console.log('❌ 注册失败');
    return false;
  }
};

// 修改登录函数，支持预填的用户名和密码
const login = async (prefillUsername = null, prefillPassword = null) => {
  console.log('\n=== 用户登录 ===');
  
  // 如果传入了用户名和密码，则使用传入值，否则请求用户输入
  const username = prefillUsername || await getUserInput('请输入用户名: ');
  const password = prefillPassword || await getUserInput('请输入密码: ');
  
  try {
    console.log('正在登录...');
    
    const response = await axios.post(`${API_BASE_URL}/sign`, {
      username,
      password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success && response.data.code === 200) {
      currentUser = {
        userId: response.data.userData.id,
        username: response.data.userData.username,
        token: response.data.token
      };
      
      console.log(`✅ 登录成功! 欢迎 ${currentUser.username}`);
      console.log(`用户ID: ${currentUser.userId}`);
      return true;
    } else {
      console.log(`❌ 登录失败: ${response.data.message || '未知错误'}`);
      return false;
    }
  } catch (error) {
    console.error('登录失败:', error.response?.data?.message || error.message);
    console.log('❌ 登录失败');
    return false;
  }
};

// 用户登出功能
const logout = async () => {
  console.log('\n=== 用户登出 ===');
  
  if (!currentUser.userId) {
    console.log('❗ 您当前未登录');
    return false;
  }
  
  try {
    console.log(`正在登出用户: ${currentUser.username}...`);
    
    try {
      // 调用登出API
      await axios.post(`${API_BASE_URL}/logout`, {
        token: currentUser.token
      }, {
        headers: createAuthHeaders()
      });
    } catch (error) {
      console.log('注意: API登出请求失败，但将继续清除本地登录状态');
    }
    
    // 清除用户信息
    const oldUsername = currentUser.username;
    currentUser = {
      userId: null,
      username: null,
      token: null
    };
    
    console.log(`✅ 已成功登出用户: ${oldUsername}`);
    return true;
  } catch (error) {
    console.error('登出过程中发生错误:', error.message);
    console.log('❌ 登出失败');
    return false;
  }
};

// 显示功能测试菜单
const showFunctionalTestMenu = async () => {
  console.log('\n=== Todo功能测试 ===');
  
  if (currentUser.userId) {
    console.log(`当前用户: ${currentUser.username} (ID: ${currentUser.userId})`);
  } else {
    console.log('未登录状态');
  }
  
  console.log('1. 获取所有待办事项');
  console.log('2. 插入新待办事项');
  console.log('3. 删除待办事项');
  console.log('4. 改变待办事项状态');
  console.log('5. 数据验证测试');
  
  // 根据登录状态显示不同的选项
  if (currentUser.userId) {
    console.log('6. 用户登出');
  } else {
    console.log('6. 用户登录');
  }
  
  // 添加用户注册选项
  console.log('7. 用户注册');
  console.log('8. 退出测试');
  
  const choice = await getUserInput('\n请选择要运行的功能测试 (1-8): ');
  return choice;
};

// 检查是否已登录
const checkLogin = async () => {
  if (!currentUser.userId || !currentUser.token) {
    console.log('❗ 您尚未登录，请先登录');
    return await login();
  }
  return true;
};

// 1. 测试获取所有待办事项
const testGetAllTodos = async () => {
  console.log('\n开始测试: 获取所有待办事项');
  
  // 检查是否已登录
  const isLoggedIn = await checkLogin();
  if (!isLoggedIn) {
    const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
    return continueChoice.toLowerCase() === 'y';
  }
  
  console.log('正在从服务器加载待办事项列表...');
  
  try {
    const response = await axios({
      url: `${API_BASE_URL}/get_list`,
      method: 'GET',
      headers: createAuthHeaders(),
      params: {
        userId: currentUser.userId // 添加用户ID作为查询参数
      }
    });
    
    const items = response.data.list || [];
    
    if (items.length === 0) {
      console.log('列表为空，没有待办事项');
    } else {
      console.log(`共加载 ${items.length} 个待办事项:`);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`${i+1}. "${item.value}" - ${item.isComplete ? '已完成' : '未完成'}`);
      }
    }
    
    // 自动判断是否成功获取列表
    if (response.status === 200 && Array.isArray(response.data.list)) {
      console.log('✅ 测试通过: 成功获取所有待办事项');
    } else {
      console.log('❌ 测试失败: 获取待办事项失败');
    }
  } catch (error) {
    console.error('获取待办事项失败:', error.message);
    console.log('❌ 测试失败: API请求错误');
  }
  
  const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
  return continueChoice.toLowerCase() === 'y';
};

// 2. 测试插入新待办事项
const testAddTodo = async () => {
  console.log('\n开始测试: 插入新待办事项');
  
  // 检查是否已登录
  const isLoggedIn = await checkLogin();
  if (!isLoggedIn) {
    const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
    return continueChoice.toLowerCase() === 'y';
  }
  
  // 获取用户输入的待办事项内容
  const todoText = await getUserInput('请输入要添加的待办事项内容: ');
  
  if (!todoText.trim()) {
    console.log('❌ 输入为空，取消添加');
    const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
    return continueChoice.toLowerCase() === 'y';
  }
  
  console.log(`输入内容: "${todoText}"`);
  
  try {
    // 获取添加前的列表
    const beforeResponse = await axios({
      url: `${API_BASE_URL}/get_list`,
      method: 'GET',
      headers: createAuthHeaders(),
      params: {
        userId: currentUser.userId
      }
    });
    
    const beforeItems = beforeResponse.data.list || [];
    
    // 添加新待办事项
    const addResponse = await axios({
      url: `${API_BASE_URL}/add_list`,
      method: 'POST',
      headers: createAuthHeaders(),
      data: {
        value: todoText,
        isComplete: false,
        userId: currentUser.userId // 添加用户ID
      }
    });
    
    console.log('添加操作已执行，正在检查结果');
    
    // 获取更新后的列表
    const afterResponse = await axios({
      url: `${API_BASE_URL}/get_list`,
      method: 'GET',
      headers: createAuthHeaders(),
      params: {
        userId: currentUser.userId
      }
    });
    
    const afterItems = afterResponse.data.list || [];
    
    // 自动判断是否成功添加项目
    if (afterItems.length > beforeItems.length && 
        afterItems.some(item => item.value === todoText)) {
      console.log('✅ 测试通过: 成功添加新待办事项');
    } else {
      console.log('❌ 测试失败: 添加待办事项失败');
    }
  } catch (error) {
    console.error('添加待办事项失败:', error.message);
    console.log('❌ 测试失败: API请求错误');
  }
  
  const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
  return continueChoice.toLowerCase() === 'y';
};

// 3. 测试删除待办事项
const testDeleteTodo = async () => {
  console.log('\n开始测试: 删除待办事项');
  
  // 检查是否已登录
  const isLoggedIn = await checkLogin();
  if (!isLoggedIn) {
    const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
    return continueChoice.toLowerCase() === 'y';
  }
  
  try {
    // 获取待办事项列表
    const response = await axios({
      url: `${API_BASE_URL}/get_list`,
      method: 'GET',
      headers: createAuthHeaders(),
      params: {
        userId: currentUser.userId
      }
    });
    
    const items = response.data.list || [];
    
    if (items.length === 0) {
      console.log('列表为空，没有可删除的待办事项');
      const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
      return continueChoice.toLowerCase() === 'y';
    }
    
    console.log('当前待办事项列表:');
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`${i+1}. "${item.value}" - ${item.isComplete ? '已完成' : '未完成'}`);
    }
    
    // 获取用户选择要删除的项目
    const selectedIndex = parseInt(await getUserInput('请选择要删除的待办事项编号: ')) - 1;
    
    if (selectedIndex < 0 || selectedIndex >= items.length) {
      console.log('❌ 无效的编号选择');
      const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
      return continueChoice.toLowerCase() === 'y';
    }
    
    // 删除选中的待办事项
    const selectedItem = items[selectedIndex];
    const selectedItemId = selectedItem._id;
    console.log(`删除待办事项: "${selectedItem.value}"`);
    
    await axios({
      url: `${API_BASE_URL}/del_list`,
      method: 'POST',
      headers: createAuthHeaders(),
      data: {
        id: selectedItemId,
        userId: currentUser.userId // 添加用户ID
      }
    });
    
    console.log('删除操作已执行，正在检查结果');
    
    // 获取更新后的列表
    const updatedResponse = await axios({
      url: `${API_BASE_URL}/get_list`,
      method: 'GET',
      headers: createAuthHeaders(),
      params: {
        userId: currentUser.userId
      }
    });
    
    const updatedItems = updatedResponse.data.list || [];
    
    // 自动判断项目是否已被删除
    const itemStillExists = updatedItems.some(item => item._id === selectedItemId);
    if (!itemStillExists) {
      console.log('✅ 测试通过: 成功删除待办事项');
    } else {
      console.log('❌ 测试失败: 删除待办事项失败');
    }
  } catch (error) {
    console.error('删除待办事项失败:', error.message);
    console.log('❌ 测试失败: API请求错误');
  }
  
  const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
  return continueChoice.toLowerCase() === 'y';
};

// 4. 测试更新待办事项状态
const testUpdateTodoStatus = async () => {
  console.log('\n开始测试: 更新待办事项状态');
  
  // 检查是否已登录
  const isLoggedIn = await checkLogin();
  if (!isLoggedIn) {
    const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
    return continueChoice.toLowerCase() === 'y';
  }
  
  try {
    // 获取待办事项列表
    const response = await axios({
      url: `${API_BASE_URL}/get_list`,
      method: 'GET',
      headers: createAuthHeaders(),
      params: {
        userId: currentUser.userId
      }
    });
    
    const items = response.data.list || [];
    
    if (items.length === 0) {
      console.log('列表为空，没有可更新的待办事项');
      const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
      return continueChoice.toLowerCase() === 'y';
    }
    
    console.log('当前待办事项列表:');
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`${i+1}. "${item.value}" - ${item.isComplete ? '已完成' : '未完成'}`);
    }
    
    // 获取用户选择要更新的项目
    const selectedIndex = parseInt(await getUserInput('请选择要更新状态的待办事项编号: ')) - 1;
    
    if (selectedIndex < 0 || selectedIndex >= items.length) {
      console.log('❌ 无效的编号选择');
      const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
      return continueChoice.toLowerCase() === 'y';
    }
    
    // 更新选中的待办事项状态
    const selectedItem = items[selectedIndex];
    const originalStatus = selectedItem.isComplete;
    console.log(`更新待办事项: "${selectedItem.value}" - 当前状态: ${originalStatus ? '已完成' : '未完成'}`);
    
    await axios({
      url: `${API_BASE_URL}/update_list`,
      method: 'POST',
      headers: createAuthHeaders(),
      data: {
        id: selectedItem._id,
        userId: currentUser.userId // 添加用户ID
      }
    });
    
    console.log('状态更新操作已执行，正在检查结果');
    
    // 获取更新后的列表
    const updatedResponse = await axios({
      url: `${API_BASE_URL}/get_list`,
      method: 'GET',
      headers: createAuthHeaders(),
      params: {
        userId: currentUser.userId
      }
    });
    
    const updatedItems = updatedResponse.data.list || [];
    
    // 查找并显示更新后的状态
    const updatedItem = updatedItems.find(item => item._id === selectedItem._id);
    if (updatedItem) {
      // 自动判断状态是否已被更新
      if (updatedItem.isComplete !== originalStatus) {
        console.log('✅ 测试通过: 成功更新待办事项状态');
      } else {
        console.log('❌ 测试失败: 更新待办事项状态失败');
      }
    } else {
      console.log('❌ 测试失败: 无法找到更新后的项目');
    }
  } catch (error) {
    console.error('更新待办事项状态失败:', error.message);
    console.log('❌ 测试失败: API请求错误');
  }
  
  const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
  return continueChoice.toLowerCase() === 'y';
};

// 5. 数据验证测试
const testDataValidation = async () => {
  console.log('\n开始测试: 数据验证测试');
  console.log('此测试将检查系统对无效数据的处理能力');
  
  // 检查是否已登录
  const isLoggedIn = await checkLogin();
  if (!isLoggedIn) {
    const continueChoice = await getUserInput('\n是否继续测试? (y/n): ');
    return continueChoice.toLowerCase() === 'y';
  }
  
  let continueValidationTest = true;
  while (continueValidationTest) {
    // 显示数据验证测试子菜单
    console.log('\n选择要进行的数据验证测试:');
    console.log('1. 空内容处理测试');
    console.log('2. 超长内容测试');
    console.log('3. 无效ID测试');
    console.log('4. 错误格式数据测试');
    console.log('5. 返回主菜单');
    
    const validationChoice = await getUserInput('\n请选择测试类型 (1-5): ');
    
    if (validationChoice === '5') {
      return true; // 返回主菜单
    }
    
    try {
      switch (validationChoice) {
        case '1': 
          // 空内容处理测试 - 直接执行而非让用户选择
          console.log('\n进行空内容处理测试');
          console.log('使用空字符串进行测试...');
          const emptyValue = '';
          
          try {
            await axios({
              url: `${API_BASE_URL}/add_list`,
              method: 'POST',
              headers: createAuthHeaders(),
              data: {
                value: emptyValue,
                isComplete: false,
                userId: currentUser.userId
              }
            });
            console.log('系统接受了空内容，建议增加前端验证');
          } catch (error) {
            if (error.response && error.response.status === 400) {
              console.log('✅ 系统正确拒绝了空内容');
            } else {
              console.log(`❓ 系统返回了意外错误: ${error.message}`);
            }
          }
          break;
          
        case '2':
          // 超长内容测试
          console.log('\n进行超长内容测试');
          const useDefaultLongTest = await getUserInput('是否使用默认测试数据(1000个字符)? (y/n): ');
          let longText = 'a'.repeat(1000); // 默认创建一个1000字符的字符串
          
          if (useDefaultLongTest.toLowerCase() !== 'y') {
            const customLength = parseInt(await getUserInput('请输入要测试的字符长度: '));
            const customChar = await getUserInput('请输入要重复的字符(默认为"a"): ') || 'a';
            longText = customChar.charAt(0).repeat(customLength || 1000);
            console.log(`将测试 ${customLength || 1000} 个 "${customChar.charAt(0)}" 字符`);
          }
          
          try {
            await axios({
              url: `${API_BASE_URL}/add_list`,
              method: 'POST',
              headers: createAuthHeaders(),
              data: {
                value: longText,
                isComplete: false,
                userId: currentUser.userId
              }
            });
            console.log(`系统接受了 ${longText.length} 个字符的内容，请检查是否有长度限制`);
          } catch (error) {
            if (error.response && error.response.status === 400) {
              console.log(`✅ 系统正确拒绝了 ${longText.length} 个字符的内容`);
            } else {
              console.log(`❓ 系统返回了意外错误: ${error.message}`);
            }
          }
          break;
          
        case '3':
          // 无效ID测试
          console.log('\n进行无效ID测试');
          const useDefaultIdTest = await getUserInput('是否使用默认测试数据(随机ID)? (y/n): ');
          let invalidId = 'invalid_id_' + Math.floor(Math.random() * 1000000);
          
          if (useDefaultIdTest.toLowerCase() !== 'y') {
            invalidId = await getUserInput('请输入要测试的无效ID: ');
          } else {
            console.log(`将使用随机生成的ID: ${invalidId}`);
          }
          
          try {
            await axios({
              url: `${API_BASE_URL}/del_list`,
              method: 'POST',
              headers: createAuthHeaders(),
              data: {
                id: invalidId,
                userId: currentUser.userId
              }
            });
            console.log(`系统接受了无效ID "${invalidId}"，请检查ID验证逻辑`);
          } catch (error) {
            if (error.response && (error.response.status === 400 || error.response.status === 404)) {
              console.log(`✅ 系统正确拒绝了无效ID "${invalidId}"`);
            } else {
              console.log(`❓ 系统返回了意外错误: ${error.message}`);
            }
          }
          break;
          
        case '4':
          // 错误格式数据测试
          console.log('\n进行错误格式数据测试');
          const useDefaultFormatTest = await getUserInput('是否使用默认测试数据(缺少必要字段)? (y/n): ');
          let wrongData = {
            wrongField: 'Test value',
            isComplete: 'not a boolean',
            userId: currentUser.userId // 添加用户ID以确保身份验证
          };
          
          if (useDefaultFormatTest.toLowerCase() !== 'y') {
            console.log('请输入要测试的错误格式数据(JSON格式):');
            console.log('示例: { "wrongField": "Test value", "isComplete": "not a boolean" }');
            const customDataStr = await getUserInput('> ');
            try {
              wrongData = JSON.parse(customDataStr);
              // 确保添加用户ID
              wrongData.userId = currentUser.userId;
            } catch (e) {
              console.log('JSON解析错误，将使用默认测试数据');
            }
          } else {
            console.log(`将使用默认测试数据: ${JSON.stringify(wrongData)}`);
          }
          
          try {
            await axios({
              url: `${API_BASE_URL}/add_list`,
              method: 'POST',
              headers: createAuthHeaders(),
              data: wrongData
            });
            console.log(`系统接受了错误格式数据 ${JSON.stringify(wrongData)}，请检查数据验证逻辑`);
          } catch (error) {
            if (error.response && error.response.status === 400) {
              console.log('✅ 系统正确拒绝了错误格式数据');
            } else {
              console.log(`❓ 系统返回了意外错误: ${error.message}`);
            }
          }
          break;
          
        default:
          console.log('❌ 无效的选择，请重新选择');
          continue;
      }
      
      console.log('\n单项测试完成');
      const continueChoice = await getUserInput('是否继续进行数据验证测试? (y/n): ');
      continueValidationTest = continueChoice.toLowerCase() === 'y';
    } catch (error) {
      console.error('测试过程中发生错误:', error);
      const continueChoice = await getUserInput('是否继续进行数据验证测试? (y/n): ');
      continueValidationTest = continueChoice.toLowerCase() === 'y';
    }
  }
  
  // 完成所有数据验证测试后，询问是否继续
  const continueTest = await getUserInput('\n是否继续测试? (y/n): ');
  return continueTest.toLowerCase() === 'y';
};

// 运行测试选择器
const runSelectedFunctionalTest = async (testId) => {
  switch (testId) {
    case '1':
      return await testGetAllTodos();
    case '2':
      return await testAddTodo();
    case '3':
      return await testDeleteTodo();
    case '4':
      return await testUpdateTodoStatus();
    case '5':
      return await testDataValidation();
    case '6':
      // 根据当前登录状态选择执行登录或登出
      if (currentUser.userId) {
        await logout();
        return true;
      } else {
        return await login();
      }
    case '7':
      return await register();
    case '8':
      return false; // 退出测试
    default:
      console.log('无效的选择，请输入1-8的数字');
      return true;
  }
};

// 主函数
const main = async () => {
  console.log('\n=== Todo应用功能测试 ===');
  console.log('所有测试将使用真实API调用，登录后可使用所有功能');
  
  try {
    let continueTest = true;
    while (continueTest) {
      const choice = await showFunctionalTestMenu();
      continueTest = await runSelectedFunctionalTest(choice);
    }
    
    console.log('\n功能测试结束');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
};

// 启动主程序
main().catch(console.error);