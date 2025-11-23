<template>
  <div ref="gridItemRef" class="grid-item" :style="itemStyle">
    <!-- 如果有子项，渲染子项 -->
    <div
      class="grid-item-children"
      :class="{
        'drag-over': isDragOver,
        'drag-allowed': isDragOver && !isCapacityExceeded,
        'capacity-exceeded': isCapacityExceeded,
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
      @dragover="handleDragOver"
      @drop="handleDrop"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @mouseenter="handleExternalMouseEnter"
      @mouseleave="handleExternalMouseLeave"
      @mousemove="handleExternalMouseMove"
      @mouseup="handleExternalMouseUp"
    >
      <div
        v-for="(child, index) in sortedChildren"
        :key="child.id"
        class="grid-child"
        :class="{
          dragging: dragState.draggedId === child.id,
          'drag-placeholder': dragState.placeholderIndex === index,
        }"
        :style="getChildStyle(child)"
        draggable="true"
        @dragstart="handleDragStart($event, child, index)"
        @dragend="handleDragEnd"
        @click="handleChildClick($event, child, index)"
      >
        <slot
          name="cell"
          :item="{ id, x, y, w, h, children, gap, direction, align }"
          :child="child"
        >
          <div class="default-child-content">
            {{ child.id }}
          </div>
        </slot>
      </div>

      <!-- 拖拽占位符 -->
      <div
        v-if="dragState.showPlaceholder && dragState.targetParentId === id"
        class="drag-placeholder-visual"
        :class="{
          'placeholder-horizontal': direction === 'horizontal',
          'placeholder-vertical': direction === 'vertical',
        }"
        :style="getPlaceholderStyle()"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { GridCellData, GridLayoutData } from "./type";

// 拖拽状态接口
interface DragState {
  draggedId: string | null;
  draggedData: GridCellData | null;
  sourceParentId: string | null;
  targetParentId: string | null;
  placeholderIndex: number;
  showPlaceholder: boolean;
  sourceType?: string;
}

interface ExtendedGridLayoutData extends GridLayoutData {
  children?: GridCellData[];
}

interface ExtendedGridLayoutDataWithDebug extends ExtendedGridLayoutData {
  debug?: boolean;
}

const props = withDefaults(defineProps<ExtendedGridLayoutDataWithDebug>(), {
  gap: 0,
  children: () => [],
  direction: "vertical", // 默认纵向排列
  align: "center", // 默认拉伸对齐
  debug: false,
});

// 组件DOM引用
const gridItemRef = ref<HTMLElement | null>(null);

// 向上查找.grid-container元素
const findGridContainer = (): HTMLElement | null => {
  if (!gridItemRef.value) return null;
  
  let element = gridItemRef.value.parentElement;
  while (element) {
    if (element.classList.contains('grid-container')) {
      return element;
    }
    element = element.parentElement;
  }
  return null;
};

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

// 定义事件
const emit = defineEmits<{
  "move-child": [
    from: { parentId: string; childId: string; index: number },
    to: { parentId: string; index: number }
  ];
  "reorder-children": [
    parentId: string,
    fromIndex: number,
    toIndex: number,
    shouldUpdateSort?: boolean
  ];
  "child-click": [child: GridCellData, parentId: string, index: number];
}>();

// 调试工具
type DebugLevel = "info" | "warn" | "error" | "start" | "check" | "state";

const debugLog = (level: DebugLevel, message: string, data?: any) => {
  if (!props.debug) return;

  const prefix = {
    info: "📝",
    warn: "⚠️",
    error: "❌",
    start: "🚀",
    check: "🔍",
    state: "📊",
  }[level];

  const style = {
    info: "color: #2196F3",
    warn: "color: #FF9800",
    error: "color: #F44336",
    start: "color: #4CAF50",
    check: "color: #9C27B0",
    state: "color: #607D8B",
  }[level];

  console.groupCollapsed(`%c${prefix} [${props.id}] ${message}`, style);
  if (data) {
    console.log(data);
  }
  console.groupEnd();
};

// 拖拽悬停状态
const isDragOver = ref(false);

// 容量检测状态
const isCapacityExceeded = ref(false);

// 外部拖拽监听器
const isExternalDragActive = ref(false);

// 本地拖拽状态
const dragState = ref<DragState>({
  draggedId: null,
  draggedData: null,
  sourceParentId: null,
  targetParentId: null,
  placeholderIndex: -1,
  showPlaceholder: false,
  sourceType: undefined,
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

// 获取占位符样式
const getPlaceholderStyle = () => {
  // 优先使用被拖拽子项的样式
  const globalState = getGlobalDragState();
  if (globalState.draggedData) {
    return getChildStyle(globalState.draggedData);
  }

  // 备用方案：使用第一个子项的样式作为占位符的基础样式
  if (props.children.length > 0) {
    const child = props.children[0];
    return getChildStyle(child);
  }

  // 默认占位符样式
  if (props.direction === "horizontal") {
    return {
      width: "100px",
      height: "100%",
      boxSizing: "border-box" as const,
      flex: "none",
    };
  } else {
    return {
      width: "100%",
      height: "50px",
      boxSizing: "border-box" as const,
      flex: "none",
    };
  }
};

// 检查type兼容性
const checkTypeCompatibility = (sourceType?: string): boolean => {
  const targetType = props.type;

  debugLog("check", "Type兼容性检查", {
    sourceType,
    targetType,
    targetId: props.id,
  });

  // 如果两者都有type，必须相同
  if (sourceType && targetType) {
    const isCompatible = sourceType === targetType;
    debugLog("check", `两者都有type: ${sourceType} ${isCompatible ? "==" : "!="} ${targetType}`, {
      result: isCompatible ? "兼容" : "不兼容",
      isCompatible,
    });
    return isCompatible;
  }

  // 如果一个有type一个没有type，不兼容
  if ((sourceType && !targetType) || (!sourceType && targetType)) {
    debugLog("check", "一个有type一个没type", {
      sourceType,
      targetType,
      result: "不兼容",
    });
    return false;
  }

  // 如果两者都没有type，兼容
  debugLog("check", "两者都没有type", {
    result: "兼容",
  });
  return true;
};

// 计算容量是否足够
const checkCapacity = (newChild: GridCellData): boolean => {
  // 检查布局方向兼容性
  if (props.direction === "horizontal" && newChild.w === -1) {
    // 横向布局不允许宽度自适应的子项
    debugLog("warn", "横向布局不允许宽度自适应的子项", {
      newChild,
      direction: props.direction,
    });
    return false;
  }

  if (props.direction === "vertical" && newChild.h === -1) {
    // 纵向布局不允许高度自适应的子项
    debugLog("warn", "纵向布局不允许高度自适应的子项", {
      newChild,
      direction: props.direction,
    });
    return false;
  }

  if (props.direction === "horizontal") {
    // 横向布局：检查宽度容量
    const currentUsedWidth = props.children.reduce((total, child) => {
      // 如果子项宽度为-1，表示自适应，暂时按最小宽度1计算
      const childWidth = child.w === -1 ? 1 : child.w;
      return total + childWidth;
    }, 0);

    const newChildWidth = newChild.w === -1 ? 1 : newChild.w;
    return currentUsedWidth + newChildWidth <= props.w;
  } else {
    // 纵向布局：检查高度容量
    const currentUsedHeight = props.children.reduce((total, child) => {
      // 如果子项高度为-1，表示自适应，暂时按最小高度1计算
      const childHeight = child.h === -1 ? 1 : child.h;
      return total + childHeight;
    }, 0);

    const newChildHeight = newChild.h === -1 ? 1 : newChild.h;
    return currentUsedHeight + newChildHeight <= props.h;
  }
};

// 处理子项单击事件
const handleChildClick = (event: MouseEvent, child: GridCellData, index: number) => {
  // 阻止事件冒泡，避免触发父容器的点击事件
  event.stopPropagation();

  debugLog("info", "子项被点击", {
    childId: child.id,
    parentId: props.id,
    index,
    child,
  });

  // 触发子项点击事件，向上传递
  emit("child-click", child, props.id, index);
};

// 拖拽开始
const handleDragStart = (event: DragEvent, child: GridCellData, index: number) => {
  if (!event.dataTransfer) return;

  const dragStateData = {
    draggedId: child.id,
    draggedData: child,
    sourceParentId: props.id,
    targetParentId: null,
    placeholderIndex: index,
    showPlaceholder: false,
    sourceType: props.type, // 添加源容器type信息到全局状态
  };

  dragState.value = dragStateData;

  // 设置全局拖拽状态
  setGlobalDragState(dragStateData);

  // 设置拖拽数据
  const dragData = {
    childId: child.id,
    childData: child,
    sourceParentId: props.id,
    sourceIndex: index,
    sourceDirection: props.direction,
    sourceType: props.type,
  };

  debugLog("start", "拖拽开始", {
    sourceParentId: props.id,
    sourceType: props.type,
    childId: child.id,
    dragData,
  });

  event.dataTransfer.setData("application/json", JSON.stringify(dragData));

  event.dataTransfer.effectAllowed = "move";

  // 设置拖拽样式
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = "0.5";
  }
};

// 拖拽结束
const handleDragEnd = (event: DragEvent) => {
  // 重置样式
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = "1";
  }

  // 清除本地拖拽状态
  dragState.value = {
    draggedId: null,
    draggedData: null,
    sourceParentId: null,
    targetParentId: null,
    placeholderIndex: -1,
    showPlaceholder: false,
    sourceType: undefined,
  };

  // 清除全局拖拽状态
  setGlobalDragState({
    draggedId: null,
    draggedData: null,
    sourceParentId: null,
    targetParentId: null,
    placeholderIndex: -1,
    showPlaceholder: false,
    sourceType: undefined,
  });

  isDragOver.value = false;
  isCapacityExceeded.value = false;

  debugLog("info", "拖拽结束，清理所有状态", {
    itemId: props.id,
  });
};

// 拖拽进入
const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = true;

  debugLog("state", "拖拽进入容器", {
    itemId: props.id,
    direction: props.direction,
    align: props.align,
  });
};

// 拖拽离开
const handleDragLeave = (event: DragEvent) => {
  // 只有当真正离开容器时才设置为false
  if (!event.currentTarget || !event.relatedTarget) {
    isDragOver.value = false;
    isCapacityExceeded.value = false;
    // 清理当前容器的占位符状态
    if (dragState.value.targetParentId === props.id) {
      dragState.value.showPlaceholder = false;
      dragState.value.targetParentId = null;
      dragState.value.placeholderIndex = -1;
    }
    return;
  }

  const currentTarget = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as HTMLElement;

  if (!currentTarget.contains(relatedTarget)) {
    isDragOver.value = false;
    isCapacityExceeded.value = false;
    // 清理当前容器的占位符状态
    if (dragState.value.targetParentId === props.id) {
      dragState.value.showPlaceholder = false;
      dragState.value.targetParentId = null;
      dragState.value.placeholderIndex = -1;
    }

    debugLog("state", "拖拽离开容器", {
      itemId: props.id,
      clearPlaceholder: true,
    });
  }
};

// 拖拽悬停
const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  if (!event.dataTransfer) return;

  // 使用全局拖拽状态中的数据进行容量检测
  let draggedData: GridCellData | null = null;
  let isFromSameParent = false;

  // 优先使用全局拖拽状态的数据
  const globalState = getGlobalDragState();
  if (globalState.draggedData) {
    draggedData = globalState.draggedData;
    isFromSameParent = globalState.sourceParentId === props.id;
  } else {
    // 备用方案：尝试从dataTransfer获取数据
    try {
      const dropData = JSON.parse(event.dataTransfer.getData("application/json") || "{}");
      draggedData = dropData.childData;
      isFromSameParent = dropData.sourceParentId === props.id;
    } catch (error) {
      // 如果无法解析拖拽数据，允许拖拽（可能是外部元素）
    }
  }

  // 计算应该插入的位置
  const container = event.currentTarget as HTMLElement;
  const children = Array.from(container.children).filter(
    (el) => el.classList.contains("grid-child") && !el.classList.contains("drag-placeholder-visual")
  );

  let insertIndex = children.length;

  // 如果是同一个父容器内的拖拽，允许任意位置插入
  if (isFromSameParent) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      const rect = child.getBoundingClientRect();

      if (props.direction === "horizontal") {
        // 横向布局：根据鼠标X坐标判断插入位置
        if (event.clientX < rect.left + rect.width / 2) {
          insertIndex = i;
          break;
        }
      } else {
        // 纵向布局：根据鼠标Y坐标判断插入位置
        if (event.clientY < rect.top + rect.height / 2) {
          insertIndex = i;
          break;
        }
      }
    }
  } else {
    // 如果是跨容器拖拽，只能插入到最后位置
    insertIndex = children.length;
  }

  // 获取源容器的type信息
  let sourceType: string | undefined = undefined;

  // 优先使用全局拖拽状态中的sourceType
  const globalDragState = getGlobalDragState();
  if (globalDragState.sourceType !== undefined) {
    sourceType = globalDragState.sourceType;
  } else {
    // 备用方案：尝试从dataTransfer获取
    try {
      const dropData = JSON.parse(event.dataTransfer.getData("application/json") || "{}");
      sourceType = dropData.sourceType;
    } catch (error) {
      // 如果无法解析拖拽数据，继续执行
    }
  }

  // 检查是否应该显示占位符
  let shouldShowPlaceholder = false;

  if (draggedData && !isFromSameParent) {
    // 跨组拖拽：检查type兼容性和容量
    const isTypeCompatible = checkTypeCompatibility(sourceType);
    const hasCapacity = isTypeCompatible ? checkCapacity(draggedData) : false;

    isCapacityExceeded.value = !hasCapacity || !isTypeCompatible;

    const reason = !isTypeCompatible
      ? "type不兼容"
      : !hasCapacity
      ? props.direction === "horizontal" && draggedData.w === -1
        ? "横向布局不允许宽度自适应"
        : props.direction === "vertical" && draggedData.h === -1
        ? "纵向布局不允许高度自适应"
        : "容量不足"
      : "通过检测";

    debugLog("check", "拖拽兼容性检测", {
      targetId: props.id,
      targetType: props.type,
      sourceType,
      targetDirection: props.direction,
      draggedData,
      isTypeCompatible,
      hasCapacity,
      isCapacityExceeded: isCapacityExceeded.value,
      reason,
    });

    if (!isTypeCompatible || !hasCapacity) {
      event.dataTransfer.dropEffect = "none";
      shouldShowPlaceholder = false;
    } else {
      event.dataTransfer.dropEffect = "move";
      shouldShowPlaceholder = true;
    }
  } else if (draggedData && isFromSameParent) {
    // 同组拖拽：不显示占位符，仅用于重排序
    isCapacityExceeded.value = false;
    event.dataTransfer.dropEffect = "move";
    shouldShowPlaceholder = false;
  } else {
    // 无拖拽数据：不显示占位符
    isCapacityExceeded.value = false;
    event.dataTransfer.dropEffect = "move";
    shouldShowPlaceholder = false;
  }

  // 设置拖拽状态
  dragState.value.targetParentId = props.id;
  dragState.value.placeholderIndex = insertIndex;
  dragState.value.showPlaceholder = shouldShowPlaceholder;

  debugLog("state", "拖拽状态", {
    targetParentId: dragState.value.targetParentId,
    placeholderIndex: dragState.value.placeholderIndex,
    showPlaceholder: dragState.value.showPlaceholder,
    isFromSameParent,
    insertPosition: isFromSameParent ? "任意位置" : "最后位置",
    placeholderType: isFromSameParent ? "同组拖拽(无占位符)" : "跨组拖拽(有占位符)",
    itemId: props.id,
  });
};

// 处理放置
const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;
  isCapacityExceeded.value = false;

  if (!event.dataTransfer) return;

  try {
    const dropData = JSON.parse(event.dataTransfer.getData("application/json"));
    const { childId, childData, sourceParentId, sourceIndex, sourceType } = dropData;

    // 如果是跨容器移动，检查type兼容性和容量
    if (sourceParentId !== props.id) {
      // 检查type兼容性
      if (!checkTypeCompatibility(sourceType)) {
        debugLog("warn", "type不兼容，无法放置到此容器", {
          sourceType,
          targetType: props.type,
        });
        return;
      }

      // 检查容量
      if (!checkCapacity(childData)) {
        debugLog("warn", "容量不足，无法放置到此容器");
        return;
      }
    }

    if (sourceParentId === props.id) {
      // 同一个容器内的重排序
      const targetIndex = dragState.value.placeholderIndex;

      // 需要将排序后的索引转换为原始数组的索引
      const originalFromIndex = props.children.findIndex((child) => child.id === childId);

      // 计算目标位置在原始数组中的索引
      let originalToIndex = targetIndex;
      if (targetIndex < sortedChildren.value.length) {
        const targetChild = sortedChildren.value[targetIndex];
        originalToIndex = props.children.findIndex((child) => child.id === targetChild.id);
      } else {
        originalToIndex = props.children.length;
      }

      if (originalFromIndex !== originalToIndex && originalFromIndex !== -1) {
        // 检查是否需要更新sort值（如果当前没有sort或者拖拽会改变顺序）
        const shouldUpdateSort =
          !props.children.some((child) => child.sort !== undefined) ||
          targetIndex !== sortedChildren.value.findIndex((child) => child.id === childId);

        emit("reorder-children", props.id, originalFromIndex, originalToIndex, shouldUpdateSort);
      }
    } else {
      // 跨容器移动，固定插入到最后位置
      const targetIndex = props.children.length;
      emit(
        "move-child",
        { parentId: sourceParentId, childId, index: sourceIndex },
        { parentId: props.id, index: targetIndex }
      );
    }
  } catch (error) {
    debugLog("error", "拖拽数据解析错误", error);
  }

  // 清除拖拽状态
  dragState.value.showPlaceholder = false;
  dragState.value.targetParentId = null;
  dragState.value.placeholderIndex = -1;
};

// 获取全局拖拽状态（包括外部拖拽）
const getGlobalDragState = (): DragState => {
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

const setGlobalDragState = (state: Partial<DragState>) => {
  const globalState = getGlobalDragState();
  Object.assign(globalState, state);
};

// 外部拖拽鼠标进入处理
const handleExternalMouseEnter = (_event: MouseEvent) => {
  const globalState = getGlobalDragState();

  // 只有在外部拖拽激活时才处理
  if (!globalState.draggedData || globalState.sourceParentId !== null) {
    return;
  }

  isDragOver.value = true;
  isExternalDragActive.value = true;

  debugLog("state", "外部拖拽进入容器", {
    itemId: props.id,
    direction: props.direction,
    align: props.align,
  });
};

// 外部拖拽鼠标离开处理
const handleExternalMouseLeave = (event: MouseEvent) => {
  if (!isExternalDragActive.value) return;

  const currentTarget = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as HTMLElement;

  if (!currentTarget?.contains?.(relatedTarget)) {
    isDragOver.value = false;
    isCapacityExceeded.value = false;
    isExternalDragActive.value = false;

    // 清理当前容器的占位符状态
    if (dragState.value.targetParentId === props.id) {
      dragState.value.showPlaceholder = false;
      dragState.value.targetParentId = null;
      dragState.value.placeholderIndex = -1;
    }

    debugLog("state", "外部拖拽离开容器", {
      itemId: props.id,
      clearPlaceholder: true,
    });
  }
};

// 外部拖拽鼠标移动处理
const handleExternalMouseMove = (event: MouseEvent) => {
  const globalState = getGlobalDragState();

  // 只有在外部拖拽激活时才处理
  if (
    !globalState.draggedData ||
    globalState.sourceParentId !== null ||
    !isExternalDragActive.value
  ) {
    return;
  }

  const draggedData = globalState.draggedData;
  const sourceType = globalState.sourceType;

  // 计算应该插入的位置
  const container = event.currentTarget as HTMLElement;
  const children = Array.from(container.children).filter(
    (el) => el.classList.contains("grid-child") && !el.classList.contains("drag-placeholder-visual")
  );

  // 外部拖拽只能插入到最后位置
  let insertIndex = children.length;

  // 检查type兼容性和容量
  const isTypeCompatible = checkTypeCompatibility(sourceType);
  const hasCapacity = isTypeCompatible ? checkCapacity(draggedData) : false;

  isCapacityExceeded.value = !hasCapacity || !isTypeCompatible;

  const shouldShowPlaceholder = isTypeCompatible && hasCapacity;

  // 设置拖拽状态
  dragState.value.targetParentId = props.id;
  dragState.value.placeholderIndex = insertIndex;
  dragState.value.showPlaceholder = shouldShowPlaceholder;

  debugLog("state", "外部拖拽状态更新", {
    targetParentId: dragState.value.targetParentId,
    placeholderIndex: dragState.value.placeholderIndex,
    showPlaceholder: dragState.value.showPlaceholder,
    isTypeCompatible,
    hasCapacity,
    insertPosition: "最后位置",
    itemId: props.id,
  });
};

// 外部拖拽松手处理（模拟drop）
const handleExternalMouseUp = (_event: MouseEvent) => {
  const globalState = getGlobalDragState();

  // 只有在外部拖拽激活且显示占位符时才处理
  if (
    !globalState.draggedData ||
    globalState.sourceParentId !== null ||
    !isExternalDragActive.value ||
    !dragState.value.showPlaceholder
  ) {
    // 即使不满足拖拽条件，也要触发鼠标离开事件清理悬停状态
    if (isExternalDragActive.value) {
      forceMouseLeave();
    }
    return;
  }

  // 触发Grid组件的endDrag函数
  const gridContainer = findGridContainer();
  if (gridContainer && (gridContainer as any).__gridComponent) {
    const gridComponent = (gridContainer as any).__gridComponent;
    if (gridComponent.endDrag) {
      // 更新外部拖拽状态中的目标信息
      const externalDragState = gridComponent.externalDragState;
      if (externalDragState) {
        externalDragState.value.targetParentId = props.id;
        externalDragState.value.targetIndex = dragState.value.placeholderIndex;
        externalDragState.value.showPlaceholder = true;
      }

      gridComponent.endDrag();
    }
  }

  // 触发鼠标离开事件，然后清理本地状态
  forceMouseLeave();
  cleanupLocalDragState();

  debugLog("info", "外部拖拽完成", {
    itemId: props.id,
  });
};

// 清理本地拖拽状态的辅助函数
const cleanupLocalDragState = () => {
  isDragOver.value = false;
  isCapacityExceeded.value = false;
  isExternalDragActive.value = false;
  dragState.value.showPlaceholder = false;
  dragState.value.targetParentId = null;
  dragState.value.placeholderIndex = -1;
};

// 强制触发鼠标离开事件（用于松手时清理状态）
const forceMouseLeave = () => {
  if (isExternalDragActive.value) {
    debugLog("info", "强制触发鼠标离开事件", {
      itemId: props.id,
    });

    // 模拟鼠标离开事件
    const mockEvent = new MouseEvent("mouseleave", {
      bubbles: true,
      cancelable: true,
      relatedTarget: document.body, // 设置relatedTarget为body，确保离开逻辑生效
    });

    handleExternalMouseLeave(mockEvent);
  }
};

// 监听全局拖拽状态变化，当外部拖拽结束时清理本地状态
watch(
  () => {
    const globalState = getGlobalDragState();
    return globalState.draggedData;
  },
  (newValue, oldValue) => {
    // 当全局拖拽数据从有值变为null时，说明拖拽结束了
    if (oldValue && !newValue && isExternalDragActive.value) {
      debugLog("info", "检测到全局拖拽结束，强制触发鼠标离开", {
        itemId: props.id,
      });

      // 先触发鼠标离开事件，再清理本地状态
      forceMouseLeave();
      cleanupLocalDragState();
    }
  }
);
</script>

<style scoped>
.grid-item {
  box-sizing: border-box;
  position: relative;
}

.grid-item.drag-over {
  border-color: #4caf50;
  background-color: rgba(76, 175, 80, 0.1);
}

.grid-item-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #007acc;
  box-sizing: border-box;
}

.grid-item-children {
  width: 100%;
  height: 100%;
  display: flex;
  box-sizing: border-box;
  position: relative;
  transition: background-color 0.2s ease;
}

/* 布局方向样式 */
.grid-item-children.layout-horizontal {
  flex-direction: row;
  align-items: stretch;
  flex-wrap: nowrap;
}

.grid-item-children.layout-vertical {
  flex-direction: column;
  align-items: stretch;
  flex-wrap: nowrap;
}

/* align 对齐方式样式 */
/* 横向布局时的水平对齐（主轴对齐） */
.grid-item-children.layout-horizontal.align-start {
  justify-content: flex-start;
}

.grid-item-children.layout-horizontal.align-center {
  justify-content: center;
}

.grid-item-children.layout-horizontal.align-end {
  justify-content: flex-end;
}

.grid-item-children.layout-horizontal.align-stretch {
  justify-content: space-between;
}

/* 纵向布局时的垂直对齐（主轴对齐） */
.grid-item-children.layout-vertical.align-start {
  justify-content: flex-start;
}

.grid-item-children.layout-vertical.align-center {
  justify-content: center;
}

.grid-item-children.layout-vertical.align-end {
  justify-content: flex-end;
}

.grid-item-children.layout-vertical.align-stretch {
  justify-content: space-between;
}

.grid-item-children.drag-over {
  background-color: rgba(107, 255, 107, 0.05);
}

.grid-item-children.drag-allowed {
  background-color: rgba(76, 175, 80, 0.1);
  border: 2px dashed #4caf50;
}

.grid-item-children.capacity-exceeded {
  background-color: rgba(255, 0, 0, 0.1);
  border: 2px dashed #ff0000;
  cursor: not-allowed;
}

.grid-child {
  box-sizing: border-box;
  cursor: grab;
  transition: all 0.2s ease;
  user-select: none;
  min-width: 0; /* 防止flex子项溢出 */
  min-height: 0; /* 防止flex子项溢出 */
}

.grid-child:hover {
  border-color: #007acc;
  box-shadow: 0 2px 4px rgba(0, 122, 204, 0.2);
}

.grid-child:active {
  cursor: grabbing;
}

.grid-child.dragging {
  opacity: 0.5;
  transform: rotate(2deg);
  z-index: 1000;
}

.grid-child.drag-placeholder {
  border: 2px dashed #4caf50;
  background-color: rgba(76, 175, 80, 0.1);
}

.drag-placeholder-visual {
  border: 2px dashed #4caf50;
  background-color: rgba(76, 175, 80, 0.1);
  border-radius: 2px;
  box-sizing: border-box;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drag-placeholder-visual.placeholder-horizontal {
  min-width: 60px;
  width: auto;
}

.drag-placeholder-visual.placeholder-vertical {
  min-height: 40px;
  height: auto;
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
  pointer-events: none; /* 防止干扰拖拽 */
}

/* 拖拽动画 */
@keyframes dragEnter {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

.grid-item-children.drag-over {
  animation: dragEnter 0.3s ease-in-out;
}
</style>
