import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  addToCartApi,
  clearCartApi,
  getCartApi,
  removeCartItemApi,
  updateCartItemApi,
} from '../api/cart.js'
import { useAuth } from '../context/AuthContext.jsx'
import { parseApiError } from '../utils/errors.js'

export function useCart() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['cart'],
    queryFn: getCartApi,
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addToCartApi,
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data)
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success('Added to cart', { id: 'cart-added' })
    },
    onError: (err) => {
      const parsed = parseApiError(err)
      if (parsed.status !== 401 && parsed.status !== 403) {
        toast.error(parsed.message, { id: `cart-err-${parsed.message}`, duration: 6000 })
      }
    },
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateCartItemApi,
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data)
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
    onError: (err) => {
      const parsed = parseApiError(err)
      if (parsed.status !== 401 && parsed.status !== 403) {
        toast.error(parsed.message, { id: `cart-err-${parsed.message}`, duration: 6000 })
      }
    },
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeCartItemApi,
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data)
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success('Item removed', { id: 'cart-removed' })
    },
    onError: (err) => {
      const parsed = parseApiError(err)
      if (parsed.status !== 401 && parsed.status !== 403) {
        toast.error(parsed.message, { id: `cart-err-${parsed.message}`, duration: 6000 })
      }
    },
  })
}

export function useClearCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: clearCartApi,
    onSuccess: () => {
      queryClient.setQueryData(['cart'], { items: [], itemCount: 0, subtotal: 0 })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success('Cart cleared', { id: 'cart-cleared' })
    },
    onError: (err) => {
      const parsed = parseApiError(err)
      if (parsed.status !== 401 && parsed.status !== 403) {
        toast.error(parsed.message, { id: `cart-err-${parsed.message}`, duration: 6000 })
      }
    },
  })
}
