const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Define the path for the connections file
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CONNECTIONS_FILE = path.join(DATA_DIR, 'connections.json');

// Encryption configuration
const ENCRYPTION_KEY = crypto.createHash('sha256').update('sql-batcher-key-32-characters!!').digest();
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt a string using AES-256-CBC
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text as hex string
 */
function encrypt(text) {
    if (!text) return text;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt a string using AES-256-CBC
 * @param {string} text - Encrypted text as hex string
 * @returns {string} - Decrypted text
 */
function decrypt(text) {
    if (!text) return text;
    
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

/**
 * Initialize the data directory and connections file if they don't exist
 */
async function initializeDataDirectory() {
    try {
        // Create data directory if it doesn't exist
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        // Create connections file if it doesn't exist
        try {
            await fs.access(CONNECTIONS_FILE);
        } catch (error) {
            // File doesn't exist, create it with empty connections array
            await fs.writeFile(CONNECTIONS_FILE, JSON.stringify({ connections: [] }, null, 2));
        }
    } catch (error) {
        console.error('Error initializing data directory:', error);
        throw error;
    }
}

/**
 * Get all saved connections
 * @returns {Promise<Array<Object>>} - Array of connection objects
 */
async function getConnections() {
    await initializeDataDirectory();
    
    try {
        const data = await fs.readFile(CONNECTIONS_FILE, 'utf8');
        const connectionsData = JSON.parse(data);
        const connections = connectionsData.connections || [];
        
        // Decrypt passwords
        connections.forEach(connection => {
            if (connection.encryptedPassword) {
                connection.password = decrypt(connection.encryptedPassword);
                delete connection.encryptedPassword;
            }
        });
        
        return connections;
    } catch (error) {
        console.error('Error reading connections:', error);
        return [];
    }
}

/**
 * Save a new connection
 * @param {Object} connection - Connection object to save
 * @returns {Promise<Object>} - Saved connection object
 */
async function saveConnection(connection) {
    await initializeDataDirectory();
    
    try {
        const connections = await getConnections();
        
        // Encrypt password before saving
        if (connection.password) {
            connection.encryptedPassword = encrypt(connection.password);
            delete connection.password; // Remove plain text password
        }
        
        // Set default type if not provided
        if (!connection.type) {
            connection.type = 'mysql';
        }
        
        // If connection has an ID, it's an update
        if (connection.id) {
            const index = connections.findIndex(c => c.id === connection.id);
            if (index !== -1) {
                connections[index] = { ...connections[index], ...connection };
            } else {
                throw new Error('Connection not found');
            }
        } else {
            // New connection
            connection.id = uuidv4();
            connection.createdAt = new Date().toISOString();
            connections.push(connection);
        }
        
        // Prepare connections for saving (ensure encrypted passwords)
        const connectionsToSave = connections.map(conn => {
            const connCopy = { ...conn };
            if (connCopy.password && !connCopy.encryptedPassword) {
                connCopy.encryptedPassword = encrypt(connCopy.password);
                delete connCopy.password;
            }
            return connCopy;
        });
        
        await fs.writeFile(CONNECTIONS_FILE, JSON.stringify({ connections: connectionsToSave }, null, 2));
        
        // Return connection with decrypted password for UI
        const returnConnection = { ...connection };
        if (returnConnection.encryptedPassword) {
            returnConnection.password = decrypt(returnConnection.encryptedPassword);
            delete returnConnection.encryptedPassword;
        }
        
        return returnConnection;
    } catch (error) {
        console.error('Error saving connection:', error);
        throw error;
    }
}

/**
 * Update an existing connection
 * @param {Object} connection - Connection object to update
 * @returns {Promise<Object>} - Updated connection object
 */
async function updateConnection(connection) {
    return await saveConnection(connection);
}

/**
 * Delete a connection by ID
 * @param {string} id - Connection ID to delete
 * @returns {Promise<boolean>} - Success status
 */
async function deleteConnection(id) {
    await initializeDataDirectory();
    
    try {
        const connections = await getConnections();
        const filteredConnections = connections.filter(connection => connection.id !== id);
        
        // Prepare connections for saving (ensure encrypted passwords)
        const connectionsToSave = filteredConnections.map(conn => {
            const connCopy = { ...conn };
            if (connCopy.password && !connCopy.encryptedPassword) {
                connCopy.encryptedPassword = encrypt(connCopy.password);
                delete connCopy.password;
            }
            return connCopy;
        });
        
        await fs.writeFile(CONNECTIONS_FILE, JSON.stringify({ connections: connectionsToSave }, null, 2));
        return true;
    } catch (error) {
        console.error('Error deleting connection:', error);
        throw error;
    }
}

module.exports = {
    getConnections,
    saveConnection,
    updateConnection,
    deleteConnection
};