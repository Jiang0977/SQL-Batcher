const { testConnection, getDatabaseList, executeSqlOnDatabase, executeSqlOnDatabases } = require('../src/database/executor');

// Mock database connections for testing
jest.mock('mysql2/promise', () => {
    return {
        createConnection: jest.fn().mockResolvedValue({
            ping: jest.fn().mockResolvedValue(true),
            execute: jest.fn().mockResolvedValue([{}]),
            end: jest.fn().mockResolvedValue()
        })
    };
});

jest.mock('pg', () => {
    return {
        Client: jest.fn().mockImplementation(() => {
            return {
                connect: jest.fn().mockResolvedValue(),
                query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
                end: jest.fn().mockResolvedValue()
            };
        })
    };
});

describe('Database Executor', () => {
    const mysqlConnection = {
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'root1234'
    };
    
    const postgresqlConnection = {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        username: 'testuser',
        password: 'testpass'
    };
    
    describe('testConnection', () => {
        it('should test MySQL connection successfully', async () => {
            const result = await testConnection(mysqlConnection);
            expect(result).toBe(true);
        });
        
        it('should test PostgreSQL connection successfully', async () => {
            const result = await testConnection(postgresqlConnection);
            expect(result).toBe(true);
        });
        
        it('should throw error for unsupported database type', async () => {
            const unsupportedConnection = { ...mysqlConnection, type: 'oracle' };
            await expect(testConnection(unsupportedConnection)).rejects.toThrow('Unsupported database type: oracle');
        });
    });
    
    describe('getDatabaseList', () => {
        it('should get MySQL database list', async () => {
            const result = await getDatabaseList(mysqlConnection);
            expect(Array.isArray(result)).toBe(true);
        });
        
        it('should get PostgreSQL database list', async () => {
            const result = await getDatabaseList(postgresqlConnection);
            expect(Array.isArray(result)).toBe(true);
        });
    });
    
    describe('executeSqlOnDatabase', () => {
        it('should execute SQL on MySQL database', async () => {
            const result = await executeSqlOnDatabase('SELECT 1', 'testdb', mysqlConnection);
            expect(result).toHaveProperty('database', 'testdb');
            expect(result).toHaveProperty('status');
        });
        
        it('should execute SQL on PostgreSQL database', async () => {
            const result = await executeSqlOnDatabase('SELECT 1', 'testdb', postgresqlConnection);
            expect(result).toHaveProperty('database', 'testdb');
            expect(result).toHaveProperty('status');
        });
    });
});