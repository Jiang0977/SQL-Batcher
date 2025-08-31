import React, { useState } from 'react';

const DatabaseSelector = ({ databases, selectedConnection, onRefreshDatabases, onDatabaseSelectionChange }) => {
    const [selectedDatabases, setSelectedDatabases] = useState([]);

    const handleRefresh = () => {
        if (selectedConnection) {
            onRefreshDatabases(selectedConnection);
        }
    };

    const handleSelectAll = () => {
        if (selectedDatabases.length === databases.length) {
            // Deselect all
            setSelectedDatabases([]);
            onDatabaseSelectionChange([]);
        } else {
            // Select all
            const allDatabases = databases.map(db => db);
            setSelectedDatabases(allDatabases);
            onDatabaseSelectionChange(allDatabases);
        }
    };

    const handleDatabaseToggle = (database) => {
        let newSelectedDatabases;
        if (selectedDatabases.includes(database)) {
            newSelectedDatabases = selectedDatabases.filter(db => db !== database);
        } else {
            newSelectedDatabases = [...selectedDatabases, database];
        }
        setSelectedDatabases(newSelectedDatabases);
        onDatabaseSelectionChange(newSelectedDatabases);
    };

    return (
        <div className="panel database-selector">
            <h2>Database Selection</h2>
            
            <div className="database-actions">
                <button onClick={handleRefresh} disabled={!selectedConnection}>
                    Refresh Databases
                </button>
                <button onClick={handleSelectAll} disabled={databases.length === 0}>
                    {selectedDatabases.length === databases.length ? 'Deselect All' : 'Select All'}
                </button>
            </div>
            
            <div className="database-list-container">
                {databases.length === 0 ? (
                    <p className="empty-message">
                        {selectedConnection ? 'No databases found' : 'Please select a connection first'}
                    </p>
                ) : (
                    <ul>
                        {databases.map(database => (
                            <li key={database} className="database-item">
                                <input
                                    type="checkbox"
                                    id={`db-${database}`}
                                    checked={selectedDatabases.includes(database)}
                                    onChange={() => handleDatabaseToggle(database)}
                                />
                                <label htmlFor={`db-${database}`}>{database}</label>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            <div className="selection-summary">
                Selected: {selectedDatabases.length} of {databases.length} databases
            </div>
        </div>
    );
};

export default DatabaseSelector;