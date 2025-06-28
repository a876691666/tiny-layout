<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Grid from "./components/Grid.vue";
import GridView from "./components/GridView.vue";

// 网格配置
const gridConfig = ref({
  rows: 9,
  cols: 16,
  gap: 4,
});

// 网格项数据（不包含children）
const GridLayouts = ref([
  {
    id: "left-panel",
    x: 0,
    y: 1,
    w: 3,
    h: 8,
    direction: "vertical" as const, // 左侧面板使用纵向布局
  },
  {
    id: "right-panel",
    x: 13,
    y: 1,
    w: 3,
    h: 8,
    type: "panel",
    direction: "vertical" as const, // 右侧面板使用纵向布局
  },
  {
    id: "top-panel",
    x: 0,
    y: 0,
    w: 16,
    h: 1,
    direction: "horizontal" as const, // 顶部面板使用横向布局
  },
  {
    id: "bottom-panel",
    x: 3,
    y: 7,
    w: 10,
    h: 2,
    type: "panel",
    direction: "vertical" as const, // 底部面板使用纵向布局
  },
  {
    id: "top-tools",
    x: 3,
    y: 1,
    w: 10,
    h: 1,
    align: "start" as const,
    type: "tools",
    direction: "horizontal" as const, // 顶部工具栏使用横向布局
  },
  {
    id: "left-tools",
    x: 3,
    y: 2,
    w: 1,
    h: 5,
    type: "tools",
    align: "start" as const,
    direction: "vertical" as const, // 顶部工具栏使用横向布局
  },
  {
    id: "right-tools",
    x: 12,
    y: 2,
    w: 1,
    h: 5,
    type: "tools",
    align: "start" as const,
    direction: "vertical" as const, // 顶部工具栏使用横向布局
  },
]);

// 扁平化的网格单元项数据
const gridCellItems = ref([
  { parentId: "left-panel", id: "left-panel-1", label: "左侧面板1", w: -1, h: 2 },
  { parentId: "left-panel", id: "left-panel-2", label: "左侧面板2", w: -1, h: 2 },
  { parentId: "left-panel", id: "left-panel-3", label: "左侧面板3", w: -1, h: 2 },
  { parentId: "right-panel", id: "right-panel-1", label: "右侧面板1", w: -1, h: 2 },
  { parentId: "right-panel", id: "right-panel-2", label: "右侧面板2", w: -1, h: 2 },
  { parentId: "right-panel", id: "right-panel-3", label: "右侧面板3", w: -1, h: 2 },

  { parentId: "bottom-panel", id: "bottom-panel-2", label: "底部面板2", w: -1, h: 2 },

  { parentId: "top-panel", id: "header-center", label: "大标题", w: 16, h: -1 },
  // { parentId: "bottom-panel", id: "status", w: -1, h: 1 },
  // { parentId: "bottom-panel", id: "console", w: -1, h: 1 },
  { parentId: "left-tools", id: "tools-1", label: "按钮1", w: 1, h: 1 },
  { parentId: "left-tools", id: "tools-2", label: "按钮2", w: 1, h: 1 },
  { parentId: "top-tools", id: "tools-3", label: "按钮3", w: 1, h: 1 },
  { parentId: "top-tools", id: "tools-4", label: "按钮4", w: 1, h: 1 },
  { parentId: "top-tools", id: "tools-5", label: "按钮5", w: 1, h: 1 },
  { parentId: "right-tools", id: "tools-6", label: "按钮6", w: 1, h: 1 },
  { parentId: "right-tools", id: "tools-7", label: "按钮7", w: 1, h: 1 },
]);

// 是否显示调试信息
const showDebug = ref(true); // 默认开启调试以便测试拖拽功能

// 网格容器尺寸状态
const gridWrapperSize = ref({
  width: 800,
  height: 450, // 默认16:9比例
});

// 设置默认尺寸（16:9比例）
onMounted(() => {
  const defaultWidth = Math.min(window.innerWidth * 0.8, 1200);
  const defaultHeight = (defaultWidth * 9) / 16;
  gridWrapperSize.value = {
    width: defaultWidth,
    height: defaultHeight,
  };
});

// Grid组件引用
const gridRef = ref();

// 处理子项移动事件
const onChildMoved = (operation: any) => {
  console.log("子项移动事件:", operation);
};

// 处理子项点击事件
const onChildClick = (child: any, parentId: string, index: number) => {
  console.log("子项点击事件:", { child, parentId, index });
};

// 外部拖拽演示数据
const externalItems = ref([
  { id: "external-button-1", label: "外部按钮1", w: 1, h: 1 },
  { id: "external-panel-1", label: "外部面板1", w: -1, h: 2 },
  { id: "external-tool-1", label: "外部工具1", w: 1, h: 1 },
]);

// 开始外部拖拽
const startExternalDrag = (item: any, type?: string) => {
  if (gridRef.value) {
    gridRef.value.startDrag(type, item);
    console.log("开始外部拖拽:", { item, type });
  }
};

// 结束外部拖拽
const endExternalDrag = () => {
  if (gridRef.value) {
    gridRef.value.endDrag();
    console.log("结束外部拖拽");
  }
};

// 显示模式：'grid' 或 'gridview'
const displayMode = ref('grid');
</script>

<template>
  <div id="app">
    <!-- 标题栏 -->
    <div class="header">
      <h1>Vue Grid Layout 拖拽演示</h1>
      <div class="controls">
        <button @click="showDebug = !showDebug">{{ showDebug ? "隐藏" : "显示" }}调试信息</button>
        <button @click="displayMode = displayMode === 'grid' ? 'gridview' : 'grid'">
          切换到{{ displayMode === 'grid' ? 'GridView' : 'Grid' }}模式
        </button>
      </div>
    </div>

    <!-- 网格容器包装器 -->
    <div class="main-content">
      <div class="grid-demos">
        <!-- Grid 演示区域 -->
        <div
          v-if="displayMode === 'grid'"
          class="grid-wrapper"
          :style="{
            width: gridWrapperSize.width + 'px',
            height: gridWrapperSize.height + 'px',
          }"
        >
          <h3 class="grid-title">Grid 演示（可拖拽）</h3>
          <Grid
            ref="gridRef"
            v-model="GridLayouts"
            v-model:cell-items="gridCellItems"
            :config="gridConfig"
            :show-debug="showDebug"
            @child-moved="onChildMoved"
            @child-click="onChildClick"
          >
            <!-- 自定义单元格内容 -->
            <template #cell="{ item, child }">
              <div class="custom-cell-content">
                <div class="cell-title">{{ child.label }}</div>
                <div class="cell-info">{{ child.parentId }} - {{ child.w }}×{{ child.h }}</div>
              </div>
            </template>
          </Grid>
        </div>

        <!-- GridView演示区域 -->
        <div
          v-if="displayMode === 'gridview'"
          class="gridview-wrapper"
        >
          <h3>GridView 演示（纯展示）</h3>
          <div
            class="gridview-container"
            :style="{
              width: gridWrapperSize.width + 'px',
              height: gridWrapperSize.height + 'px',
            }"
          >
            <GridView
              :config="gridConfig"
              :items="GridLayouts"
              :cell-items="gridCellItems"
            >
              <!-- 自定义单元格内容 -->
              <template #cell="{ item, child }">
                <div class="custom-cell-content">
                  <div class="cell-title">{{ child.label }}</div>
                  <div class="cell-info">{{ child.parentId }} - {{ child.w }}×{{ child.h }}</div>
                  <div class="cell-tag">GridView</div>
                </div>
              </template>
            </GridView>
          </div>
        </div>
      </div>

      <!-- 外部拖拽演示区域 -->
      <div class="external-drag-demo">
        <h3>外部拖拽演示</h3>
        <div class="external-items">
          <div
            v-for="item in externalItems"
            :key="item.id"
            class="external-item"
            @mousedown="startExternalDrag(item)"
            @mouseup="endExternalDrag"
          >
            <div class="item-label">{{ item.label }}</div>
            <div class="item-info">{{ item.w }}×{{ item.h }}</div>
          </div>
        </div>
        
        <div class="type-demo">
          <h4>按类型拖拽演示</h4>
          <div class="type-items">
            <div
              class="external-item type-panel"
              @mousedown="startExternalDrag({ id: 'external-panel-type', label: '面板类型', w: -1, h: 2 }, 'panel')"
              @mouseup="endExternalDrag"
            >
              <div class="item-label">面板类型</div>
              <div class="item-info">type="panel"</div>
            </div>
            <div
              class="external-item type-tools"
              @mousedown="startExternalDrag({ id: 'external-tools-type', label: '工具类型', w: 1, h: 1 }, 'tools')"
              @mouseup="endExternalDrag"
            >
              <div class="item-label">工具类型</div>
              <div class="item-info">type="tools"</div>
            </div>
            <div
              class="external-item type-none"
              @mousedown="startExternalDrag({ id: 'external-none-type', label: '无类型', w: -1, h: 1 })"
              @mouseup="endExternalDrag"
            >
              <div class="item-label">无类型</div>
              <div class="item-info">无type</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 功能说明 -->
      <div class="instructions">
        <h3>功能说明：</h3>
        <ul>
          <li>🎯 点击并拖动任意子项来移动它</li>
          <li>📦 可以在同一个容器内重新排序</li>
          <li>🔄 可以将子项拖拽到其他容器中</li>
          <li>👁️ 拖拽时会显示视觉反馈</li>
          <li>📊 开启调试信息可以看到详细日志</li>
          <li>🆕 <strong>外部拖拽</strong>：按住左侧外部项目并移动鼠标到目标容器</li>
          <li>🎯 外部拖拽会根据type限制显示占位符</li>
          <li>🖱️ 在目标位置松开鼠标完成外部拖拽</li>
          <li>🔄 <strong>模式切换</strong>：点击右上角按钮切换Grid和GridView模式</li>
        </ul>

        <h3>组件对比：</h3>
        <ul>
          <li>🎮 <strong>Grid组件</strong>：完整的拖拽交互功能</li>
          <li style="margin-left: 20px">• 支持内部子项重新排序</li>
          <li style="margin-left: 20px">• 支持跨容器拖拽</li>
          <li style="margin-left: 20px">• 支持外部拖拽</li>
          <li style="margin-left: 20px">• 支持type限制规则</li>
          <li style="margin-left: 20px">• 实时视觉反馈</li>
          <li>👁️ <strong>GridView组件</strong>：纯展示用途</li>
          <li style="margin-left: 20px">• 只负责渲染布局</li>
          <li style="margin-left: 20px">• 无拖拽交互</li>
          <li style="margin-left: 20px">• 轻量级、高性能</li>
          <li style="margin-left: 20px">• 适合只读场景</li>
        </ul>

        <h3>布局说明：</h3>
        <ul>
          <li>📋 <strong>纵向布局</strong>：子项垂直排列</li>
          <li>➡️ <strong>横向布局</strong>：子项水平排列</li>
          <li>🎲 拖拽逻辑会根据容器方向自动调整</li>
        </ul>

        <h3>Type 限制规则：</h3>
        <ul>
          <li>📝 <strong>容器类型分类</strong>：</li>
          <li style="margin-left: 20px">• <code>无type</code>：left-panel、top-panel</li>
          <li style="margin-left: 20px">• <code>type="panel"</code>：right-panel、bottom-panel</li>
          <li style="margin-left: 20px">• <code>type="tools"</code>：所有工具栏容器</li>
          <li>🟢 <strong>允许的拖拽操作</strong>：</li>
          <li style="margin-left: 20px">• 相同类型容器间的跨容器拖拽</li>
          <li style="margin-left: 20px">• 任何容器内的子项重新排序</li>
          <li>🔴 <strong>限制的拖拽操作</strong>：</li>
          <li style="margin-left: 20px">• 不同类型容器间的跨容器拖拽</li>
          <li style="margin-left: 20px">• 例如：panel类型 ↔ 无type容器</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0;
  color: #007acc;
  font-size: 24px;
}

.controls button {
  padding: 8px 16px;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 8px;
}

.controls button:first-child {
  margin-left: 0;
}

.controls button:hover {
  background: #005a94;
}

.main-content {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.grid-demos {
  display: flex;
  gap: 20px;
}

.grid-wrapper {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 2px solid #e1e8ed;
  box-sizing: border-box;
  flex-shrink: 0;
}

.grid-title {
  margin: -10px 0 15px 0;
  color: #007acc;
  font-size: 18px;
  text-align: center;
}

.instructions {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 350px;
  flex-shrink: 0;
  max-height: 80vh;
  overflow-y: auto;
}

.instructions h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #007acc;
  font-size: 16px;
  border-bottom: 2px solid #e1e8ed;
  padding-bottom: 5px;
}

.instructions h3:not(:first-child) {
  margin-top: 20px;
}

.instructions ul {
  padding-left: 20px;
}

.instructions li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.custom-cell-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.cell-title {
  font-weight: bold;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.cell-info {
  font-size: 10px;
  color: #666;
  text-align: center;
  line-height: 1.2;
}

/* 外部拖拽演示区域样式 */
.external-drag-demo {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 300px;
  flex-shrink: 0;
  margin-bottom: 20px;
}

.external-drag-demo h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #007acc;
  font-size: 16px;
  border-bottom: 2px solid #e1e8ed;
  padding-bottom: 5px;
}

.external-drag-demo h4 {
  margin-top: 20px;
  margin-bottom: 10px;
  color: #007acc;
  font-size: 14px;
}

.external-items,
.type-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.external-item {
  padding: 8px 12px;
  border: 2px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
  cursor: grab;
  transition: all 0.2s ease;
  user-select: none;
}

.external-item:hover {
  border-color: #007acc;
  background: #f0f8ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 122, 204, 0.2);
}

.external-item:active {
  cursor: grabbing;
  transform: translateY(0);
}

.external-item.type-panel {
  border-color: #ff6b6b;
  background: #fff5f5;
}

.external-item.type-panel:hover {
  border-color: #ff4757;
  background: #ffe6e6;
}

.external-item.type-tools {
  border-color: #ffa502;
  background: #fffbf0;
}

.external-item.type-tools:hover {
  border-color: #ff9500;
  background: #fff4e0;
}

.external-item.type-none {
  border-color: #70a1ff;
  background: #f1f4ff;
}

.external-item.type-none:hover {
  border-color: #5352ed;
  background: #e8ecff;
}

.item-label {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 4px;
  color: #333;
}

.item-info {
  font-size: 11px;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .main-content {
    flex-direction: column;
  }

  .instructions,
  .external-drag-demo {
    max-width: none;
  }
}

/* GridView演示区域样式 */
.gridview-wrapper {
  margin-top: 20px;
}

.gridview-wrapper h3 {
  margin: 0 0 15px 0;
  color: #28a745;
  font-size: 18px;
  text-align: center;
}

.gridview-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 2px solid #28a745;
  box-sizing: border-box;
  flex-shrink: 0;
}

.gridview-cell {
  background: #f8fff9 !important;
  border: 1px solid #28a745 !important;
}

.gridview-cell .cell-tag {
  font-size: 8px;
  color: #28a745;
  font-weight: bold;
  margin-top: 2px;
  padding: 1px 4px;
  background: #e8f5e8;
  border-radius: 2px;
}
</style>
