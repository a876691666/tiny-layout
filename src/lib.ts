import type { App } from 'vue'
import GridLayout from './components/GridLayout.vue'
import Grid from './components/Grid.vue'
import GridView from './components/GridView.vue'
import GridItemView from './components/GridItemView.vue'
import type { 
  GridCellData, 
  GridLayoutData, 
  GridConfig 
} from './components/type'

// 导出所有组件
export { GridLayout, Grid, GridView, GridItemView }

// 导出所有类型定义
export type { 
  GridCellData, 
  GridLayoutData, 
  GridConfig 
}

// 所有组件列表
const components = [
  GridLayout,
  Grid,
  GridView,
  GridItemView
]

// Vue插件安装函数
export const install = (app: App) => {
  // 注册所有组件
  components.forEach(component => {
    const componentName = component.name || component.__name || 'UnknownComponent'
    app.component(componentName, component)
  })
}

// Vue插件对象
export const IceLayout = {
  install
}

// 默认导出Vue插件
export default IceLayout

// 版本信息从package.json读取
import packageInfo from '../package.json'
export const version = packageInfo.version

// 支持按需导入的同时也支持全量导入
declare module 'vue' {
  export interface GlobalComponents {
    GridLayout: typeof GridLayout
    Grid: typeof Grid
    GridView: typeof GridView
    GridItemView: typeof GridItemView
  }
}
