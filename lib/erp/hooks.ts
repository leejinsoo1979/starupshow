'use client'

import { useState, useEffect, useCallback } from 'react'

interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface PaginatedData<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

// Generic hook for fetching paginated data
export function usePaginatedData<T>(
  endpoint: string,
  initialParams: Record<string, string> = {}
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [params, setParams] = useState(initialParams)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...params,
      })

      const response = await fetch(`${endpoint}?${queryParams}`)
      const result: ApiResponse<PaginatedData<T>> = await response.json()

      if (!result.success) {
        throw new Error(result.error || '데이터를 불러올 수 없습니다.')
      }

      if (result.data) {
        setData(result.data.data)
        setPagination(prev => ({
          ...prev,
          total: result.data!.total,
          totalPages: result.data!.total_pages,
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [endpoint, pagination.page, pagination.limit, params])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const setPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const setLimit = (limit: number) => {
    setPagination(prev => ({ ...prev, page: 1, limit }))
  }

  const updateParams = (newParams: Record<string, string>) => {
    setParams(prev => ({ ...prev, ...newParams }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const refresh = () => {
    fetchData()
  }

  return {
    data,
    loading,
    error,
    pagination,
    setPage,
    setLimit,
    updateParams,
    refresh,
  }
}

// Generic hook for fetching single item
export function useData<T>(endpoint: string, id?: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id && endpoint.includes('[id]')) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const url = id ? `${endpoint}/${id}` : endpoint
      const response = await fetch(url)
      const result: ApiResponse<T> = await response.json()

      if (!result.success) {
        throw new Error(result.error || '데이터를 불러올 수 없습니다.')
      }

      setData(result.data || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [endpoint, id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refresh = () => {
    fetchData()
  }

  return { data, loading, error, refresh }
}

// Hook for list data without pagination
export function useListData<T>(endpoint: string, params: Record<string, string> = {}) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams(params)
      const url = Object.keys(params).length > 0 ? `${endpoint}?${queryParams}` : endpoint
      const response = await fetch(url)
      const result: ApiResponse<T[]> = await response.json()

      if (!result.success) {
        throw new Error(result.error || '데이터를 불러올 수 없습니다.')
      }

      setData(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [endpoint, JSON.stringify(params)])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refresh: fetchData }
}

// Hook for mutations (create, update, delete)
export function useMutation<TInput, TOutput = any>(endpoint: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (
    method: 'POST' | 'PUT' | 'DELETE',
    data?: TInput,
    id?: string
  ): Promise<TOutput | null> => {
    setLoading(true)
    setError(null)

    try {
      const url = id ? `${endpoint}/${id}` : endpoint
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      })

      const result: ApiResponse<TOutput> = await response.json()

      if (!result.success) {
        throw new Error(result.error || '요청을 처리할 수 없습니다.')
      }

      return result.data || null
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '오류가 발생했습니다.'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const create = (data: TInput) => mutate('POST', data)
  const update = (id: string, data: TInput) => mutate('PUT', data, id)
  const remove = (id: string) => mutate('DELETE', undefined, id)

  return { loading, error, create, update, remove, mutate }
}

// Specific hooks for ERP modules
export function useDashboard() {
  return useData<any>('/api/erp/dashboard')
}

export function useCompany() {
  return useData<any>('/api/erp/company')
}

export function useEmployees(params?: Record<string, string>) {
  return usePaginatedData<any>('/api/erp/employees', params)
}

export function useEmployee(id: string) {
  return useData<any>('/api/erp/employees', id)
}

export function useDepartments(flat = false) {
  return useListData<any>('/api/erp/departments', flat ? { flat: 'true' } : {})
}

export function usePositions(type?: 'rank' | 'title') {
  return useListData<any>('/api/erp/positions', type ? { type } : {})
}

export function useAttendance(params?: Record<string, string>) {
  return usePaginatedData<any>('/api/erp/attendance', params)
}

export function useLeaveRequests(params?: Record<string, string>) {
  return usePaginatedData<any>('/api/erp/leaves', params)
}

export function useLeaveTypes() {
  return useListData<any>('/api/erp/leave-types')
}

export function usePayrollRecords(params?: Record<string, string>) {
  return usePaginatedData<any>('/api/erp/payroll', params)
}

export function usePayrollRecord(id: string) {
  return useData<any>('/api/erp/payroll', id)
}

export function usePayrollSettings() {
  return useData<any>('/api/erp/payroll-settings')
}

export function useTransactions(params?: Record<string, string>) {
  return usePaginatedData<any>('/api/erp/transactions', params)
}

export function useTransaction(id: string) {
  return useData<any>('/api/erp/transactions', id)
}

export function usePartners(params?: Record<string, string>) {
  return usePaginatedData<any>('/api/erp/partners', params)
}

export function usePartner(id: string) {
  return useData<any>('/api/erp/partners', id)
}

export function useProducts(params?: Record<string, string>) {
  return usePaginatedData<any>('/api/erp/products', params)
}

export function useExpenses(params?: Record<string, string>) {
  return usePaginatedData<any>('/api/erp/expenses', params)
}

export function useExpenseCategories(flat = false) {
  return useListData<any>('/api/erp/expense-categories', flat ? { flat: 'true' } : {})
}

export function useCorporateCards() {
  return useListData<any>('/api/erp/corporate-cards')
}

export function useLocations() {
  return useListData<any>('/api/erp/locations')
}
