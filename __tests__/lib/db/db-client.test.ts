import { Pool } from 'pg'
import { getDbPool, query } from '@/lib/db/db-client'

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    end: jest.fn(),
  })),
}))

describe('Database Client', () => {
  let mockPool: jest.Mocked<Pool>

  beforeEach(() => {
    jest.clearAllMocks()
    mockPool = {
      query: jest.fn(),
      end: jest.fn(),
    } as any
    ;(Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool)
  })

  describe('getDbPool', () => {
    it('should create a new pool if none exists', () => {
      const pool = getDbPool()
      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://test:test@localhost:5432/test_db',
      })
      expect(pool).toBe(mockPool)
    })

    it('should return existing pool if already created', () => {
      const pool1 = getDbPool()
      const pool2 = getDbPool()
      expect(pool1).toBe(pool2)
      expect(Pool).toHaveBeenCalledTimes(1)
    })

    it('should use default connection string when DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL
      getDbPool()
      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://postgres:postgres@localhost:5432/invoice_db',
      })
    })
  })

  describe('query', () => {
    beforeEach(() => {
      // Reset the pool instance for each test
      const dbClient = require('@/lib/db/db-client')
      dbClient.resetPool?.() // Reset if function exists
    })

    it('should execute query successfully', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }] }
      mockPool.query.mockResolvedValue(mockResult)

      const result = await query('SELECT * FROM test', ['param1'])

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test', ['param1'])
      expect(result).toEqual([{ id: 1, name: 'test' }])
    })

    it('should execute query without parameters', async () => {
      const mockResult = { rows: [{ count: 5 }] }
      mockPool.query.mockResolvedValue(mockResult)

      const result = await query('SELECT COUNT(*) as count FROM test')

      expect(mockPool.query).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM test', undefined)
      expect(result).toEqual([{ count: 5 }])
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed')
      mockPool.query.mockRejectedValue(dbError)

      await expect(query('SELECT * FROM test')).rejects.toThrow('Database connection failed')
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test', undefined)
    })

    it('should log database errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const dbError = new Error('Query failed')
      mockPool.query.mockRejectedValue(dbError)

      try {
        await query('INVALID SQL')
      } catch (error) {
        // Expected to throw
      }

      expect(consoleSpy).toHaveBeenCalledWith('Database query error:', dbError)
      consoleSpy.mockRestore()
    })
  })
})
