const mysql = require('mysql2/promise');
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

/**
 * Test database connection
 * @param {Object} connectionConfig - Database connection configuration
 * @returns {Promise<boolean>} - Connection test result
 */
async function testConnection(connectionConfig) {
    switch (connectionConfig.type) {
        case 'mysql':
            return await testMySqlConnection(connectionConfig);
        case 'postgresql':
            return await testPostgreSqlConnection(connectionConfig);
        default:
            throw new Error(`Unsupported database type: ${connectionConfig.type}`);
    }
}

/**
 * Test MySQL database connection
 * @param {Object} connectionConfig - MySQL connection configuration
 * @returns {Promise<boolean>} - Connection test result
 */
async function testMySqlConnection(connectionConfig) {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: connectionConfig.host,
            port: connectionConfig.port,
            user: connectionConfig.username,
            password: connectionConfig.password
        });
        
        await connection.ping();
        return true;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

/**
 * Test PostgreSQL database connection
 * @param {Object} connectionConfig - PostgreSQL connection configuration
 * @returns {Promise<boolean>} - Connection test result
 */
async function testPostgreSqlConnection(connectionConfig) {
    const client = new Client({
        host: connectionConfig.host,
        port: connectionConfig.port,
        user: connectionConfig.username,
        password: connectionConfig.password,
        database: 'postgres' // Connect to default database for testing
    });
    
    try {
        await client.connect();
        return true;
    } finally {
        await client.end();
    }
}

/**
 * Get list of databases from database server
 * @param {Object} connectionConfig - Database connection configuration
 * @returns {Promise<Array<string>>} - List of database names
 */
async function getDatabaseList(connectionConfig) {
    switch (connectionConfig.type) {
        case 'mysql':
            return await getMySqlDatabaseList(connectionConfig);
        case 'postgresql':
            return await getPostgreSqlDatabaseList(connectionConfig);
        default:
            throw new Error(`Unsupported database type: ${connectionConfig.type}`);
    }
}

/**
 * Get list of databases from MySQL server
 * @param {Object} connectionConfig - MySQL connection configuration
 * @returns {Promise<Array<string>>} - List of database names
 */
async function getMySqlDatabaseList(connectionConfig) {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: connectionConfig.host,
            port: connectionConfig.port,
            user: connectionConfig.username,
            password: connectionConfig.password
        });
        
        const [rows] = await connection.execute('SHOW DATABASES');
        // Ensure rows is an array
        const databases = Array.isArray(rows) ? rows : [];
        return databases.map(row => row.Database).filter(db => 
            db !== 'information_schema' && 
            db !== 'performance_schema' && 
            db !== 'mysql' && 
            db !== 'sys'
        );
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

/**
 * Get list of databases from PostgreSQL server
 * @param {Object} connectionConfig - PostgreSQL connection configuration
 * @returns {Promise<Array<string>>} - List of database names
 */
async function getPostgreSqlDatabaseList(connectionConfig) {
    const client = new Client({
        host: connectionConfig.host,
        port: connectionConfig.port,
        user: connectionConfig.username,
        password: connectionConfig.password,
        database: 'postgres' // Connect to default database
    });
    
    try {
        await client.connect();
        const result = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN (\'postgres\', \'template0\', \'template1\')');
        // Ensure rows is an array
        const rows = result.rows || [];
        return rows.map(row => row.datname);
    } finally {
        await client.end();
    }
}

/**
 * Execute SQL statement on a single database
 * @param {string} sql - SQL statement to execute
 * @param {string} database - Database name
 * @param {Object} connectionConfig - Database connection configuration
 * @returns {Promise<Object>} - Execution result
 */
async function executeSqlOnDatabase(sql, database, connectionConfig) {
    switch (connectionConfig.type) {
        case 'mysql':
            return await executeSqlOnMySqlDatabase(sql, database, connectionConfig);
        case 'postgresql':
            return await executeSqlOnPostgreSqlDatabase(sql, database, connectionConfig);
        default:
            throw new Error(`Unsupported database type: ${connectionConfig.type}`);
    }
}

/**
 * Execute SQL statement on a single MySQL database
 * @param {string} sql - SQL statement to execute
 * @param {string} database - Database name
 * @param {Object} connectionConfig - MySQL connection configuration
 * @returns {Promise<Object>} - Execution result
 */
async function executeSqlOnMySqlDatabase(sql, database, connectionConfig) {
    let connection;
    const startTime = Date.now();
    
    try {
        connection = await mysql.createConnection({
            host: connectionConfig.host,
            port: connectionConfig.port,
            user: connectionConfig.username,
            password: connectionConfig.password,
            database: database
        });
        
        const [results] = await connection.execute(sql);
        const executionTime = Date.now() - startTime;
        
        // 分析SQL类型以提供更详细的信息
        const sqlType = getSqlType(sql);
        let detailedMessage = `Query executed successfully.`;
        let rowData = null;
        let affectedRows = 0;
        
        if (sqlType === 'SELECT') {
            // 对于SELECT语句，返回行数和示例行数据
            affectedRows = Array.isArray(results) ? results.length : 0;
            detailedMessage = `Query executed successfully. ${affectedRows} rows returned.`;
            
            // 如果结果不太多，返回前几行数据用于显示
            if (affectedRows > 0 && affectedRows <= 100) {
                rowData = Array.isArray(results) ? results.slice(0, 5) : [];
            }
        } else if (sqlType === 'INSERT' || sqlType === 'UPDATE' || sqlType === 'DELETE') {
            // 对于修改操作，返回受影响的行数
            affectedRows = results.affectedRows || 0;
            detailedMessage = `Query executed successfully. ${affectedRows} rows affected.`;
        } else {
            // 其他类型的语句
            affectedRows = results.affectedRows || 0;
            detailedMessage = `Query executed successfully. ${affectedRows ? `${affectedRows} rows affected.` : ''}`;
        }
        
        return {
            database: database,
            status: 'success',
            message: detailedMessage,
            executionTime: executionTime,
            sqlType: sqlType,
            affectedRows: affectedRows,
            rowData: rowData
        };
    } catch (error) {
        const executionTime = Date.now() - startTime;
        return {
            database: database,
            status: 'error',
            message: error.message,
            executionTime: executionTime
        };
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

/**
 * Execute SQL statement on a single PostgreSQL database
 * @param {string} sql - SQL statement to execute
 * @param {string} database - Database name
 * @param {Object} connectionConfig - PostgreSQL connection configuration
 * @returns {Promise<Object>} - Execution result
 */
async function executeSqlOnPostgreSqlDatabase(sql, database, connectionConfig) {
    const client = new Client({
        host: connectionConfig.host,
        port: connectionConfig.port,
        user: connectionConfig.username,
        password: connectionConfig.password,
        database: database
    });
    
    const startTime = Date.now();
    
    try {
        await client.connect();
        const result = await client.query(sql);
        const executionTime = Date.now() - startTime;
        
        // 分析SQL类型以提供更详细的信息
        const sqlType = getSqlType(sql);
        let detailedMessage = `Query executed successfully.`;
        let rowData = null;
        let affectedRows = 0;
        
        if (sqlType === 'SELECT') {
            // 对于SELECT语句，返回行数和示例行数据
            affectedRows = result.rowCount || 0;
            detailedMessage = `Query executed successfully. ${affectedRows} rows returned.`;
            
            // 如果结果不太多，返回前几行数据用于显示
            if (affectedRows > 0 && affectedRows <= 100 && result.rows) {
                rowData = result.rows.slice(0, 5);
            }
        } else if (sqlType === 'INSERT' || sqlType === 'UPDATE' || sqlType === 'DELETE') {
            // 对于修改操作，返回受影响的行数
            affectedRows = result.rowCount || 0;
            detailedMessage = `Query executed successfully. ${affectedRows} rows affected.`;
        } else {
            // 其他类型的语句
            affectedRows = result.rowCount || 0;
            detailedMessage = `Query executed successfully. ${affectedRows ? `${affectedRows} rows affected.` : ''}`;
        }
        
        return {
            database: database,
            status: 'success',
            message: detailedMessage,
            executionTime: executionTime,
            sqlType: sqlType,
            affectedRows: affectedRows,
            rowData: rowData
        };
    } catch (error) {
        const executionTime = Date.now() - startTime;
        return {
            database: database,
            status: 'error',
            message: error.message,
            executionTime: executionTime
        };
    } finally {
        await client.end();
    }
}

/**
 * Determine SQL statement type
 * @param {string} sql - SQL statement
 * @returns {string} - SQL type (SELECT, INSERT, UPDATE, DELETE, etc.)
 */
function getSqlType(sql) {
    const trimmedSql = sql.trim().toUpperCase();
    if (trimmedSql.startsWith('SELECT')) {
        return 'SELECT';
    } else if (trimmedSql.startsWith('INSERT')) {
        return 'INSERT';
    } else if (trimmedSql.startsWith('UPDATE')) {
        return 'UPDATE';
    } else if (trimmedSql.startsWith('DELETE')) {
        return 'DELETE';
    } else if (trimmedSql.startsWith('CREATE')) {
        return 'CREATE';
    } else if (trimmedSql.startsWith('DROP')) {
        return 'DROP';
    } else if (trimmedSql.startsWith('ALTER')) {
        return 'ALTER';
    } else {
        return 'OTHER';
    }
}

/**
 * Execute SQL statement on multiple databases
 * @param {string} sql - SQL statement to execute
 * @param {Array<string>} databases - List of database names
 * @param {Object} connectionConfig - Database connection configuration
 * @returns {Promise<Array<Object>>} - Array of execution results
 */
async function executeSqlOnDatabases(sql, databases, connectionConfig) {
    const results = [];
    
    // Execute SQL on each database concurrently
    const promises = databases.map(database => 
        executeSqlOnDatabase(sql, database, connectionConfig)
    );
    
    // Wait for all executions to complete
    const executionResults = await Promise.all(promises);
    
    return executionResults;
}

module.exports = {
    testConnection,
    getDatabaseList,
    executeSqlOnDatabase,
    executeSqlOnDatabases
};