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
        @child-click="handleChildClick"
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
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import GridLayout from "./GridLayout.vue";
import type { GridLayoutData, GridConfig, GridCellData } from "./type";

interface GridProps {
  config: GridConfig;
  showDebug?: boolean;
  /**
   * 控制外部拖拽行为
   * - true: 直接插入到v-model数据中，触发child-moved事件
   * - false: 不插入数据，只触发 drag-add 事件，由父组件自行处理
   */
  insertExternalDrag?: boolean;
}

const props = withDefaults(defineProps<GridProps>(), {
  showDebug: false,
  insertExternalDrag: true,
});

// 定义事件
const emit = defineEmits<{
  "child-moved": [operation: { type: "move" | "reorder"; from: any; to: any; timestamp: number }];
  "child-click": [child: GridCellData, parentId: string, index: number];
  "drag-add": [data: { item: GridCellData; parentId: string; index: number; timestamp: number }];
}>();

// 使用 defineModel 替换传统的 v-model 实现
const items = defineModel<GridLayoutData[]>("modelValue", { default: () => [] });
const cellItems = defineModel<GridCellData[]>("cellItems", { default: () => [] });

// 拖拽历史记录
const dragHistory = ref<string[]>([]);

// 外部拖拽状态
const externalDragState = ref<{
  isActive: boolean;
  draggedItem: GridCellData | null;
  sourceType?: string;
  targetParentId: string | null;
  targetIndex: number;
  showPlaceholder: boolean;
}>({
  isActive: false,
  draggedItem: null,
  sourceType: undefined,
  targetParentId: null,
  targetIndex: -1,
  showPlaceholder: false,
});

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

  // 检查目标容器是否需要更新sort值
  const targetContainerChildren = newCellItems.filter(item => item.parentId === to.parentId);
  const needsSort = targetContainerChildren.length > 1 && !targetContainerChildren.some(child => child.sort !== undefined);
  
  if (needsSort) {
    // 为目标容器的所有子项设置sort值
    const updatedCellItems = [...newCellItems];
    targetContainerChildren.forEach((child, index) => {
      const globalIndex = updatedCellItems.findIndex(item => item.id === child.id);
      if (globalIndex !== -1) {
        updatedCellItems[globalIndex] = { ...child, sort: index };
      }
    });
    cellItems.value = updatedCellItems;
    
    console.log("跨容器移动后更新目标容器sort值", {
      targetParentId: to.parentId,
      children: targetContainerChildren.map(child => ({ id: child.id, sort: child.sort })),
    });
  }

  // 添加到历史记录
  const operation = `移动 ${from.childId} 从 ${from.parentId}[${from.index}] 到 ${to.parentId}[${to.index}]${needsSort ? ' (更新sort)' : ''}`;
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

// 处理子项点击事件
const handleChildClick = (child: GridCellData, parentId: string, index: number) => {
  emit("child-click", child, parentId, index);
};

// 处理同容器内重排序
const handleReorderChildren = (parentId: string, fromIndex: number, toIndex: number, shouldUpdateSort?: boolean) => {
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

  // 如果需要更新sort，统一设置sort值
  if (shouldUpdateSort) {
    const updatedCellItems = [...newCellItems];
    const currentParentChildren = updatedCellItems.filter(item => item.parentId === parentId);
    
    // 为该容器的所有子项设置sort值
    currentParentChildren.forEach((child, index) => {
      const globalIndex = updatedCellItems.findIndex(item => item.id === child.id);
      if (globalIndex !== -1) {
        updatedCellItems[globalIndex] = { ...child, sort: index };
      }
    });
    
    cellItems.value = updatedCellItems;
    
    console.log("更新sort值", {
      parentId,
      children: currentParentChildren.map(child => ({ id: child.id, sort: child.sort })),
    });
  }

  // 添加到历史记录
  const operation = `重排序 ${parentId} 中的项目: ${fromIndex} -> ${toIndex}${shouldUpdateSort ? ' (更新sort)' : ''}`;
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

// 外部拖拽开始函数
const startDrag = (type?: string, gridLayoutItem?: Partial<GridCellData>) => {
  if (!gridLayoutItem) {
    console.error("startDrag: gridLayoutItem 参数是必需的");
    return;
  }

  // 创建默认的拖拽项数据
  const defaultItem: GridCellData = {
    parentId: "", // 外部拖拽时parentId为空
    id: gridLayoutItem.id || `external-${Date.now()}`,
    w: gridLayoutItem.w || 1,
    h: gridLayoutItem.h || 1,
    ...gridLayoutItem,
  };

  // 设置外部拖拽状态
  externalDragState.value = {
    isActive: true,
    draggedItem: defaultItem,
    sourceType: type,
    targetParentId: null,
    targetIndex: -1,
    showPlaceholder: false,
  };

  // 设置全局拖拽状态，与GridLayout的拖拽逻辑保持一致
  const globalState = getGlobalDragState();
  Object.assign(globalState, {
    draggedId: defaultItem.id,
    draggedData: defaultItem,
    sourceParentId: null, // 外部拖拽没有源容器
    targetParentId: null,
    placeholderIndex: -1,
    showPlaceholder: false,
    sourceType: type,
  });

  console.log("外部拖拽开始:", {
    type,
    item: defaultItem,
  });
};

// 外部拖拽结束函数
const endDrag = () => {
  if (!externalDragState.value.isActive) {
    return;
  }

  let operationCompleted = false;

  // 如果有目标容器，执行添加操作
  if (
    externalDragState.value.targetParentId &&
    externalDragState.value.draggedItem &&
    externalDragState.value.showPlaceholder
  ) {
    const newItem = {
      ...externalDragState.value.draggedItem,
      parentId: externalDragState.value.targetParentId,
    };

    if (props.insertExternalDrag) {
      // 直接插入到v-model数据中
      // 创建新的cellItems数组
      const newCellItems = [...cellItems.value];

      // 计算插入位置
      let insertIndex = newCellItems.length;
      let currentTargetIndex = 0;

      for (let i = 0; i < newCellItems.length; i++) {
        if (newCellItems[i].parentId === externalDragState.value.targetParentId) {
          if (currentTargetIndex === externalDragState.value.targetIndex) {
            insertIndex = i;
            break;
          }
          currentTargetIndex++;
        }
      }

      // 插入新项目
      newCellItems.splice(insertIndex, 0, newItem);

      // 更新数据
      cellItems.value = newCellItems;

      // 检查目标容器是否需要更新sort值
      const targetContainerItems = newCellItems.filter(item => item.parentId === externalDragState.value.targetParentId);
      const needsSortUpdate = targetContainerItems.length > 1 && !targetContainerItems.some(child => child.sort !== undefined);
      
      if (needsSortUpdate) {
        // 为目标容器的所有子项设置sort值
        const updatedCellItems = [...newCellItems];
        targetContainerItems.forEach((child, index) => {
          const globalIndex = updatedCellItems.findIndex(item => item.id === child.id);
          if (globalIndex !== -1) {
            updatedCellItems[globalIndex] = { ...child, sort: index };
          }
        });
        cellItems.value = updatedCellItems;
        
        console.log("外部拖拽后更新目标容器sort值", {
          targetParentId: externalDragState.value.targetParentId,
          children: targetContainerItems.map(child => ({ id: child.id, sort: child.sort })),
        });
      }

      // 添加到历史记录
      const operation = `外部拖拽添加 ${newItem.id} 到 ${externalDragState.value.targetParentId}[${externalDragState.value.targetIndex}]${needsSortUpdate ? ' (更新sort)' : ''}`;
      dragHistory.value.unshift(operation);
      if (dragHistory.value.length > 10) {
        dragHistory.value.pop();
      }

      // 发出child-moved事件
      emit("child-moved", {
        type: "move",
        from: { parentId: "", childId: newItem.id, index: -1 },
        to: {
          parentId: externalDragState.value.targetParentId,
          index: externalDragState.value.targetIndex,
        },
        timestamp: Date.now(),
      });

      console.log("外部拖拽添加完成:", operation);
    } else {
      emit("drag-add", {
        item: newItem,
        parentId: externalDragState.value.targetParentId,
        index: externalDragState.value.targetIndex,
        timestamp: Date.now(),
      });

      // 添加到历史记录
      const operation = `外部拖拽事件 ${newItem.id} 到 ${externalDragState.value.targetParentId}[${externalDragState.value.targetIndex}] (仅触发事件)`;
      dragHistory.value.unshift(operation);
      if (dragHistory.value.length > 10) {
        dragHistory.value.pop();
      }

      console.log("外部拖拽事件触发:", operation);
    }

    operationCompleted = true;
  } else {
    console.log("外部拖拽取消 - 没有有效的目标位置");
  }

  // 强制清理外部拖拽状态（无论是否成功添加）
  externalDragState.value = {
    isActive: false,
    draggedItem: null,
    sourceType: undefined,
    targetParentId: null,
    targetIndex: -1,
    showPlaceholder: false,
  };

  // 强制清理全局拖拽状态
  const globalState = getGlobalDragState();
  Object.assign(globalState, {
    draggedId: null,
    draggedData: null,
    sourceParentId: null,
    targetParentId: null,
    placeholderIndex: -1,
    showPlaceholder: false,
    sourceType: undefined,
  });

  console.log(`外部拖拽结束 - ${operationCompleted ? "操作完成" : "操作取消"}`);
};

// 获取全局拖拽状态的辅助函数
const getGlobalDragState = () => {
  if (!(window as any).__gridDragState) {
    (window as any).__gridDragState = {
      draggedId: null,
      draggedData: null,
      sourceParentId: null,
      targetParentId: null,
      placeholderIndex: -1,
      showPlaceholder: false,
      sourceType: undefined,
    };
  }
  return (window as any).__gridDragState;
};

// 全局松手事件处理器
const handleGlobalMouseUp = (event: MouseEvent) => {
  if (externalDragState.value.isActive) {
    console.log("全局松手，强制结束外部拖拽");

    // 在结束拖拽之前，先通知所有GridLayout组件触发鼠标离开事件
    const gridLayouts = document.querySelectorAll(".grid-item-children");
    gridLayouts.forEach((layout) => {
      // 创建并分发鼠标离开事件
      const mouseLeaveEvent = new MouseEvent("mouseleave", {
        bubbles: true,
        cancelable: true,
        relatedTarget: document.body,
      });
      layout.dispatchEvent(mouseLeaveEvent);
    });

    endDrag();
  }
};

// 在组件挂载时设置全局引用和事件监听器
onMounted(() => {
  const gridContainer = document.querySelector(".grid-container");
  if (gridContainer) {
    (gridContainer as any).__gridComponent = {
      startDrag,
      endDrag,
      externalDragState,
    };
  }

  // 添加全局松手事件监听器
  document.addEventListener("mouseup", handleGlobalMouseUp);
});

// 在组件卸载时清理全局引用和事件监听器
onUnmounted(() => {
  const gridContainer = document.querySelector(".grid-container");
  if (gridContainer) {
    delete (gridContainer as any).__gridComponent;
  }

  // 移除全局松手事件监听器
  document.removeEventListener("mouseup", handleGlobalMouseUp);
});

// 暴露外部拖拽函数
defineExpose({
  startDrag,
  endDrag,
});
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
