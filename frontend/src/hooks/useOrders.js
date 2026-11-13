import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cancelOrderApi, getOrderByIdApi, getOrdersApi, placeOrderApi } from '../api/orders.js'
import { parseApiError } from '../utils/errors.js'

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: getOrdersApi,
  })
}

export function useOrderById(id) {
  return useQuery({
    queryKey: ['order', String(id)],
    queryFn: () => getOrderByIdApi(id),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
  })
}

export function usePlaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: placeOrderApi,
    onSuccess: () => {
      queryClient.setQueryData(['cart'], { items: [], itemCount: 0, subtotal: 0 })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('Order placed', { id: 'order-placed' })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelOrderApi,
    onSuccess: (order, id) => {
      queryClient.setQueryData(['order', String(id)], order)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', String(id)] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('Order cancelled', { id: 'order-cancelled' })
    },
    onError: (err, id) => {
      const parsed = parseApiError(err)
      if (parsed.status !== 401 && parsed.status !== 403) {
        toast.error(parsed.message, { id: `order-err-${parsed.message}`, duration: 6000 })
        queryClient.invalidateQueries({ queryKey: ['order', String(id)] })
        queryClient.invalidateQueries({ queryKey: ['orders'] })
      }
    },
  })
}
