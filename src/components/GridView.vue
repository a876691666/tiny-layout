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
import { ref, watch, computed } from "vue";
import GridItemView from "./GridItemView.vue";
import type { GridLayoutData, GridConfig, GridCellData } from "./type";

interface GridViewProps {
  config: GridConfig;
  items: GridLayoutData[];
  cellItems: GridCellData[];
}

const props = defineProps<GridViewProps>();

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
  return props.cellItems.filter((cell) => cell.parentId === parentId);
};

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