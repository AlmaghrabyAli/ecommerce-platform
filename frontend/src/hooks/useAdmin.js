import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  createAdminCategoryApi,
  createAdminProductApi,
  deactivateAdminProductApi,
  deleteAdminCategoryApi,
  getAdminOrderByIdApi,
  getAdminOrdersApi,
  getAdminProductByIdApi,
  getAdminProductsApi,
  getAdminStatsApi,
  updateAdminCategoryApi,
  updateAdminOrderStatusApi,
  updateAdminProductApi,
} from '../api/admin.js'
import { parseApiError } from '../utils/errors.js'

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStatsApi,
  })
}

export function useAdminProducts(params = {}) {
  return useQuery({
    queryKey: ['admin', 'products', params],
    queryFn: () => getAdminProductsApi(params),
    placeholderData: keepPreviousData,
  })
}

export function useAdminProductById(id) {
  return useQuery({
    queryKey: ['admin', 'product', String(id)],
    queryFn: () => getAdminProductByIdApi(id),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
  })
}

export function useCreateAdminProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAdminProductApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product saved', { id: 'product-saved' })
    },
  })
}

export function useUpdateAdminProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAdminProductApi,
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(['admin', 'product', String(variables.id)], updated)
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', updated.slug] })
      toast.success('Product saved', { id: 'product-saved' })
    },
  })
}

export function useDeactivateAdminProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deactivateAdminProductApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product deactivated', { id: 'product-deactivated' })
    },
    onError: (err) => {
      const parsed = parseApiError(err)
      if (parsed.status !== 401 && parsed.status !== 403) {
        toast.error(parsed.message, { id: `admin-prod-err-${parsed.message}`, duration: 6000 })
      }
    },
  })
}

export function useCreateAdminCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAdminCategoryApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category saved', { id: 'category-saved' })
    },
  })
}

export function useUpdateAdminCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAdminCategoryApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      toast.success('Category saved', { id: 'category-saved' })
    },
  })
}

export function useDeleteAdminCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAdminCategoryApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category deleted', { id: 'category-deleted' })
    },
  })
}

export function useAdminOrders(params = {}) {
  return useQuery({
    queryKey: ['admin', 'orders', params],
    queryFn: () => getAdminOrdersApi(params),
    placeholderData: keepPreviousData,
  })
}

export function useAdminOrderById(id) {
  return useQuery({
    queryKey: ['admin', 'order', String(id)],
    queryFn: () => getAdminOrderByIdApi(id),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
  })
}

export function useUpdateAdminOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAdminOrderStatusApi,
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(['admin', 'order', String(variables.id)], updated)
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', String(variables.id)] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', String(variables.id)] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Order status updated', { id: 'order-status-updated' })
    },
    onError: (err, variables) => {
      const parsed = parseApiError(err)
      if (parsed.status !== 401 && parsed.status !== 403) {
        toast.error(parsed.message, { id: `order-status-err-${parsed.message}`, duration: 6000 })
        if (variables?.id) {
          queryClient.invalidateQueries({ queryKey: ['admin', 'order', String(variables.id)] })
        }
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      }
    },
  })
}
