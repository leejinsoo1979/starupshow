// ============================================
// Task Hub Types
// ============================================

export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskType = 'PERSONAL' | 'TEAM' | 'AGENT' | 'PROJECT';
export type CreatorType = 'USER' | 'AGENT' | 'SYSTEM' | 'WORKFLOW';
export type TaskSource = 'MANUAL' | 'CONVERSATION' | 'WORKFLOW' | 'API';

// ============================================
// 상태 컬럼 설정
// ============================================
export interface StatusColumn {
  id: TaskStatus;
  name: string;
  color: string;
  icon?: string;
}

export const TASK_STATUS_COLUMNS: StatusColumn[] = [
  { id: 'BACKLOG', name: 'Backlog', color: '#6B7280' },
  { id: 'TODO', name: 'To Do', color: '#3B82F6' },
  { id: 'IN_PROGRESS', name: 'In Progress', color: '#F59E0B' },
  { id: 'IN_REVIEW', name: 'In Review', color: '#8B5CF6' },
  { id: 'DONE', name: 'Done', color: '#10B981' },
  { id: 'CANCELLED', name: 'Cancelled', color: '#EF4444' },
];

// ============================================
// 우선순위 설정
// ============================================
export interface PriorityConfig {
  id: TaskPriority;
  name: string;
  color: string;
  icon: string;
  shortcut: string;
}

export const TASK_PRIORITIES: PriorityConfig[] = [
  { id: 'NONE', name: 'No Priority', color: '#6B7280', icon: '○', shortcut: '0' },
  { id: 'LOW', name: 'Low', color: '#22C55E', icon: '▽', shortcut: '1' },
  { id: 'MEDIUM', name: 'Medium', color: '#F59E0B', icon: '◇', shortcut: '2' },
  { id: 'HIGH', name: 'High', color: '#F97316', icon: '△', shortcut: '3' },
  { id: 'URGENT', name: 'Urgent', color: '#EF4444', icon: '⚡', shortcut: '4' },
];

// ============================================
// 라벨
// ============================================
export interface TaskLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
}

// ============================================
// 체크리스트 아이템
// ============================================
export interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
}

// ============================================
// Task 활동 로그
// ============================================
export interface TaskActivity {
  id: string;
  task_id: string;
  action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'ASSIGNED' | 'COMMENTED';
  actor_id: string;
  actor_type: CreatorType;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  comment?: string;
  created_at: string;
}

// ============================================
// 메인 Task 타입
// ============================================
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;

  // 연결 관계
  company_id?: string;
  project_id?: string;
  parent_task_id?: string;

  // 담당자
  assignee_id?: string;
  assignee_type: CreatorType;

  // 생성자
  created_by: string;
  created_by_type: CreatorType;

  // 시간 관련
  due_date?: string;
  start_date?: string;
  completed_at?: string;
  estimated_hours?: number;
  actual_hours?: number;

  // 분류
  tags: string[];
  labels: TaskLabel[];

  // 순서
  position: number;

  // 메타데이터
  metadata: Record<string, unknown>;
  source: TaskSource;
  source_id?: string;

  // 타임스탬프
  created_at: string;
  updated_at: string;
}

// ============================================
// Task with View 데이터 (JOIN 결과)
// ============================================
export interface TaskWithDetails extends Task {
  // 담당자 정보
  assignee_email?: string;
  assignee_name?: string;
  agent_name?: string;

  // 프로젝트 정보
  project_name?: string;

  // 하위 항목 카운트
  subtask_count: number;
  completed_subtask_count: number;
  checklist_count: number;
  completed_checklist_count: number;

  // 관계 데이터 (옵션)
  subtasks?: Task[];
  checklists?: ChecklistItem[];
  activities?: TaskActivity[];
}

// ============================================
// API Request/Response 타입
// ============================================
export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  company_id?: string;
  project_id?: string;
  parent_task_id?: string;
  assignee_id?: string;
  assignee_type?: CreatorType;
  due_date?: string;
  start_date?: string;
  estimated_hours?: number;
  tags?: string[];
  labels?: TaskLabel[];
  metadata?: Record<string, unknown>;
  source?: TaskSource;
  source_id?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  project_id?: string | null;
  parent_task_id?: string | null;
  assignee_id?: string | null;
  assignee_type?: CreatorType;
  due_date?: string | null;
  start_date?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  tags?: string[];
  labels?: TaskLabel[];
  position?: number;
  metadata?: Record<string, unknown>;
}

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  type?: TaskType;
  assignee_id?: string;
  project_id?: string;
  parent_task_id?: string | null;
  tags?: string[];
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
}

export interface TaskListResponse {
  data: TaskWithDetails[];
  total: number;
  page: number;
  limit: number;
}

// ============================================
// Kanban 관련 타입
// ============================================
export interface KanbanColumn {
  id: TaskStatus;
  name: string;
  color: string;
  tasks: TaskWithDetails[];
}

export interface KanbanData {
  columns: KanbanColumn[];
  taskCount: number;
}

export interface DragEndResult {
  taskId: string;
  sourceStatus: TaskStatus;
  destinationStatus: TaskStatus;
  newPosition: number;
}

// ============================================
// 뷰 타입
// ============================================
export type TaskViewType = 'kanban' | 'list' | 'calendar';

export interface TaskViewState {
  view: TaskViewType;
  filters: TaskFilters;
  sortBy: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'position';
  sortOrder: 'asc' | 'desc';
  selectedTaskId?: string;
  expandedColumns: TaskStatus[];
}

// ============================================
// Quick Add 파싱 결과
// ============================================
export interface ParsedQuickAdd {
  title: string;
  priority?: TaskPriority;
  assignee?: string;
  assignee_type?: CreatorType;
  due_date?: string;
  tags?: string[];
  project?: string;
}

// ============================================
// 키보드 단축키
// ============================================
export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'meta' | 'alt' | 'shift')[];
  action: string;
  description: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'k', modifiers: ['meta'], action: 'openCommandPalette', description: '검색/명령' },
  { key: 'c', modifiers: [], action: 'createTask', description: '새 Task' },
  { key: 'e', modifiers: [], action: 'editTask', description: 'Task 편집' },
  { key: '1', modifiers: [], action: 'setPriorityLow', description: '우선순위: Low' },
  { key: '2', modifiers: [], action: 'setPriorityMedium', description: '우선순위: Medium' },
  { key: '3', modifiers: [], action: 'setPriorityHigh', description: '우선순위: High' },
  { key: '4', modifiers: [], action: 'setPriorityUrgent', description: '우선순위: Urgent' },
  { key: 's', modifiers: [], action: 'changeStatus', description: '상태 변경' },
  { key: 'a', modifiers: [], action: 'assignTask', description: '담당자 할당' },
  { key: 'l', modifiers: [], action: 'addLabel', description: '라벨 추가' },
  { key: 'Escape', modifiers: [], action: 'close', description: '닫기' },
  { key: 'Enter', modifiers: [], action: 'openTask', description: 'Task 열기' },
  { key: 'ArrowUp', modifiers: [], action: 'navigateUp', description: '위로 이동' },
  { key: 'ArrowDown', modifiers: [], action: 'navigateDown', description: '아래로 이동' },
  { key: 'Backspace', modifiers: ['meta'], action: 'deleteTask', description: 'Task 삭제' },
];
