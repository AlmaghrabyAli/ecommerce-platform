import { useQuery } from '@tanstack/react-query'
import { getCategoriesApi } from '../api/catalog.js'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategoriesApi,
    staleTime: 5 * 60 * 1000,
  })
}
