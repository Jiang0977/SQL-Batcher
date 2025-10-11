const { testConnection, getDatabaseList, executeSqlOnDatabase, executeSqlOnDatabases } = require('../src/database/executor');

// Mock database connections for testing
jest.mock('mysql2/promise', () => {
    const executeImpl = jest.fn(async (sql) => {
        const upper = String(sql).trim().toUpperCase();
        if (upper.startsWith('SELECT')) {
            return [[{ a: 1 }]]; // rows
        }
        if (upper.includes('FAIL')) {
            throw new Error('Simulated MySQL failure');
        }
        return [[{ affectedRows: 3 }]];
    });
    return {
        createConnection: jest.fn().mockResolvedValue({
            ping: jest.fn().mockResolvedValue(true),
            execute: executeImpl,
            beginTransaction: jest.fn().mockResolvedValue(),
            commit: jest.fn().mockResolvedValue(),
            rollback: jest.fn().mockResolvedValue(),
            end: jest.fn().mockResolvedValue()
        })
    };
});

jest.mock('pg', () => {
    return {
        Client: jest.fn().mockImplementation(() => {
            const query = jest.fn(async (sql) => {
                const upper = String(sql).trim().toUpperCase();
                if (upper === 'BEGIN' || upper === 'COMMIT' || upper === 'ROLLBACK') return { rowCount: 0 };
                if (upper.startsWith('SELECT')) return { rows: [{ a: 1 }], rowCount: 1 };
                if (upper.includes('FAIL')) throw new Error('Simulated PG failure');
                return { rowCount: 2 };
            });
            return {
                connect: jest.fn().mockResolvedValue(),
                query,
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

        it('should execute multi-statements in transaction for MySQL and succeed', async () => {
            const sql = "SELECT 1; UPDATE t SET c=1;";
            const result = await executeSqlOnDatabase(sql, 'testdb', mysqlConnection);
            expect(result.status).toBe('success');
            expect(Array.isArray(result.statements)).toBe(true);
            expect(result.statements.length).toBe(2);
            expect(result.statements[0].status).toBe('success');
            expect(result.statements[1].status).toBe('success');
        });

        it('should rollback on error in MySQL multi-statements', async () => {
            const sql = "UPDATE t SET c=1; UPDATE t SET c=FAIL; SELECT 1;";
            const result = await executeSqlOnDatabase(sql, 'testdb', mysqlConnection);
            expect(result.status).toBe('error');
            expect(result.statements.some(s => s.status === 'error')).toBe(true);
            const skippedAfterError = result.statements.find(s => s.status === 'skipped');
            expect(!!skippedAfterError).toBe(true);
        });

        it('should execute multi-statements in transaction for PostgreSQL and succeed', async () => {
            const sql = "SELECT 1; UPDATE t SET c=1;";
            const result = await executeSqlOnDatabase(sql, 'testdb', postgresqlConnection);
            expect(result.status).toBe('success');
            expect(Array.isArray(result.statements)).toBe(true);
            expect(result.statements.length).toBe(2);
            expect(result.statements[0].status).toBe('success');
            expect(result.statements[1].status).toBe('success');
        });

        it('should rollback on error in PostgreSQL multi-statements', async () => {
            const sql = "UPDATE t SET c=1; UPDATE t SET c=FAIL; SELECT 1;";
            const result = await executeSqlOnDatabase(sql, 'testdb', postgresqlConnection);
            expect(result.status).toBe('error');
            expect(result.statements.some(s => s.status === 'error')).toBe(true);
            const skippedAfterError = result.statements.find(s => s.status === 'skipped');
            expect(!!skippedAfterError).toBe(true);
        });
    });
});