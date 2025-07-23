<template>
  <div class="grid-item-view" :style="{ ...itemStyle, ...($props.style || {}) }">
    <!-- 如果有子项，渲染子项 -->
    <div
      class="grid-item-children-view"
      :class="{
        'layout-horizontal': direction === 'horizontal',
        'layout-vertical': direction === 'vertical',
        'align-start': align === 'start',
        'align-center': align === 'center',
        'align-end': align === 'end',
        'align-stretch': align === 'stretch',
      }"
      :style="{
        gap: gap + 'px',
      }"
    >
      <div
        v-for="(child, index) in sortedChildren"
        :key="child.id"
        class="grid-child-view"
        :style="getChildStyle(child)"
      >
        <slot
          name="cell"
          :item="{ id, x, y, w, h, children, gap, direction, align }"
          :child="child"
        >
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { GridCellData, ExtendedGridLayoutData } from "./type";

const props = withDefaults(defineProps<ExtendedGridLayoutData>(), {
  gap: 0,
  children: () => [],
  direction: "vertical", // 默认纵向排列
  align: "center", // 默认居中对齐
  style: () => ({}),
});

// 计算排序后的子项
const sortedChildren = computed(() => {
  const childrenArray = [...props.children];

  // 检查是否有任何子项有sort字段
  const hasSortField = childrenArray.some((child) => child.sort !== undefined);

  if (hasSortField) {
    // 如果有sort字段，按sort排序，没有sort的项目放在最后
    return childrenArray.sort((a, b) => {
      const sortA = a.sort ?? Number.MAX_SAFE_INTEGER;
      const sortB = b.sort ?? Number.MAX_SAFE_INTEGER;
      return sortA - sortB;
    });
  } else {
    // 如果没有sort字段，保持原始数组顺序
    return childrenArray;
  }
});

const itemStyle = ref({
  gridColumnStart: 1,
  gridColumnEnd: 2,
  gridRowStart: 1,
  gridRowEnd: 2,
});

// 监听props变化更新itemStyle
watch(
  () => [props.x, props.y, props.w, props.h, props.gap],
  () => {
    itemStyle.value = {
      gridColumnStart: props.x + 1,
      gridColumnEnd: props.x + props.w + 1,
      gridRowStart: props.y + 1,
      gridRowEnd: props.y + props.h + 1,
    };
  },
  { immediate: true }
);

// 计算子项样式
const getChildStyle = (child: GridCellData) => {
  const baseStyle: any = {
    boxSizing: "border-box" as const,
  };

  if (props.direction === "horizontal") {
    // 横向布局
    const childWidth = child.w === -1 ? "auto" : `${(child.w / props.w) * 100}%`;
    const childHeight = child.h === -1 ? "100%" : `${(child.h / props.h) * 100}%`;

    return {
      ...baseStyle,
      width: childWidth,
      height: childHeight,
      flex: child.w === -1 ? "1" : "none",
    };
  } else {
    // 纵向布局（默认）
    const childWidth = child.w === -1 ? "100%" : `${(child.w / props.w) * 100}%`;
    const childHeight = child.h === -1 ? "auto" : `${(child.h / props.h) * 100}%`;

    return {
      ...baseStyle,
      width: childWidth,
      height: childHeight,
      flex: child.h === -1 ? "1" : "none",
    };
  }
};
</script>

<style scoped>
.grid-item-view {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.grid-item-children-view {
  width: 100%;
  height: 100%;
  display: flex;
  box-sizing: border-box;
}

/* 布局方向样式 */
.grid-item-children-view.layout-horizontal {
  flex-direction: row;
  align-items: stretch;
  flex-wrap: nowrap;
}

.grid-item-children-view.layout-vertical {
  flex-direction: column;
  align-items: stretch;
  flex-wrap: nowrap;
}

/* align 对齐方式样式 */
/* 横向布局时的水平对齐（主轴对齐） */
.grid-item-children-view.layout-horizontal.align-start {
  justify-content: flex-start;
}

.grid-item-children-view.layout-horizontal.align-center {
  justify-content: center;
}

.grid-item-children-view.layout-horizontal.align-end {
  justify-content: flex-end;
}

.grid-item-children-view.layout-horizontal.align-stretch {
  justify-content: space-between;
}

/* 纵向布局时的垂直对齐（主轴对齐） */
.grid-item-children-view.layout-vertical.align-start {
  justify-content: flex-start;
}

.grid-item-children-view.layout-vertical.align-center {
  justify-content: center;
}

.grid-item-children-view.layout-vertical.align-end {
  justify-content: flex-end;
}

.grid-item-children-view.layout-vertical.align-stretch {
  justify-content: space-between;
}

.grid-child-view {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 0; /* 防止flex子项溢出 */
  min-height: 0; /* 防止flex子项溢出 */
}
</style>
