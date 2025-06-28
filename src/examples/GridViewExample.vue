<template>
  <div class="grid-view-example">
    <h2>GridView 组件示例</h2>
    <p>这是一个只负责渲染的网格组件，不包含任何交互功能</p>
    
    <div class="demo-container">
      <GridView
        :config="gridConfig"
        :items="gridItems"
        :cell-items="cellItems"
      >
        <!-- 自定义单元格内容 -->
        <template #cell="{ item, child }">
          <div class="custom-cell">
            <div class="cell-title">{{ child.title || child.id }}</div>
            <div class="cell-content">{{ child.content || '内容' }}</div>
          </div>
        </template>
      </GridView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import GridView from "../components/GridView.vue";
import type { GridConfig, GridLayoutData, GridCellData } from "../components/type";

// 网格配置
const gridConfig: GridConfig = {
  rows: 3,
  cols: 4,
  gap: 10,
};

// 网格布局项
const gridItems: GridLayoutData[] = [
  {
    id: "container-1",
    x: 0,
    y: 0,
    w: 2,
    h: 1,
    direction: "horizontal",
    align: "center",
  },
  {
    id: "container-2",
    x: 2,
    y: 0,
    w: 2,
    h: 2,
    direction: "vertical",
    align: "stretch",
  },
  {
    id: "container-3",
    x: 0,
    y: 1,
    w: 1,
    h: 2,
    direction: "vertical",
    align: "center",
  },
  {
    id: "container-4",
    x: 1,
    y: 1,
    w: 1,
    h: 1,
    direction: "horizontal",
    align: "center",
  },
];

// 单元格数据
const cellItems: GridCellData[] = [
  // container-1 的子项 (水平布局)
  {
    parentId: "container-1",
    id: "cell-1-1",
    w: 1,
    h: 1,
    title: "按钮1",
    content: "点击",
  },
  {
    parentId: "container-1",
    id: "cell-1-2",
    w: 1,
    h: 1,
    title: "按钮2",
    content: "操作",
  },
  {
    parentId: "container-1",
    id: "cell-1-3",
    w: 1,
    h: 1,
    title: "按钮3",
    content: "设置",
  },

  // container-2 的子项 (垂直布局)
  {
    parentId: "container-2",
    id: "cell-2-1",
    w: -1,
    h: 1,
    title: "标题区域",
    content: "这是一个标题",
  },
  {
    parentId: "container-2",
    id: "cell-2-2",
    w: -1,
    h: -1,
    title: "内容区域",
    content: "这是主要内容区域",
  },
  {
    parentId: "container-2",
    id: "cell-2-3",
    w: -1,
    h: 1,
    title: "底部区域",
    content: "底部信息",
  },

  // container-3 的子项 (垂直布局)
  {
    parentId: "container-3",
    id: "cell-3-1",
    w: 1,
    h: 1,
    title: "图标1",
    content: "📊",
  },
  {
    parentId: "container-3",
    id: "cell-3-2",
    w: 1,
    h: 1,
    title: "图标2",
    content: "📈",
  },

  // container-4 的子项 (水平布局)
  {
    parentId: "container-4",
    id: "cell-4-1",
    w: 1,
    h: 1,
    title: "小按钮",
    content: "✓",
  },
];
</script>

<style scoped>
.grid-view-example {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.demo-container {
  width: 800px;
  height: 600px;
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  margin: 20px 0;
  background: #f5f5f5;
}

.custom-cell {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.custom-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.cell-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 4px;
  text-align: center;
}

.cell-content {
  font-size: 12px;
  text-align: center;
  opacity: 0.9;
}

h2 {
  color: #333;
  margin-bottom: 10px;
}

p {
  color: #666;
  margin-bottom: 20px;
}
</style> 