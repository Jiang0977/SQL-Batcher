import React, { useState } from 'react';

const ResultsDisplay = ({ results }) => {
    const [expandedRows, setExpandedRows] = useState(new Set());

    const toggleRowExpansion = (index) => {
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(index)) {
            newExpandedRows.delete(index);
        } else {
            newExpandedRows.add(index);
        }
        setExpandedRows(newExpandedRows);
    };

    if (results.length === 0) {
        return (
            <div className="panel results-display">
                <h2>Execution Results</h2>
                <p className="empty-message">No execution results yet</p>
            </div>
        );
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'error').length;

    // 渲染行数据
    const renderRowData = (rowData) => {
        if (!rowData || rowData.length === 0) return null;
        
        // 获取列名
        const columns = Object.keys(rowData[0]);
        
        return (
            <div className="row-data-container">
                <table className="row-data-table">
                    <thead>
                        <tr>
                            {columns.map(col => (
                                <th key={col}>{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rowData.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {columns.map(col => (
                                    <td key={col}>{String(row[col])}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="panel results-display">
            <h2>Execution Results</h2>
            
            <table className="results-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>Connection</th>
                        <th>Database</th>
                        <th>SQL Type</th>
                        <th>Status</th>
                        <th>Message</th>
                        <th>Rows Affected</th>
                        <th>Execution Time (ms)</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((result, index) => (
                        <React.Fragment key={index}>
                            <tr className={result.status}>
                                <td>
                                    {result.rowData && result.rowData.length > 0 && (
                                        <button 
                                            className="expand-button"
                                            onClick={() => toggleRowExpansion(index)}
                                        >
                                            {expandedRows.has(index) ? '−' : '+'}
                                        </button>
                                    )}
                                </td>
                                <td>{result.connectionName || 'Unknown'}</td>
                                <td>{result.database}</td>
                                <td>{result.sqlType || 'N/A'}</td>
                                <td>{result.status.toUpperCase()}</td>
                                <td className="message-cell">{result.message}</td>
                                <td>{result.affectedRows !== undefined ? result.affectedRows : 'N/A'}</td>
                                <td>{result.executionTime || 'N/A'}</td>
                            </tr>
                            {expandedRows.has(index) && result.rowData && (
                                <tr>
                                    <td colSpan="8">
                                        {renderRowData(result.rowData)}
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
            
            <div className="results-summary">
                Executed on {results.length} databases: {successCount} succeeded, {failureCount} failed
            </div>
        </div>
    );
};

export default ResultsDisplay;