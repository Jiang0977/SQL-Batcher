const { ipcRenderer } = require('electron');

// DOM Elements
const connectionForm = {
    id: document.getElementById('connection-id'),
    name: document.getElementById('connection-name'),
    type: document.getElementById('connection-type'),
    host: document.getElementById('host'),
    port: document.getElementById('port'),
    username: document.getElementById('username'),
    password: document.getElementById('password')
};

const buttons = {
    testConnection: document.getElementById('test-connection-btn'),
    saveConnection: document.getElementById('save-connection-btn'),
    clearForm: document.getElementById('clear-form-btn'),
    refreshDatabases: document.getElementById('refresh-databases-btn'),
    executeSql: document.getElementById('execute-sql-btn')
};

const containers = {
    connections: document.getElementById('connections-container'),
    databases: document.getElementById('database-list'),
    results: document.getElementById('results-container')
};

const sqlEditor = document.getElementById('sql-editor');

// Current connection and databases
let currentConnection = null;
let databaseList = [];
let sqlHistory = [];

// Event Listeners
buttons.testConnection.addEventListener('click', testConnection);
buttons.saveConnection.addEventListener('click', saveConnection);
buttons.clearForm.addEventListener('click', clearConnectionForm);
buttons.refreshDatabases.addEventListener('click', refreshDatabases);
buttons.executeSql.addEventListener('click', executeSql);

// Load connections and SQL history on startup
document.addEventListener('DOMContentLoaded', async () => {
    await loadConnections();
    loadSqlHistory();
    
    // Set default port based on database type
    connectionForm.type.addEventListener('change', setDefaultPort);
});

// Set default port based on database type
function setDefaultPort() {
    switch (connectionForm.type.value) {
        case 'mysql':
            connectionForm.port.value = '3306';
            break;
        case 'postgresql':
            connectionForm.port.value = '5432';
            break;
        default:
            connectionForm.port.value = '3306';
    }
}

// Functions
async function testConnection() {
    const connection = getConnectionFromForm();
    
    if (!validateConnection(connection)) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const response = await ipcRenderer.invoke('test-connection', connection);
        showLoading(false);
        
        if (response.success) {
            showMessage('Connection successful!', 'success');
        } else {
            showMessage(`Connection failed: ${response.error}`, 'error');
        }
    } catch (error) {
        showLoading(false);
        showMessage(`Connection failed: ${error.message}`, 'error');
    }
}

async function saveConnection() {
    const connection = getConnectionFromForm();
    
    if (!validateConnection(connection)) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const response = await ipcRenderer.invoke('save-connection', connection);
        showLoading(false);
        
        if (response.success) {
            showMessage('Connection saved successfully!', 'success');
            clearConnectionForm();
            loadConnections();
        } else {
            showMessage(`Failed to save connection: ${response.error}`, 'error');
        }
    } catch (error) {
        showLoading(false);
        showMessage(`Failed to save connection: ${error.message}`, 'error');
    }
}

async function loadConnections() {
    try {
        showLoading(true);
        const response = await ipcRenderer.invoke('get-connections');
        showLoading(false);
        
        if (response.success) {
            renderConnections(response.connections);
        } else {
            showMessage(`Failed to load connections: ${response.error}`, 'error');
        }
    } catch (error) {
        showLoading(false);
        showMessage(`Failed to load connections: ${error.message}`, 'error');
    }
}

function renderConnections(connections) {
    containers.connections.innerHTML = '';
    
    if (connections.length === 0) {
        containers.connections.innerHTML = '<p class="empty-message">No saved connections</p>';
        return;
    }
    
    connections.forEach(connection => {
        const li = document.createElement('li');
        li.className = 'connection-item';
        li.innerHTML = `
            <div class="connection-info">
                <h4>${escapeHtml(connection.name)}</h4>
                <p>${escapeHtml(connection.type)} - ${escapeHtml(connection.host)}:${escapeHtml(connection.port)}</p>
            </div>
            <div class="connection-actions">
                <button class="edit-connection-btn" data-id="${connection.id}">Edit</button>
                <button class="delete-connection-btn" data-id="${connection.id}">Delete</button>
            </div>
        `;
        containers.connections.appendChild(li);
    });
    
    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.edit-connection-btn').forEach(button => {
        button.addEventListener('click', (e) => editConnection(e.target.dataset.id));
    });
    
    document.querySelectorAll('.delete-connection-btn').forEach(button => {
        button.addEventListener('click', (e) => deleteConnection(e.target.dataset.id));
    });
}

async function editConnection(id) {
    try {
        showLoading(true);
        const response = await ipcRenderer.invoke('get-connections');
        showLoading(false);
        
        if (response.success) {
            const connection = response.connections.find(conn => conn.id === id);
            if (connection) {
                fillConnectionForm(connection);
            } else {
                showMessage('Connection not found', 'error');
            }
        } else {
            showMessage(`Failed to load connection: ${response.error}`, 'error');
        }
    } catch (error) {
        showLoading(false);
        showMessage(`Failed to load connection: ${error.message}`, 'error');
    }
}

async function deleteConnection(id) {
    if (!confirm('Are you sure you want to delete this connection?')) {
        return;
    }
    
    try {
        showLoading(true);
        const response = await ipcRenderer.invoke('delete-connection', id);
        showLoading(false);
        
        if (response.success) {
            showMessage('Connection deleted successfully!', 'success');
            loadConnections();
        } else {
            showMessage(`Failed to delete connection: ${response.error}`, 'error');
        }
    } catch (error) {
        showLoading(false);
        showMessage(`Failed to delete connection: ${error.message}`, 'error');
    }
}

async function refreshDatabases() {
    const connection = getConnectionFromForm();
    
    if (!validateConnection(connection)) {
        showMessage('Please select or create a valid connection first', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const response = await ipcRenderer.invoke('get-databases', connection);
        showLoading(false);
        
        if (response.success) {
            databaseList = response.databases;
            renderDatabases(response.databases);
            currentConnection = connection;
            showMessage('Databases loaded successfully', 'success');
        } else {
            showMessage(`Failed to get databases: ${response.error}`, 'error');
        }
    } catch (error) {
        showLoading(false);
        showMessage(`Failed to get databases: ${error.message}`, 'error');
    }
}

function renderDatabases(databases) {
    containers.databases.innerHTML = '';
    
    if (databases.length === 0) {
        containers.databases.innerHTML = '<p class="empty-message">No databases found</p>';
        return;
    }
    
    databases.forEach(database => {
        const li = document.createElement('li');
        li.className = 'database-item';
        li.innerHTML = `
            <input type="checkbox" id="db-${escapeHtml(database)}" value="${escapeHtml(database)}">
            <label for="db-${escapeHtml(database)}">${escapeHtml(database)}</label>
        `;
        containers.databases.appendChild(li);
    });
}

async function executeSql() {
    if (!currentConnection) {
        showMessage('Please select a connection first', 'error');
        return;
    }
    
    const sql = sqlEditor.value.trim();
    if (!sql) {
        showMessage('Please enter SQL statement', 'error');
        return;
    }
    
    // Add to SQL history
    addToSqlHistory(sql);
    
    // Get selected databases
    const selectedDatabases = [];
    document.querySelectorAll('#database-list input[type="checkbox"]:checked').forEach(checkbox => {
        selectedDatabases.push(checkbox.value);
    });
    
    if (selectedDatabases.length === 0) {
        showMessage('Please select at least one database', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const response = await ipcRenderer.invoke('execute-sql', {
            sql,
            selectedDatabases,
            connection: currentConnection
        });
        showLoading(false);
        
        if (response.success) {
            renderResultsTable(response.results);
            showMessage(`Executed on ${response.results.length} databases`, 'success');
        } else {
            showMessage(`Execution failed: ${response.error}`, 'error');
        }
    } catch (error) {
        showLoading(false);
        showMessage(`Execution failed: ${error.message}`, 'error');
    }
}

function renderResultsTable(results) {
    // Create table element
    const table = document.createElement('table');
    table.className = 'results-table';
    
    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Database</th>
            <th>Status</th>
            <th>Message</th>
            <th>Execution Time (ms)</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    results.forEach(result => {
        const row = document.createElement('tr');
        row.className = result.status === 'success' ? 'success' : 'error';
        row.innerHTML = `
            <td>${escapeHtml(result.database)}</td>
            <td>${escapeHtml(result.status.toUpperCase())}</td>
            <td>${escapeHtml(result.message)}</td>
            <td>${escapeHtml(result.executionTime || 'N/A')}</td>
        `;
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    
    // Clear results container and add table
    containers.results.innerHTML = '';
    containers.results.appendChild(table);
    
    // Add summary
    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'error').length;
    const summary = document.createElement('div');
    summary.className = 'results-summary';
    summary.innerHTML = `
        <p>Executed on ${results.length} databases: ${successCount} succeeded, ${failureCount} failed</p>
    `;
    containers.results.appendChild(summary);
}

// SQL History Functions
function addToSqlHistory(sql) {
    // Add to beginning of array
    sqlHistory.unshift(sql);
    
    // Keep only last 20 entries
    if (sqlHistory.length > 20) {
        sqlHistory = sqlHistory.slice(0, 20);
    }
    
    // Save to localStorage
    try {
        localStorage.setItem('sqlHistory', JSON.stringify(sqlHistory));
    } catch (error) {
        console.error('Failed to save SQL history:', error);
    }
}

function loadSqlHistory() {
    try {
        const history = localStorage.getItem('sqlHistory');
        if (history) {
            sqlHistory = JSON.parse(history);
        }
    } catch (error) {
        console.error('Failed to load SQL history:', error);
        sqlHistory = [];
    }
}

// Helper Functions
function getConnectionFromForm() {
    return {
        id: connectionForm.id.value || null,
        name: connectionForm.name.value,
        type: connectionForm.type.value,
        host: connectionForm.host.value,
        port: parseInt(connectionForm.port.value),
        username: connectionForm.username.value,
        password: connectionForm.password.value
    };
}

function fillConnectionForm(connection) {
    connectionForm.id.value = connection.id || '';
    connectionForm.name.value = connection.name || '';
    connectionForm.type.value = connection.type || 'mysql';
    connectionForm.host.value = connection.host || '';
    connectionForm.port.value = connection.port || (connection.type === 'postgresql' ? '5432' : '3306');
    connectionForm.username.value = connection.username || '';
    connectionForm.password.value = connection.password || '';
    
    // Trigger port update
    setDefaultPort();
}

function clearConnectionForm() {
    connectionForm.id.value = '';
    connectionForm.name.value = '';
    connectionForm.type.value = 'mysql';
    connectionForm.host.value = '';
    connectionForm.port.value = '3306';
    connectionForm.username.value = '';
    connectionForm.password.value = '';
}

function validateConnection(connection) {
    return connection.name && connection.type && connection.host && connection.port && connection.username;
}

// UI Helper Functions
function showMessage(message, type) {
    // Remove any existing messages
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    // Add to body
    document.body.appendChild(messageEl);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, 5000);
}

function showLoading(show) {
    if (show) {
        document.body.classList.add('loading');
    } else {
        document.body.classList.remove('loading');
    }
}

// Security helper function to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}