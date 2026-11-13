import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getProductBySlugApi, getProductsApi } from '../api/catalog.js'

export function useProducts(params = {}, options = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => getProductsApi(params),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useProductBySlug(slug) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProductBySlugApi(slug),
    enabled: Boolean(slug),
  })
}

export function useRelatedProducts(categoryId, currentProductId) {
  return useQuery({
    queryKey: ['products', { categoryId, pageSize: 5, relatedTo: currentProductId }],
    queryFn: async () => {
      const res = await getProductsApi({ categoryId, pageSize: 5 })
      return (res.items || [])
        .filter((item) => item.id !== currentProductId)
        .slice(0, 4)
    },
    enabled: Boolean(categoryId),
  })
}
