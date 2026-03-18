import React, { useState } from 'react';
import { buildExecutionResultsMarkdown } from '../../src/export/markdownExport';

const ResultsDisplay = ({ results, lastSql, onExportMarkdown }) => {
    const [expandedDbRows, setExpandedDbRows] = useState(new Set());
    const [expandedStmtRows, setExpandedStmtRows] = useState(new Set());

    const toggleDbExpansion = (index) => {
        const next = new Set(expandedDbRows);
        if (next.has(index)) next.delete(index); else next.add(index);
        setExpandedDbRows(next);
    };

    const toggleStmtExpansion = (dbIndex, stmtIndex) => {
        const key = `${dbIndex}-${stmtIndex}`;
        const next = new Set(expandedStmtRows);
        if (next.has(key)) next.delete(key); else next.add(key);
        setExpandedStmtRows(next);
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

    const handleExport = async () => {
        if (typeof onExportMarkdown !== 'function') return;
        const markdown = buildExecutionResultsMarkdown({ results, lastSql });
        await onExportMarkdown(markdown);
    };

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

    const renderStatementsTable = (statements, dbIndex) => {
        if (!Array.isArray(statements) || statements.length === 0) return null;
        return (
            <div className="statements-container">
                <table className="row-data-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>#</th>
                            <th>SQL Type</th>
                            <th>Status</th>
                            <th>Message</th>
                            <th>Rows Affected</th>
                            <th>Execution Time (ms)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {statements.map((s, sIdx) => (
                            <React.Fragment key={sIdx}>
                                <tr className={s.status}>
                                    <td>
                                        {s.rowData && s.rowData.length > 0 && (
                                            <button 
                                                className="expand-button"
                                                onClick={() => toggleStmtExpansion(dbIndex, sIdx)}
                                            >
                                                {expandedStmtRows.has(`${dbIndex}-${sIdx}`) ? '−' : '+'}
                                            </button>
                                        )}
                                    </td>
                                    <td>{s.index}</td>
                                    <td>{s.sqlType || 'N/A'}</td>
                                    <td>{s.status?.toUpperCase?.() || 'N/A'}</td>
                                    <td className="message-cell">{s.message}</td>
                                    <td>{s.affectedRows !== undefined ? s.affectedRows : 'N/A'}</td>
                                    <td>{s.executionTime || 'N/A'}</td>
                                </tr>
                                {expandedStmtRows.has(`${dbIndex}-${sIdx}`) && s.rowData && (
                                    <tr>
                                        <td colSpan="7">
                                            {renderRowData(s.rowData)}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="panel results-display">
            <div className="results-header">
                <h2>Execution Results</h2>
                <button className="export-btn" onClick={handleExport}>
                    Export Markdown
                </button>
            </div>
            
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
                                    {Array.isArray(result.statements) && result.statements.length > 0 && (
                                        <button 
                                            className="expand-button"
                                            onClick={() => toggleDbExpansion(index)}
                                        >
                                            {expandedDbRows.has(index) ? '−' : '+'}
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
                            {expandedDbRows.has(index) && Array.isArray(result.statements) && result.statements.length > 0 && (
                                <tr>
                                    <td colSpan="8">
                                        {renderStatementsTable(result.statements, index)}
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
