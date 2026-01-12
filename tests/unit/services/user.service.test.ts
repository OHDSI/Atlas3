/**
 * Unit tests for user service
 * T090: Test fetchUsers, fetchUserById, fetchAllUsers
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as userService from '@/services/user.service'
import type { User } from '@/models/role.types'

// Mock dependencies
vi.mock('@/services/webapi')
vi.mock('@/utils/logger')

describe('user.service', () => {
  let fetchJSON: typeof import('@/services/webapi').fetchJSON

  const mockUsers: User[] = [
    {
      id: 1,
      login: 'admin',
      name: 'Admin User',
      email: 'admin@example.com',
    },
    {
      id: 2,
      login: 'user',
      name: 'Regular User',
      email: 'user@example.com',
    },
    {
      id: 3,
      login: 'editor',
      name: 'Editor User',
      email: 'editor@example.com',
    },
  ]

  const mockUser: User = mockUsers[0]

  beforeEach(async () => {
    vi.clearAllMocks()
    const webapi = await import('@/services/webapi')
    fetchJSON = webapi.fetchJSON
  })

  describe('fetchUsers', () => {
    it('should fetch users with default pagination', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(mockUsers)

      const result = await userService.fetchUsers()

      expect(fetchJSON).toHaveBeenCalledWith('/user/?limit=50&offset=0')
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(mockUsers)
      }
    })

    it('should fetch users with custom pagination', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(mockUsers)

      const result = await userService.fetchUsers(100, 20)

      expect(fetchJSON).toHaveBeenCalledWith('/user/?limit=100&offset=20')
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(mockUsers)
      }
    })

    it('should handle validation error', async () => {
      vi.mocked(fetchJSON).mockResolvedValue({ invalid: 'data' })

      const result = await userService.fetchUsers()

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Invalid users response format')
      }
    })

    it('should handle fetch error', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('Network error'))

      const result = await userService.fetchUsers()

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Network error')
      }
    })
  })

  describe('fetchUserById', () => {
    it('should fetch single user successfully', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(mockUser)

      const result = await userService.fetchUserById(1)

      expect(fetchJSON).toHaveBeenCalledWith('/user/1')
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(mockUser)
      }
    })

    it('should handle validation error', async () => {
      vi.mocked(fetchJSON).mockResolvedValue({ invalid: 'data' })

      const result = await userService.fetchUserById(1)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Invalid user response format')
      }
    })

    it('should handle fetch error', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('User not found'))

      const result = await userService.fetchUserById(999)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('User not found')
      }
    })
  })

  describe('fetchAllUsers', () => {
    it('should fetch all users with high limit', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(mockUsers)

      const result = await userService.fetchAllUsers()

      expect(fetchJSON).toHaveBeenCalledWith('/user/?limit=1000&offset=0')
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(mockUsers)
      }
    })

    it('should handle errors from underlying fetchUsers', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('Server error'))

      const result = await userService.fetchAllUsers()

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Server error')
      }
    })
  })
})
