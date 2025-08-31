import React, { useState } from 'react';

const ConnectionManager = ({ 
    connections, 
    selectedConnections,
    onSelectConnection,
    onSaveConnection, 
    onDeleteConnection, 
    onTestConnection, 
    onLoadConnections 
}) => {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        type: 'mysql',
        host: '',
        port: '3306',
        username: '',
        password: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Set default port based on database type
        if (name === 'type') {
            setFormData(prev => ({
                ...prev,
                port: value === 'mysql' ? '3306' : '5432'
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const connection = {
            ...formData,
            port: parseInt(formData.port)
        };
        
        if (await onSaveConnection(connection)) {
            clearForm();
        }
    };

    const handleTestConnection = async (e) => {
        e.preventDefault();
        const connection = {
            ...formData,
            port: parseInt(formData.port)
        };
        
        await onTestConnection(connection);
    };

    const handleSelectConnection = (connection) => {
        setFormData({
            id: connection.id,
            name: connection.name,
            type: connection.type,
            host: connection.host,
            port: connection.port.toString(),
            username: connection.username,
            password: connection.password || ''
        });
        onSelectConnection(connection);
    };

    const clearForm = () => {
        setFormData({
            id: '',
            name: '',
            type: 'mysql',
            host: '',
            port: '3306',
            username: '',
            password: ''
        });
    };

    // 检查连接是否被选中
    const isConnectionSelected = (connectionId) => {
        return selectedConnections.some(c => c.id === connectionId);
    };

    return (
        <div className="panel connection-manager">
            <h2>Database Connections</h2>
            
            <form className="connection-form" onSubmit={handleSubmit}>
                <input type="hidden" name="id" value={formData.id} onChange={handleInputChange} />
                
                <div className="form-group">
                    <label htmlFor="name">Connection Name:</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter connection name"
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="type">Database Type:</label>
                    <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                    >
                        <option value="mysql">MySQL</option>
                        <option value="postgresql">PostgreSQL</option>
                    </select>
                </div>
                
                <div className="form-group">
                    <label htmlFor="host">Host:</label>
                    <input
                        type="text"
                        id="host"
                        name="host"
                        value={formData.host}
                        onChange={handleInputChange}
                        placeholder="localhost"
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="port">Port:</label>
                    <input
                        type="number"
                        id="port"
                        name="port"
                        value={formData.port}
                        onChange={handleInputChange}
                        placeholder="3306"
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="root"
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                    />
                </div>
                
                <div className="form-actions">
                    <button type="button" onClick={handleTestConnection}>Test Connection</button>
                    <button type="submit">Save Connection</button>
                    <button type="button" onClick={clearForm}>Clear</button>
                </div>
            </form>
            
            <div className="connections-list">
                <h3>Saved Connections</h3>
                {connections.length === 0 ? (
                    <p className="empty-message">No saved connections</p>
                ) : (
                    <ul>
                        {connections.map(connection => (
                            <li 
                                key={connection.id} 
                                className={`connection-item ${isConnectionSelected(connection.id) ? 'selected' : ''}`}
                                onClick={() => handleSelectConnection(connection)}
                            >
                                <div className="connection-info">
                                    <h4>{connection.name}</h4>
                                    <p>{connection.type} - {connection.host}:{connection.port}</p>
                                </div>
                                <div className="connection-actions">
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectConnection(connection);
                                    }}>Toggle</button>
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteConnection(connection.id);
                                    }}>Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ConnectionManager;