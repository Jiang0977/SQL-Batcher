import React, { useState, useEffect } from 'react';
import ConnectionManager from './ConnectionManager';
import DatabaseSelector from './DatabaseSelector';
import SqlEditor from './SqlEditor';
import ResultsDisplay from './ResultsDisplay';

const App = () => {
    const [connections, setConnections] = useState([]);
    const [selectedConnections, setSelectedConnections] = useState([]); // 支持多连接选择
    const [databasesByConnection, setDatabasesByConnection] = useState({}); // 每个连接的数据库列表
    const [selectedDatabases, setSelectedDatabases] = useState([]); // 选中的数据库（包含连接信息）
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Load connections on startup
    useEffect(() => {
        loadConnections();
    }, []);

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

    const toggleConnectionSelection = async (connection) => {
        let newSelectedConnections;
        if (selectedConnections.some(c => c.id === connection.id)) {
            // 取消选择连接
            newSelectedConnections = selectedConnections.filter(c => c.id !== connection.id);
        } else {
            // 选择连接
            newSelectedConnections = [...selectedConnections, connection];
        }
        
        setSelectedConnections(newSelectedConnections);
        
        // 为新选择的连接加载数据库列表
        if (!selectedConnections.some(c => c.id === connection.id)) {
            try {
                const response = await window.electron.ipcRenderer.invoke('get-databases', connection);
                if (response.success) {
                    setDatabasesByConnection(prev => ({
                        ...prev,
                        [connection.id]: response.databases
                    }));
                }
            } catch (error) {
                showMessage(`Failed to get databases for ${connection.name}: ${error.message}`, 'error');
            }
        }
    };

    const refreshDatabases = async (connection) => {
        try {
            setLoading(true);
            const response = await window.electron.ipcRenderer.invoke('get-databases', connection);
            setLoading(false);
            
            if (response.success) {
                setDatabasesByConnection(prev => ({
                    ...prev,
                    [connection.id]: response.databases
                }));
                showMessage(`Databases loaded for ${connection.name}`, 'success');
                return true;
            } else {
                showMessage(`Failed to get databases for ${connection.name}: ${response.error}`, 'error');
                return false;
            }
        } catch (error) {
            setLoading(false);
            showMessage(`Failed to get databases for ${connection.name}: ${error.message}`, 'error');
            return false;
        }
    };

    const handleDatabaseSelectionChange = (selected) => {
        setSelectedDatabases(selected);
    };

    const executeSql = async (sql, selectedDatabases) => {
        if (selectedConnections.length === 0) {
            showMessage('Please select at least one connection', 'error');
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
            
            // 按连接分组数据库
            const databasesByConnectionId = {};
            selectedDatabases.forEach(db => {
                if (!databasesByConnectionId[db.connectionId]) {
                    databasesByConnectionId[db.connectionId] = [];
                }
                databasesByConnectionId[db.connectionId].push(db.name);
            });
            
            // 为每个连接执行SQL
            const executionPromises = Object.keys(databasesByConnectionId).map(connectionId => {
                const connection = selectedConnections.find(c => c.id === connectionId);
                const databases = databasesByConnectionId[connectionId];
                
                return window.electron.ipcRenderer.invoke('execute-sql', {
                    sql,
                    selectedDatabases: databases,
                    connection: connection
                });
            });
            
            // 等待所有执行完成
            const responses = await Promise.all(executionPromises);
            
            // 合并结果并添加连接信息
            let allResults = [];
            responses.forEach((response, index) => {
                const connection = selectedConnections[index];
                if (response.success) {
                    // 为每个结果添加连接名称
                    const resultsWithConnection = response.results.map(result => ({
                        ...result,
                        connectionName: connection.name
                    }));
                    allResults = [...allResults, ...resultsWithConnection];
                } else {
                    allResults.push({
                        database: 'N/A',
                        connectionName: connection.name,
                        status: 'error',
                        message: `Failed to execute: ${response.error}`,
                        executionTime: 0
                    });
                }
            });
            
            setLoading(false);
            setResults(allResults);
            showMessage(`Executed on ${allResults.length} database instances`, 'success');
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
                <p>Batch execute SQL statements across multiple databases and connections</p>
            </header>
            
            <div className="app-content">
                <ConnectionManager
                    connections={connections}
                    selectedConnections={selectedConnections}
                    onSelectConnection={toggleConnectionSelection}
                    onSaveConnection={saveConnection}
                    onDeleteConnection={deleteConnection}
                    onTestConnection={testConnection}
                    onLoadConnections={loadConnections}
                />
                
                <div className="main-panel">
                    <DatabaseSelector
                        databasesByConnection={databasesByConnection}
                        selectedConnections={selectedConnections}
                        onRefreshDatabases={refreshDatabases}
                        onDatabaseSelectionChange={handleDatabaseSelectionChange}
                    />
                    
                    <SqlEditor
                        onExecuteSql={executeSql}
                        selectedDatabases={selectedDatabases}
                        connections={connections}
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