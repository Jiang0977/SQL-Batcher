const mysql = require('mysql2/promise');
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

// -------------------------
// Helper: split SQL into statements safely (supports quotes, comments, PG $tag$)
// -------------------------
function splitSqlStatements(sql, dialect = 'mysql') {
    const statements = [];
    if (!sql || typeof sql !== 'string') return statements;

    let i = 0;
    const n = sql.length;
    let current = '';
    let inSingle = false;
    let inDouble = false;
    let inBacktick = false; // mysql identifiers
    let inLineComment = false;
    let inBlockComment = false;
    let pgDollarTag = null; // e.g., $tag$

    function isDollarStart(idx) {
        if (dialect !== 'postgresql') return null;
        if (sql[idx] !== '$') return null;
        let j = idx + 1;
        while (j < n && /[A-Za-z0-9_]/.test(sql[j])) j++;
        if (j < n && sql[j] === '$') {
            return sql.slice(idx, j + 1); // e.g., $tag$
        }
        return '$$'; // handle $$ as empty tag
    }

    while (i < n) {
        const ch = sql[i];
        const next = i + 1 < n ? sql[i + 1] : '';

        // Handle exiting comments
        if (inLineComment) {
            current += ch;
            if (ch === '\n') inLineComment = false;
            i++;
            continue;
        }
        if (inBlockComment) {
            current += ch;
            if (ch === '*' && next === '/') {
                current += next;
                i += 2;
                inBlockComment = false;
                continue;
            }
            i++;
            continue;
        }

        // Handle entering comments (when not in quotes/dollar quote)
        if (!inSingle && !inDouble && !inBacktick && !pgDollarTag) {
            if (ch === '-' && next === '-') {
                inLineComment = true;
                current += ch + next;
                i += 2;
                continue;
            }
            if (ch === '/' && next === '*') {
                inBlockComment = true;
                current += ch + next;
                i += 2;
                continue;
            }
        }

        // Handle quotes
        if (!pgDollarTag && !inLineComment && !inBlockComment) {
            if (!inDouble && !inBacktick && ch === "'" && !inSingle) {
                inSingle = true;
                current += ch;
                i++;
                continue;
            } else if (inSingle) {
                current += ch;
                if (ch === "'" && sql[i - 1] !== '\\') {
                    inSingle = false;
                }
                i++;
                continue;
            }

            if (!inSingle && !inBacktick && ch === '"' && !inDouble) {
                inDouble = true;
                current += ch;
                i++;
                continue;
            } else if (inDouble) {
                current += ch;
                if (ch === '"' && sql[i - 1] !== '\\') {
                    inDouble = false;
                }
                i++;
                continue;
            }

            if (dialect === 'mysql' && !inSingle && !inDouble && ch === '`' && !inBacktick) {
                inBacktick = true;
                current += ch;
                i++;
                continue;
            } else if (inBacktick) {
                current += ch;
                if (ch === '`') inBacktick = false;
                i++;
                continue;
            }
        }

        // Handle PostgreSQL dollar-quoted strings
        if (!inSingle && !inDouble && !inBacktick && !inLineComment && !inBlockComment) {
            if (!pgDollarTag && ch === '$') {
                const tag = isDollarStart(i);
                if (tag) {
                    pgDollarTag = tag;
                }
            } else if (pgDollarTag && ch === '$') {
                const maybe = sql.slice(i, i + pgDollarTag.length);
                if (maybe === pgDollarTag) {
                    current += maybe;
                    i += pgDollarTag.length;
                    pgDollarTag = null;
                    continue;
                }
            }
        }

        // Statement boundary at semicolon only when not inside any string/comment/dollar block
        if (!inSingle && !inDouble && !inBacktick && !inLineComment && !inBlockComment && !pgDollarTag && ch === ';') {
            if (current.trim()) statements.push(current.trim());
            current = '';
            i++;
            continue;
        }

        current += ch;
        i++;
    }

    if (current.trim()) statements.push(current.trim());
    return statements;
}

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
    const overallStart = Date.now();
    const statements = splitSqlStatements(sql, 'mysql');

    try {
        connection = await mysql.createConnection({
            host: connectionConfig.host,
            port: connectionConfig.port,
            user: connectionConfig.username,
            password: connectionConfig.password,
            database: database
        });

        // Begin transaction
        if (typeof connection.beginTransaction === 'function') {
            await connection.beginTransaction();
        } else {
            await connection.execute('START TRANSACTION');
        }

        const statementResults = [];
        let totalAffected = 0;

        for (let idx = 0; idx < statements.length; idx++) {
            const stmt = statements[idx];
            const stmtStart = Date.now();
            const stmtType = getSqlType(stmt);
            try {
                const [rowsOrOk] = await connection.query(stmt);
                const stmtTime = Date.now() - stmtStart;

                let affectedRows = 0;
                let preview = null;
                let message = 'OK';
                if (stmtType === 'SELECT') {
                    const rows = Array.isArray(rowsOrOk) ? rowsOrOk : [];
                    affectedRows = rows.length;
                    if (affectedRows > 0 && affectedRows <= 100) {
                        preview = rows.slice(0, 5);
                    }
                    message = `${affectedRows} rows returned`;
                } else {
                    affectedRows = rowsOrOk && typeof rowsOrOk.affectedRows === 'number' ? rowsOrOk.affectedRows : 0;
                    message = `${affectedRows} rows affected`;
                }
                totalAffected += affectedRows;
                statementResults.push({
                    index: idx + 1,
                    sql: stmt,
                    sqlType: stmtType,
                    status: 'success',
                    message,
                    affectedRows,
                    rowData: preview,
                    executionTime: stmtTime
                });
            } catch (stmtErr) {
                // Rollback and mark remaining as skipped
                try {
                    if (typeof connection.rollback === 'function') {
                        await connection.rollback();
                    } else {
                        await connection.execute('ROLLBACK');
                    }
                } catch (_) {}

                const stmtTime = Date.now() - stmtStart;
                statementResults.push({
                    index: idx + 1,
                    sql: stmt,
                    sqlType: stmtType,
                    status: 'error',
                    message: stmtErr.message,
                    affectedRows: 0,
                    rowData: null,
                    executionTime: stmtTime
                });
                // mark remaining as skipped
                for (let j = idx + 1; j < statements.length; j++) {
                    statementResults.push({
                        index: j + 1,
                        sql: statements[j],
                        sqlType: getSqlType(statements[j]),
                        status: 'skipped',
                        message: 'Skipped due to previous error and rollback',
                        affectedRows: 0,
                        rowData: null,
                        executionTime: 0
                    });
                }

                const overallTime = Date.now() - overallStart;
                return {
                    database,
                    status: 'error',
                    message: `Rolled back due to error at statement #${idx + 1}: ${stmtErr.message}`,
                    executionTime: overallTime,
                    sqlType: statements.length > 1 ? 'MULTI' : getSqlType(sql),
                    affectedRows: totalAffected,
                    statements: statementResults
                };
            }
        }

        // Commit if all succeeded
        try {
            if (typeof connection.commit === 'function') {
                await connection.commit();
            } else {
                await connection.execute('COMMIT');
            }
        } catch (commitErr) {
            // If commit fails, attempt rollback
            try {
                if (typeof connection.rollback === 'function') {
                    await connection.rollback();
                } else {
                    await connection.execute('ROLLBACK');
                }
            } catch (_) {}
            const overallTime = Date.now() - overallStart;
            return {
                database,
                status: 'error',
                message: `Commit failed: ${commitErr.message}`,
                executionTime: overallTime,
                sqlType: statements.length > 1 ? 'MULTI' : getSqlType(sql),
                affectedRows: totalAffected,
                statements: statementResults
            };
        }

        const overallTime = Date.now() - overallStart;
        return {
            database,
            status: 'success',
            message: `${statementResults.filter(s => s.status === 'success').length}/${statements.length} statements succeeded`,
            executionTime: overallTime,
            sqlType: statements.length > 1 ? 'MULTI' : getSqlType(sql),
            affectedRows: totalAffected,
            statements: statementResults
        };
    } catch (error) {
        const overallTime = Date.now() - overallStart;
        return {
            database: database,
            status: 'error',
            message: error.message,
            executionTime: overallTime
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
    
    const overallStart = Date.now();
    const statements = splitSqlStatements(sql, 'postgresql');
    
    try {
        await client.connect();
        await client.query('BEGIN');

        const statementResults = [];
        let totalAffected = 0;

        for (let idx = 0; idx < statements.length; idx++) {
            const stmt = statements[idx];
            const stmtStart = Date.now();
            const stmtType = getSqlType(stmt);
            try {
                const result = await client.query(stmt);
                const stmtTime = Date.now() - stmtStart;
                let affectedRows = 0;
                let preview = null;
                let message = 'OK';
                if (stmtType === 'SELECT') {
                    affectedRows = result.rowCount || 0;
                    if (affectedRows > 0 && affectedRows <= 100 && result.rows) {
                        preview = result.rows.slice(0, 5);
                    }
                    message = `${affectedRows} rows returned`;
                } else {
                    affectedRows = result.rowCount || 0;
                    message = `${affectedRows} rows affected`;
                }
                totalAffected += affectedRows;
                statementResults.push({
                    index: idx + 1,
                    sql: stmt,
                    sqlType: stmtType,
                    status: 'success',
                    message,
                    affectedRows,
                    rowData: preview,
                    executionTime: stmtTime
                });
            } catch (stmtErr) {
                try { await client.query('ROLLBACK'); } catch (_) {}
                const stmtTime = Date.now() - stmtStart;
                statementResults.push({
                    index: idx + 1,
                    sql: stmt,
                    sqlType: stmtType,
                    status: 'error',
                    message: stmtErr.message,
                    affectedRows: 0,
                    rowData: null,
                    executionTime: stmtTime
                });
                for (let j = idx + 1; j < statements.length; j++) {
                    statementResults.push({
                        index: j + 1,
                        sql: statements[j],
                        sqlType: getSqlType(statements[j]),
                        status: 'skipped',
                        message: 'Skipped due to previous error and rollback',
                        affectedRows: 0,
                        rowData: null,
                        executionTime: 0
                    });
                }
                const overallTime = Date.now() - overallStart;
                return {
                    database,
                    status: 'error',
                    message: `Rolled back due to error at statement #${idx + 1}: ${stmtErr.message}`,
                    executionTime: overallTime,
                    sqlType: statements.length > 1 ? 'MULTI' : getSqlType(sql),
                    affectedRows: totalAffected,
                    statements: statementResults
                };
            }
        }

        try { await client.query('COMMIT'); } catch (commitErr) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            const overallTime = Date.now() - overallStart;
            return {
                database,
                status: 'error',
                message: `Commit failed: ${commitErr.message}`,
                executionTime: overallTime,
                sqlType: statements.length > 1 ? 'MULTI' : getSqlType(sql),
                affectedRows: totalAffected,
                statements: statementResults
            };
        }

        const overallTime = Date.now() - overallStart;
        return {
            database,
            status: 'success',
            message: `${statementResults.filter(s => s.status === 'success').length}/${statements.length} statements succeeded`,
            executionTime: overallTime,
            sqlType: statements.length > 1 ? 'MULTI' : getSqlType(sql),
            affectedRows: totalAffected,
            statements: statementResults
        };
    } catch (error) {
        const overallTime = Date.now() - overallStart;
        return {
            database: database,
            status: 'error',
            message: error.message,
            executionTime: overallTime
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
