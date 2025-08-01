<template>
  <div class="grid-view-container">
    <div class="grid-view" :style="gridStyle">
      <!-- 网格项 -->
      <GridItemView
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
        :style="item.style || {}"
      >
        <!-- 传递cell slot给GridItemView -->
        <template #cell="{ item, child }">
          <slot name="cell" :item="item" :child="child">
            <div class="default-child-content">
              {{ child.id }}
            </div>
          </slot>
        </template>
      </GridItemView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, shallowRef, triggerRef } from "vue";
import GridItemView from "./GridItemView.vue";
import type { ExtendedGridLayoutData, GridConfig, GridCellData } from "./type";

interface GridViewProps {
  config: GridConfig;
  items: ExtendedGridLayoutData[];
}

const props = defineProps<GridViewProps>();

// 使用 defineModel 支持 v-model
const cellItems = defineModel<GridCellData[]>("cellItems", { default: () => [] });

// 使用 shallowRef 缓存子项映射
const childrenMapRef = shallowRef<Map<string, GridCellData[]>>(new Map());

// 根据 parentId 获取子项的函数
const getChildrenForItem = (parentId: string): GridCellData[] => {
  return childrenMapRef.value.get(parentId) || [];
};

// 更新子项映射的函数
const updateChildrenMap = () => {
  const newMap = new Map<string, GridCellData[]>();
  
  // 按 parentId 分组
  cellItems.value.forEach((cell) => {
    const parentId = cell.parentId;
    if (!newMap.has(parentId)) {
      newMap.set(parentId, []);
    }
    newMap.get(parentId)!.push(cell);
  });
  
  // 对每个组内的子项按 sort 排序（如果有 sort 字段）
  newMap.forEach((children) => {
    children.sort((a, b) => {
      if (a.sort !== undefined && b.sort !== undefined) {
        return a.sort - b.sort;
      }
      return 0;
    });
  });
  
  childrenMapRef.value = newMap;
  triggerRef(childrenMapRef);
};

// 监听 cellItems 变化，主动更新子项映射
watch(cellItems, updateChildrenMap, { immediate: true, deep: true });

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

// 样式
const gridStyle = computed(() => ({
  position: "relative" as const,
  width: "100%",
  height: "100%",
  display: "grid",
  gridTemplateColumns: `repeat(${cols.value}, 1fr)`,
  gridTemplateRows: `repeat(${rows.value}, 1fr)`,
  gap: `${gap.value}px`,
}));
</script>

<style scoped>
.grid-view-container {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.grid-view {
  width: 100%;
  height: 100%;
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
