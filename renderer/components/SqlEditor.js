import React, { useState } from 'react';

const SqlEditor = ({ onExecuteSql, selectedDatabases, connections }) => {
    const [sql, setSql] = useState('');

    const handleExecute = () => {
        onExecuteSql(sql, selectedDatabases);
    };

    // 格式化显示选中的数据库信息
    const formatSelectedDatabases = (databases) => {
        return databases.map(db => {
            if (typeof db === 'string') {
                return db;
            } else if (db && db.name) {
                // 如果有连接信息，查找对应的连接名称
                if (db.connectionId && connections && connections.length > 0) {
                    const connection = connections.find(conn => conn.id === db.connectionId);
                    const connectionName = connection ? connection.name : db.connectionId;
                    return `${db.name} (${connectionName})`;
                }
                return db.name;
            }
            return 'Unknown Database';
        }).join(', ');
    };

    return (
        <div className="panel sql-editor">
            <h2>SQL Editor</h2>
            
            <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                placeholder="Enter your SQL statement here..."
            />
            
            <div className="execution-actions">
                <button id="execute-sql-btn" onClick={handleExecute}>Execute SQL</button>
            </div>
            
            {selectedDatabases && selectedDatabases.length > 0 && (
                <div className="selected-databases-info">
                    <p>Selected databases: {formatSelectedDatabases(selectedDatabases)}</p>
                </div>
            )}
        </div>
    );
};

export default SqlEditor;