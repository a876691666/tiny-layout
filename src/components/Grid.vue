<template>
  <div class="grid-container">
    <div class="grid" :style="gridStyle">
      <!-- 网格项 -->
      <GridLayout
        v-for="item in items"
        :key="item.id"
        :id="item.id"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :type="item.type"
        :children="getChildrenForItem(item.id)"
        :gap="gap"
        :direction="item.direction || 'vertical'"
        :align="item.align || 'center'"
        :debug="showDebug"
        @move-child="handleMoveChild"
        @reorder-children="handleReorderChildren"
      >
        <!-- 传递cell slot给GridLayout -->
        <template #cell="{ item, child }">
          <slot name="cell" :item="item" :child="child">
            <div class="default-child-content">
              {{ child.id }}
            </div>
          </slot>
        </template>
      </GridLayout>
    </div>

    <!-- 调试信息 -->
    <div v-if="showDebug" class="debug-info">
      <h3>网格配置</h3>
      <pre>{{ JSON.stringify(getGridConfig(), null, 2) }}</pre>
      <h3>拖拽操作历史</h3>
      <div class="drag-history">
        <div v-for="(operation, index) in dragHistory" :key="index" class="drag-operation">
          {{ operation }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import GridLayout from "./GridLayout.vue";
import type { GridLayoutData, GridConfig, GridCellData } from "./type";

interface GridProps {
  config: GridConfig;
  showDebug?: boolean;
}

const props = withDefaults(defineProps<GridProps>(), {
  showDebug: false,
});

// 定义事件
const emit = defineEmits<{
  "child-moved": [operation: { type: "move" | "reorder"; from: any; to: any; timestamp: number }];
}>();

// 使用 defineModel 替换传统的 v-model 实现
const items = defineModel<GridLayoutData[]>("modelValue", { default: () => [] });
const cellItems = defineModel<GridCellData[]>("cellItems", { default: () => [] });

// 拖拽历史记录
const dragHistory = ref<string[]>([]);

// 网格配置
const rows = ref(0);
const cols = ref(0);
const gap = ref(0);

// 监听配置变化
watch(
  () => props.config,
  (newConfig) => {
    rows.value = newConfig.rows;
    cols.value = newConfig.cols;
    gap.value = newConfig.gap || 0;
  },
  { immediate: true }
);

// 根据 parentId 获取子项
const getChildrenForItem = (parentId: string) => {
  return cellItems.value.filter((cell) => cell.parentId === parentId);
};

// 处理跨容器移动子项
const handleMoveChild = (
  from: { parentId: string; childId: string; index: number },
  to: { parentId: string; index: number }
) => {
  const sourceChildren = getChildrenForItem(from.parentId);
  const targetChildren = getChildrenForItem(to.parentId);

  // 找到要移动的子项
  const childToMove = sourceChildren.find((child) => child.id === from.childId);
  if (!childToMove) {
    console.error(`找不到要移动的子项: ${from.childId}`);
    return;
  }

  // 创建新的cellItems数组
  const newCellItems = [...cellItems.value];

  // 从源容器中移除子项
  const sourceIndex = newCellItems.findIndex((item) => item.id === from.childId);
  if (sourceIndex === -1) {
    console.error(`找不到要移动的子项索引: ${from.childId}`);
    return;
  }

  // 移除原项目
  newCellItems.splice(sourceIndex, 1);

  // 更新子项的parentId
  const updatedChild = { ...childToMove, parentId: to.parentId };

  // 计算插入位置
  let insertIndex = newCellItems.length;
  let currentTargetIndex = 0;

  for (let i = 0; i < newCellItems.length; i++) {
    if (newCellItems[i].parentId === to.parentId) {
      if (currentTargetIndex === to.index) {
        insertIndex = i;
        break;
      }
      currentTargetIndex++;
    }
  }

  // 插入到目标位置
  newCellItems.splice(insertIndex, 0, updatedChild);

  // 更新数据
  cellItems.value = newCellItems;

  // 添加到历史记录
  const operation = `移动 ${from.childId} 从 ${from.parentId}[${from.index}] 到 ${to.parentId}[${to.index}]`;
  dragHistory.value.unshift(operation);
  if (dragHistory.value.length > 10) {
    dragHistory.value.pop();
  }

  // 发出事件
  emit("child-moved", {
    type: "move",
    from: from,
    to: to,
    timestamp: Date.now(),
  });

  console.log("跨容器移动完成:", operation);
};

// 处理同容器内重排序
const handleReorderChildren = (parentId: string, fromIndex: number, toIndex: number) => {
  const parentChildren = getChildrenForItem(parentId);

  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= parentChildren.length ||
    toIndex > parentChildren.length
  ) {
    return;
  }

  // 创建新的cellItems数组
  const newCellItems = [...cellItems.value];

  // 找到该容器的所有子项在全局数组中的索引
  const parentChildrenIndices: number[] = [];
  newCellItems.forEach((item, index) => {
    if (item.parentId === parentId) {
      parentChildrenIndices.push(index);
    }
  });

  if (parentChildrenIndices.length !== parentChildren.length) {
    console.error("子项索引数量不匹配");
    return;
  }

  // 获取要移动的项目
  const sourceGlobalIndex = parentChildrenIndices[fromIndex];
  const itemToMove = newCellItems[sourceGlobalIndex];

  // 从数组中移除
  newCellItems.splice(sourceGlobalIndex, 1);

  // 重新计算插入位置（因为移除了一个元素，后面的索引都会前移）
  let targetGlobalIndex;
  if (toIndex >= parentChildrenIndices.length) {
    // 插入到最后
    targetGlobalIndex = newCellItems.length;
  } else {
    // 重新获取目标位置的全局索引
    let targetLocalIndex = 0;
    for (let i = 0; i < newCellItems.length; i++) {
      if (newCellItems[i].parentId === parentId) {
        if (targetLocalIndex === toIndex) {
          targetGlobalIndex = i;
          break;
        }
        targetLocalIndex++;
      }
    }
    if (targetGlobalIndex === undefined) {
      targetGlobalIndex = newCellItems.length;
    }
  }

  // 插入到新位置
  newCellItems.splice(targetGlobalIndex, 0, itemToMove);

  // 更新数据
  cellItems.value = newCellItems;

  // 添加到历史记录
  const operation = `重排序 ${parentId} 中的项目: ${fromIndex} -> ${toIndex}`;
  dragHistory.value.unshift(operation);
  if (dragHistory.value.length > 10) {
    dragHistory.value.pop();
  }

  // 发出事件
  emit("child-moved", {
    type: "reorder",
    from: { parentId, index: fromIndex },
    to: { parentId, index: toIndex },
    timestamp: Date.now(),
  });

  console.log("容器内重排序完成:", operation);
};

// 样式
const gridStyle = ref({
  position: "relative" as const,
  width: "100%",
  height: "100%",
  display: "grid",
  gridTemplateColumns: `repeat(${cols.value}, 1fr)`,
  gridTemplateRows: `repeat(${rows.value}, 1fr)`,
  gap: `${gap.value}px`,
});

// 监听样式相关的值变化
watch(
  () => [cols.value, rows.value, gap.value],
  () => {
    gridStyle.value = {
      position: "relative" as const,
      width: "100%",
      height: "100%",
      display: "grid",
      gridTemplateColumns: `repeat(${cols.value}, 1fr)`,
      gridTemplateRows: `repeat(${rows.value}, 1fr)`,
      gap: `${gap.value}px`,
    };
  },
  { immediate: true }
);

// 获取网格配置信息
const getGridConfig = () => {
  return {
    rows: rows.value,
    cols: cols.value,
    gap: gap.value,
    totalItems: items.value.length,
    totalCellItems: cellItems.value.length,
  };
};
</script>

<style scoped>
.grid-container {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.grid {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.debug-info {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  font-family: monospace;
  font-size: 12px;
  margin-top: 20px;
  box-sizing: border-box;
}

.debug-info h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.debug-info pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.drag-history {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 2px;
  padding: 5px;
  background: white;
}

.drag-operation {
  padding: 2px 0;
  font-size: 11px;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
}

.drag-operation:last-child {
  border-bottom: none;
}

.default-grid-item-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #007acc;
  box-sizing: border-box;
}

.default-child-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #666;
  box-sizing: border-box;
}
</style>
