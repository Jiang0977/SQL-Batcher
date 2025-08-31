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
        
        return {
            database: database,
            status: 'success',
            message: `Query executed successfully. ${results.affectedRows ? `${results.affectedRows} rows affected.` : ''}`,
            executionTime: executionTime
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
        
        return {
            database: database,
            status: 'success',
            message: `Query executed successfully. ${result.rowCount !== undefined ? `${result.rowCount} rows affected.` : ''}`,
            executionTime: executionTime
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