import React, { useState, useEffect } from 'react';
import ConnectionManager from './ConnectionManager';
import DatabaseSelector from './DatabaseSelector';
import SqlEditor from './SqlEditor';
import ResultsDisplay from './ResultsDisplay';

const App = () => {
    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState(null);
    const [databases, setDatabases] = useState([]);
    const [selectedDatabases, setSelectedDatabases] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Load connections on startup
    useEffect(() => {
        loadConnections();
    }, []);

    // 当数据库列表变化时，重置选中的数据库
    useEffect(() => {
        setSelectedDatabases([]);
    }, [databases.length]);

    const loadConnections = async () => {
        try {
            setLoading(true);
            const response = await window.electron.ipcRenderer.invoke('get-connections');
            setLoading(false);
            
            if (response.success) {
                setConnections(response.connections);
            } else {
                showMessage(`Failed to load connections: ${response.error}`, 'error');
            }
        } catch (error) {
            setLoading(false);
            showMessage(`Failed to load connections: ${error.message}`, 'error');
        }
    };

    const saveConnection = async (connection) => {
        try {
            setLoading(true);
            const response = await window.electron.ipcRenderer.invoke('save-connection', connection);
            setLoading(false);
            
            if (response.success) {
                showMessage('Connection saved successfully!', 'success');
                loadConnections();
                return true;
            } else {
                showMessage(`Failed to save connection: ${response.error}`, 'error');
                return false;
            }
        } catch (error) {
            setLoading(false);
            showMessage(`Failed to save connection: ${error.message}`, 'error');
            return false;
        }
    };

    const deleteConnection = async (id) => {
        if (!window.confirm('Are you sure you want to delete this connection?')) {
            return;
        }
        
        try {
            setLoading(true);
            const response = await window.electron.ipcRenderer.invoke('delete-connection', id);
            setLoading(false);
            
            if (response.success) {
                showMessage('Connection deleted successfully!', 'success');
                loadConnections();
                return true;
            } else {
                showMessage(`Failed to delete connection: ${response.error}`, 'error');
                return false;
            }
        } catch (error) {
            setLoading(false);
            showMessage(`Failed to delete connection: ${error.message}`, 'error');
            return false;
        }
    };

    const testConnection = async (connection) => {
        try {
            setLoading(true);
            const response = await window.electron.ipcRenderer.invoke('test-connection', connection);
            setLoading(false);
            
            if (response.success) {
                showMessage('Connection successful!', 'success');
                return true;
            } else {
                showMessage(`Connection failed: ${response.error}`, 'error');
                return false;
            }
        } catch (error) {
            setLoading(false);
            showMessage(`Connection failed: ${error.message}`, 'error');
            return false;
        }
    };

    const selectConnection = async (connection) => {
        setSelectedConnection(connection);
        setSelectedDatabases([]); // Reset selected databases when changing connection
        await refreshDatabases(connection);
    };

    const refreshDatabases = async (connection) => {
        try {
            setLoading(true);
            const response = await window.electron.ipcRenderer.invoke('get-databases', connection);
            setLoading(false);
            
            if (response.success) {
                setDatabases(response.databases);
                showMessage('Databases loaded successfully', 'success');
                return true;
            } else {
                showMessage(`Failed to get databases: ${response.error}`, 'error');
                return false;
            }
        } catch (error) {
            setLoading(false);
            showMessage(`Failed to get databases: ${error.message}`, 'error');
            return false;
        }
    };

    const handleDatabaseSelectionChange = (selected) => {
        setSelectedDatabases(selected);
    };

    const executeSql = async (sql, selectedDatabases) => {
        if (!selectedConnection) {
            showMessage('Please select a connection first', 'error');
            return;
        }
        
        if (!sql.trim()) {
            showMessage('Please enter SQL statement', 'error');
            return;
        }
        
        if (selectedDatabases.length === 0) {
            showMessage('Please select at least one database', 'error');
            return;
        }
        
        try {
            setLoading(true);
            const response = await window.electron.ipcRenderer.invoke('execute-sql', {
                sql,
                selectedDatabases,
                connection: selectedConnection
            });
            setLoading(false);
            
            if (response.success) {
                setResults(response.results);
                showMessage(`Executed on ${response.results.length} databases`, 'success');
            } else {
                showMessage(`Execution failed: ${response.error}`, 'error');
            }
        } catch (error) {
            setLoading(false);
            showMessage(`Execution failed: ${error.message}`, 'error');
        }
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    };

    return (
        <div className="app">
            <header className="app-header">
                <h1>SQL Batcher</h1>
                <p>Batch execute SQL statements across multiple databases</p>
            </header>
            
            <div className="app-content">
                <ConnectionManager
                    connections={connections}
                    selectedConnection={selectedConnection}
                    onSelectConnection={selectConnection}
                    onSaveConnection={saveConnection}
                    onDeleteConnection={deleteConnection}
                    onTestConnection={testConnection}
                    onLoadConnections={loadConnections}
                />
                
                <div className="main-panel">
                    <DatabaseSelector
                        databases={databases}
                        selectedConnection={selectedConnection}
                        onRefreshDatabases={refreshDatabases}
                        onDatabaseSelectionChange={handleDatabaseSelectionChange}
                    />
                    
                    <SqlEditor
                        onExecuteSql={executeSql}
                        selectedDatabases={selectedDatabases}
                    />
                    
                    <ResultsDisplay
                        results={results}
                    />
                </div>
            </div>
            
            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}
            
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner">Loading...</div>
                </div>
            )}
        </div>
    );
};

export default App;