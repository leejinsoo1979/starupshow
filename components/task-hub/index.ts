// Main Page
export { TaskHubPage } from './TaskHubPage'

// Board Components
export { KanbanBoard, KanbanColumn, KanbanCard } from './board'

// Views
export { ListView } from './views/ListView'

// Modals
export { TaskModal } from './modals/TaskModal'

// Agent Components (Phase 2)
export { AgentTaskPanel, AgentSelector } from './AgentTaskPanel'
export { AgentTaskProgress, MiniTaskProgress } from './AgentTaskProgress'

// Hooks
export { useTaskHub } from './hooks/useTaskHub'
export {
  useAgentTaskRealtime,
  useTaskActivityRealtime,
  getProgressColor,
  getProgressLabel,
} from './hooks/useAgentTaskRealtime'
export {
  useTaskNotifications,
  useTaskHubNotifications,
  createAgentInfoFromTask,
} from './hooks/useTaskNotifications'
