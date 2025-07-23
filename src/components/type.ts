// 扁平化的网格单元项数据接口
export interface GridCellData {
  parentId: string;
  id: string;
  w: number | -1; // -1 代表占满
  h: number | -1; // -1 代表占满
  sort?: number;

  [key: string]: any;
}

// 网格项数据接口
export interface GridLayoutData {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  name?: string;
  type?: string;
  gap?: number;
  direction?: "horizontal" | "vertical";
  align?: "start" | "center" | "end" | "stretch";
  padding?: number;
  border?: number;
  borderRadius?: number;
  max?: number;
  visible?: boolean;
  disabled?: boolean;
  isDragging?: boolean;

  [key: string]: any | undefined;
}

export interface ExtendedGridLayoutData extends GridLayoutData {
  children?: GridCellData[];
  style?: Record<string, any>;
}

// 网格配置接口
export interface GridConfig {
  rows: number;
  cols: number;
  gap?: number;
}
