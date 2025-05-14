import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/style.css'

// 创建Vue应用
const app = createApp(App)

// 使用路由
app.use(router)

// 挂载应用
app.mount('#app')
