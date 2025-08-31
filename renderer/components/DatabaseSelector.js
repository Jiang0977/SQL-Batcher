import React, { useState } from 'react';

const DatabaseSelector = ({ databasesByConnection, selectedConnections, onRefreshDatabases, onDatabaseSelectionChange }) => {
    const [selectedDatabases, setSelectedDatabases] = useState([]);

    // 刷新指定连接的数据库
    const handleRefresh = (connection) => {
        onRefreshDatabases(connection);
    };

    // 选择/取消选择所有数据库
    const handleSelectAll = (connectionId, databases) => {
        const connectionDatabases = databases.map(db => ({
            name: db,
            connectionId: connectionId
        }));
        
        // 检查是否所有数据库都已选中
        const allSelected = connectionDatabases.every(db => 
            selectedDatabases.some(selected => 
                selected.name === db.name && selected.connectionId === db.connectionId
            )
        );
        
        let newSelectedDatabases;
        if (allSelected) {
            // 取消选择所有
            newSelectedDatabases = selectedDatabases.filter(selected => 
                !connectionDatabases.some(db => 
                    selected.name === db.name && selected.connectionId === db.connectionId
                )
            );
        } else {
            // 选择所有（避免重复）
            newSelectedDatabases = [...selectedDatabases];
            connectionDatabases.forEach(db => {
                if (!newSelectedDatabases.some(selected => 
                    selected.name === db.name && selected.connectionId === db.connectionId
                )) {
                    newSelectedDatabases.push(db);
                }
            });
        }
        
        setSelectedDatabases(newSelectedDatabases);
        onDatabaseSelectionChange(newSelectedDatabases);
    };

    // 切换单个数据库的选择状态
    const handleDatabaseToggle = (database, connectionId) => {
        const databaseIdentifier = {
            name: database,
            connectionId: connectionId
        };
        
        let newSelectedDatabases;
        const isSelected = selectedDatabases.some(db => 
            db.name === databaseIdentifier.name && db.connectionId === databaseIdentifier.connectionId
        );
        
        if (isSelected) {
            // 取消选择
            newSelectedDatabases = selectedDatabases.filter(db => 
                !(db.name === databaseIdentifier.name && db.connectionId === databaseIdentifier.connectionId)
            );
        } else {
            // 选择
            newSelectedDatabases = [...selectedDatabases, databaseIdentifier];
        }
        
        setSelectedDatabases(newSelectedDatabases);
        onDatabaseSelectionChange(newSelectedDatabases);
    };

    // 检查数据库是否被选中
    const isDatabaseSelected = (database, connectionId) => {
        return selectedDatabases.some(db => 
            db.name === database && db.connectionId === connectionId
        );
    };

    // 获取选中数据库的总数
    const getTotalSelectedCount = () => {
        return selectedDatabases.length;
    };

    // 获取所有数据库的总数
    const getTotalDatabaseCount = () => {
        let count = 0;
        Object.values(databasesByConnection).forEach(databases => {
            count += databases.length;
        });
        return count;
    };

    return (
        <div className="panel database-selector">
            <h2>Database Selection</h2>
            
            <div className="database-list-container">
                {selectedConnections.length === 0 ? (
                    <p className="empty-message">Please select at least one connection</p>
                ) : (
                    Object.keys(databasesByConnection).map(connectionId => {
                        const connection = selectedConnections.find(c => c.id === connectionId);
                        const databases = databasesByConnection[connectionId] || [];
                        
                        // 只显示已选择的连接的数据库
                        if (!connection) return null;
                        
                        return (
                            <div key={connectionId} className="connection-database-group">
                                <div className="connection-header">
                                    <h3>{connection.name}</h3>
                                    <div className="connection-actions">
                                        <button 
                                            onClick={() => handleRefresh(connection)}
                                            className="refresh-btn"
                                        >
                                            Refresh
                                        </button>
                                        <button 
                                            onClick={() => handleSelectAll(connectionId, databases)}
                                            className="select-all-btn"
                                            disabled={databases.length === 0}
                                        >
                                            {databases.every(db => isDatabaseSelected(db, connectionId)) ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                </div>
                                
                                {databases.length === 0 ? (
                                    <p className="empty-message">No databases found</p>
                                ) : (
                                    <ul className="database-list">
                                        {databases.map(database => (
                                            <li key={`${connectionId}-${database}`} className="database-item">
                                                <input
                                                    type="checkbox"
                                                    id={`db-${connectionId}-${database}`}
                                                    checked={isDatabaseSelected(database, connectionId)}
                                                    onChange={() => handleDatabaseToggle(database, connectionId)}
                                                />
                                                <label htmlFor={`db-${connectionId}-${database}`}>{database}</label>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
            
            <div className="selection-summary">
                Selected: {getTotalSelectedCount()} of {getTotalDatabaseCount()} databases
            </div>
        </div>
    );
};

export default DatabaseSelector;