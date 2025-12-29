// ============================================
// GlowUS ERP System TypeScript Types
// ============================================

// ============================================
// 1. 회사/조직 관리
// ============================================

export interface Company {
  id: string
  user_id: string

  name: string
  business_number?: string
  corporate_number?: string
  ceo_name?: string

  phone?: string
  fax?: string
  email?: string
  website?: string

  postal_code?: string
  address?: string
  address_detail?: string

  business_type?: string
  business_category?: string
  establishment_date?: string
  fiscal_year_start: number

  logo_url?: string
  business_registration_url?: string
  settings: Record<string, any>

  created_at: string
  updated_at: string
}

export interface BusinessLocation {
  id: string
  company_id: string

  name: string
  code?: string
  location_type: 'headquarters' | 'branch' | 'factory' | 'warehouse'

  phone?: string
  fax?: string

  postal_code?: string
  address?: string
  address_detail?: string

  is_headquarters: boolean
  is_active: boolean

  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  company_id: string
  parent_id?: string
  location_id?: string

  name: string
  code?: string
  description?: string

  manager_id?: string
  manager?: Employee

  sort_order: number
  is_active: boolean

  children?: Department[]

  created_at: string
  updated_at: string
}

export interface Position {
  id: string
  company_id: string

  name: string
  code?: string
  position_type: 'rank' | 'title'

  level: number
  sort_order: number
  is_active: boolean

  created_at: string
  updated_at: string
}

// ============================================
// 2. 인사관리
// ============================================

export type EmployeeStatus = 'active' | 'on_leave' | 'resigned'
export type HireType = 'regular' | 'contract' | 'part_time' | 'intern'
export type Gender = 'male' | 'female' | 'other'
export type AccountStatus = 'active' | 'suspended' | 'dormant'
export type BirthdayType = 'solar' | 'lunar'

export interface Employee {
  id: string
  company_id: string
  user_id?: string

  // 기본 정보
  employee_number?: string
  name: string
  name_en?: string

  // 로그인/계정 관련
  username?: string
  account_status?: AccountStatus
  language?: string

  // 주민등록번호 (분리 저장)
  resident_number?: string
  resident_number_front?: string
  resident_number_back?: string

  // 생년월일/성별
  birth_date?: string
  birthday_type?: BirthdayType
  gender?: Gender
  anniversary?: string

  // 연락처
  phone?: string
  email?: string
  external_email?: string
  direct_phone?: string
  main_phone?: string
  fax?: string

  // 주소
  postal_code?: string
  address?: string
  address_detail?: string

  // 비상연락처
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string

  // 소속 정보
  department_id?: string
  department?: Department
  position_id?: string
  position?: Position
  rank_id?: string
  rank?: Position
  location_id?: string
  location?: BusinessLocation

  // 직무/위치
  job_title?: string
  location_name?: string

  // 입사 정보
  hire_date?: string
  recognized_hire_date?: string
  hire_type: HireType

  // 퇴사 정보
  resignation_date?: string
  resignation_reason?: string

  status: EmployeeStatus

  // 프로필
  profile_image_url?: string
  homepage?: string
  messenger?: string
  introduction?: string
  notes?: string

  // 급여 계좌
  bank_name?: string
  bank_account?: string
  bank_holder?: string

  created_at: string
  updated_at: string
}

export type AttendanceStatus = 'normal' | 'late' | 'early_leave' | 'absent' | 'holiday' | 'vacation'

export interface Attendance {
  id: string
  company_id: string
  employee_id: string
  employee?: Employee

  work_date: string

  check_in_time?: string
  check_out_time?: string

  work_hours?: number
  overtime_hours: number
  night_hours: number

  status: AttendanceStatus

  check_in_location?: { lat: number; lng: number; address: string }
  check_out_location?: { lat: number; lng: number; address: string }

  notes?: string

  created_at: string
  updated_at: string
}

export interface LeaveType {
  id: string
  company_id: string

  name: string
  code?: string

  is_paid: boolean
  is_annual_leave: boolean
  default_days: number

  color: string

  is_active: boolean

  created_at: string
  updated_at: string
}

export interface LeaveBalance {
  id: string
  company_id: string
  employee_id: string
  employee?: Employee

  year: number

  annual_leave_total: number
  annual_leave_used: number
  annual_leave_remaining: number

  other_leaves: Record<string, { total: number; used: number }>

  created_at: string
  updated_at: string
}

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveRequest {
  id: string
  company_id: string
  employee_id: string
  employee?: Employee
  leave_type_id?: string
  leave_type?: LeaveType

  start_date: string
  end_date: string
  days: number

  reason?: string

  status: LeaveRequestStatus
  approver_id?: string
  approver?: Employee
  approved_at?: string
  rejection_reason?: string

  created_at: string
  updated_at: string
}

export type ContractType = 'regular' | 'contract' | 'part_time'

export interface EmploymentContract {
  id: string
  company_id: string
  employee_id: string
  employee?: Employee

  contract_type: ContractType

  start_date: string
  end_date?: string

  work_hours_per_week: number
  work_days_per_week: number

  base_salary?: number
  salary_type: 'monthly' | 'hourly' | 'daily'

  contract_file_url?: string

  notes?: string

  is_current: boolean

  created_at: string
  updated_at: string
}

export type TrainingResult = 'completed' | 'in_progress' | 'failed'

export interface TrainingRecord {
  id: string
  company_id: string
  employee_id: string
  employee?: Employee

  training_name: string
  training_type?: 'internal' | 'external' | 'online'
  provider?: string

  start_date?: string
  end_date?: string
  hours?: number

  result?: TrainingResult
  certificate_url?: string

  cost: number

  notes?: string

  created_at: string
  updated_at: string
}

// ============================================
// 3. 급여관리
// ============================================

export interface PayrollSettings {
  id: string
  company_id: string

  pay_day: number

  national_pension_rate: number
  health_insurance_rate: number
  long_term_care_rate: number
  employment_insurance_rate: number
  industrial_accident_rate: number

  income_tax_rate: number
  local_income_tax_rate: number

  overtime_rate: number
  night_rate: number
  holiday_rate: number

  settings: Record<string, any>

  created_at: string
  updated_at: string
}

export type PayrollItemType = 'earning' | 'deduction'
export type PayrollItemCategory = 'base' | 'allowance' | 'bonus' | 'tax' | 'insurance' | 'other'
export type CalculationType = 'fixed' | 'rate' | 'formula'

export interface PayrollItem {
  id: string
  company_id: string

  name: string
  code?: string

  item_type: PayrollItemType
  category?: PayrollItemCategory

  is_taxable: boolean
  is_fixed: boolean

  calculation_type: CalculationType
  calculation_value?: number
  calculation_formula?: string

  sort_order: number
  is_active: boolean

  created_at: string
  updated_at: string
}

export interface EmployeePayrollItem {
  id: string
  company_id: string
  employee_id: string
  payroll_item_id: string
  payroll_item?: PayrollItem

  amount?: number

  effective_date: string
  end_date?: string

  notes?: string

  created_at: string
  updated_at: string
}

export type PayrollStatus = 'draft' | 'confirmed' | 'paid'

export interface PayrollRecord {
  id: string
  company_id: string

  year: number
  month: number

  status: PayrollStatus

  total_employees: number
  total_earnings: number
  total_deductions: number
  total_net_pay: number

  confirmed_at?: string
  confirmed_by?: string
  paid_at?: string

  notes?: string

  created_at: string
  updated_at: string
}

export interface PayrollDetailItem {
  item_id: string
  name: string
  amount: number
}

export interface PayrollDetail {
  id: string
  company_id: string
  payroll_record_id: string
  employee_id: string
  employee?: Employee

  year: number
  month: number

  work_days: number
  work_hours: number
  overtime_hours: number
  night_hours: number
  holiday_hours: number

  earnings: PayrollDetailItem[]
  total_earnings: number

  deductions: PayrollDetailItem[]
  total_deductions: number

  national_pension: number
  health_insurance: number
  long_term_care: number
  employment_insurance: number

  income_tax: number
  local_income_tax: number

  net_pay: number

  bank_name?: string
  bank_account?: string
  bank_holder?: string

  is_paid: boolean
  paid_at?: string

  created_at: string
  updated_at: string
}

// ============================================
// 4. 매출입관리
// ============================================

export type PartnerType = 'customer' | 'vendor' | 'both'

export interface BusinessPartner {
  id: string
  company_id: string

  name: string
  partner_type: PartnerType
  business_number?: string
  ceo_name?: string

  phone?: string
  fax?: string
  email?: string

  postal_code?: string
  address?: string
  address_detail?: string

  contact_name?: string
  contact_phone?: string
  contact_email?: string

  payment_terms: number
  credit_limit?: number

  bank_name?: string
  bank_account?: string
  bank_holder?: string

  notes?: string

  is_active: boolean

  created_at: string
  updated_at: string
}

export type ProductType = 'product' | 'service'
export type TaxType = 'taxable' | 'exempt' | 'zero'

export interface Product {
  id: string
  company_id: string

  name: string
  code?: string

  product_type: ProductType
  category?: string

  unit: string

  selling_price: number
  purchase_price: number

  tax_type: TaxType
  tax_rate: number

  description?: string

  is_active: boolean

  created_at: string
  updated_at: string
}

export type TransactionType = 'sales' | 'purchase'
export type TransactionStatus = 'pending' | 'confirmed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'
export type TaxInvoiceStatus = 'none' | 'issued' | 'received'

export interface Transaction {
  id: string
  company_id: string

  transaction_number?: string
  transaction_type: TransactionType

  partner_id?: string
  partner?: BusinessPartner
  partner_name?: string

  transaction_date: string
  due_date?: string

  supply_amount: number
  tax_amount: number
  total_amount: number

  status: TransactionStatus
  payment_status: PaymentStatus
  paid_amount: number

  tax_invoice_number?: string
  tax_invoice_date?: string
  tax_invoice_status?: TaxInvoiceStatus

  description?: string
  notes?: string

  created_by?: string

  items?: TransactionItem[]

  created_at: string
  updated_at: string
}

export interface TransactionItem {
  id: string
  transaction_id: string

  product_id?: string
  product?: Product
  product_name?: string

  quantity: number
  unit: string
  unit_price: number

  supply_amount: number
  tax_amount: number
  total_amount: number

  description?: string

  sort_order: number

  created_at: string
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'check'

export interface Payment {
  id: string
  company_id: string
  transaction_id: string
  transaction?: Transaction

  payment_date: string
  amount: number

  payment_method?: PaymentMethod

  bank_name?: string
  account_number?: string

  notes?: string

  created_by?: string

  created_at: string
}

// ============================================
// 5. 경비관리
// ============================================

export interface ExpenseCategory {
  id: string
  company_id: string

  name: string
  code?: string

  parent_id?: string
  children?: ExpenseCategory[]

  budget_amount?: number

  is_active: boolean

  created_at: string
  updated_at: string
}

export interface CorporateCard {
  id: string
  company_id: string

  card_name: string
  card_number?: string
  card_company?: string

  holder_id?: string
  holder?: Employee

  credit_limit?: number
  billing_day?: number

  is_active: boolean

  created_at: string
  updated_at: string
}

export type ExpensePaymentMethod = 'cash' | 'corporate_card' | 'personal_card'
export type ExpenseStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'reimbursed'
export type ReceiptType = 'tax_invoice' | 'card_receipt' | 'cash_receipt'

export interface ExpenseRequest {
  id: string
  company_id: string
  employee_id: string
  employee?: Employee

  request_number?: string

  expense_date: string
  category_id?: string
  category?: ExpenseCategory

  amount: number

  payment_method?: ExpensePaymentMethod
  corporate_card_id?: string
  corporate_card?: CorporateCard

  merchant_name?: string
  description?: string

  receipt_url?: string
  receipt_type?: ReceiptType

  status: ExpenseStatus
  approver_id?: string
  approver?: Employee
  approved_at?: string
  rejection_reason?: string

  reimbursed_at?: string
  reimbursement_amount?: number

  created_at: string
  updated_at: string
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface ExpenseApproval {
  id: string
  expense_request_id: string

  approver_id: string
  approver?: Employee
  approval_order: number

  status: ApprovalStatus
  approved_at?: string
  comment?: string

  created_at: string
}

// ============================================
// 6. 공통
// ============================================

export type EntityType =
  | 'employee'
  | 'transaction'
  | 'expense'
  | 'contract'
  | 'training'
  | 'payroll'

export interface Attachment {
  id: string
  company_id: string

  entity_type: EntityType
  entity_id: string

  file_name: string
  file_url: string
  file_size?: number
  file_type?: string

  uploaded_by?: string

  created_at: string
}

export type AuditAction = 'create' | 'update' | 'delete' | 'view'

export interface AuditLog {
  id: string
  company_id: string

  user_id?: string
  employee_id?: string

  action: AuditAction
  entity_type: string
  entity_id?: string

  old_values?: Record<string, any>
  new_values?: Record<string, any>

  ip_address?: string
  user_agent?: string

  created_at: string
}

// ============================================
// 7. API Request/Response Types
// ============================================

export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ============================================
// 8. Form Types (Create/Update)
// ============================================

export type CreateCompanyInput = Omit<Company, 'id' | 'created_at' | 'updated_at'>
export type UpdateCompanyInput = Partial<CreateCompanyInput>

export type CreateEmployeeInput = Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'department' | 'position' | 'location'>
export type UpdateEmployeeInput = Partial<CreateEmployeeInput>

export type CreateTransactionInput = Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'partner' | 'items'>
export type UpdateTransactionInput = Partial<CreateTransactionInput>

export type CreateExpenseInput = Omit<ExpenseRequest, 'id' | 'created_at' | 'updated_at' | 'employee' | 'category' | 'corporate_card' | 'approver'>
export type UpdateExpenseInput = Partial<CreateExpenseInput>

// ============================================
// 9. Dashboard/Report Types
// ============================================

export interface DashboardStats {
  total_employees: number
  active_employees: number
  on_leave_employees: number

  monthly_sales: number
  monthly_purchases: number
  monthly_profit: number

  pending_expenses: number
  approved_expenses: number

  pending_leaves: number
}

export interface SalesReport {
  period: string
  sales_amount: number
  purchase_amount: number
  profit: number
  profit_rate: number
}

export interface PayrollSummary {
  year: number
  month: number
  total_employees: number
  total_earnings: number
  total_deductions: number
  total_net_pay: number
  status: PayrollStatus
}

// ============================================
// 10. 전자결재 (Approval Workflow)
// ============================================

export type ApprovalDocumentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled'
export type ApprovalLineStatus = 'pending' | 'approved' | 'rejected' | 'skipped'
export type ApprovalType = 'approval' | 'agreement' | 'reference'
export type ApprovalCategory = 'leave' | 'expense' | 'purchase' | 'general' | 'hr'

export interface ApprovalTemplate {
  id: string
  company_id: string

  name: string
  code?: string
  category: ApprovalCategory
  description?: string

  form_fields: ApprovalFormField[]
  default_approvers: string[]

  is_active: boolean
  sort_order: number

  created_at: string
  updated_at: string
}

export interface ApprovalFormField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file'
  required: boolean
  options?: { value: string; label: string }[]
}

export interface ApprovalDocument {
  id: string
  company_id: string
  template_id?: string
  template?: ApprovalTemplate

  document_number?: string
  title: string
  content?: string

  form_data: Record<string, any>

  drafter_id: string
  drafter?: Employee
  draft_date: string

  status: ApprovalDocumentStatus

  attachments: { name: string; url: string }[]

  is_urgent: boolean

  completed_at?: string

  approval_lines?: ApprovalLine[]
  comments?: ApprovalComment[]

  created_at: string
  updated_at: string
}

export interface ApprovalLine {
  id: string
  document_id: string

  approver_id: string
  approver?: Employee

  step_order: number
  approval_type: ApprovalType

  status: ApprovalLineStatus

  action_date?: string
  comment?: string

  created_at: string
}

export interface ApprovalComment {
  id: string
  document_id: string
  employee_id: string
  employee?: Employee

  content: string

  created_at: string
}

// ============================================
// 11. 근무 일정 (Work Schedule)
// ============================================

export interface WorkSchedule {
  id: string
  company_id: string

  name: string
  description?: string

  start_time: string
  end_time: string
  break_start?: string
  break_end?: string

  work_days: number // 비트마스크

  is_default: boolean
  is_active: boolean

  created_at: string
  updated_at: string
}
