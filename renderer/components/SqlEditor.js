import React, { useState } from 'react';

const SqlEditor = ({ onExecuteSql, selectedDatabases }) => {
    const [sql, setSql] = useState('');

    const handleExecute = () => {
        onExecuteSql(sql, selectedDatabases);
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
                <button onClick={handleExecute}>Execute SQL</button>
            </div>
            
            {selectedDatabases && selectedDatabases.length > 0 && (
                <div className="selected-databases-info">
                    <p>Selected databases: {selectedDatabases.join(', ')}</p>
                </div>
            )}
        </div>
    );
};

export default SqlEditor;