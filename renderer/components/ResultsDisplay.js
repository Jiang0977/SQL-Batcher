import React from 'react';

const ResultsDisplay = ({ results }) => {
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

    return (
        <div className="panel results-display">
            <h2>Execution Results</h2>
            
            <table className="results-table">
                <thead>
                    <tr>
                        <th>Database</th>
                        <th>Status</th>
                        <th>Message</th>
                        <th>Execution Time (ms)</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((result, index) => (
                        <tr key={index} className={result.status}>
                            <td>{result.database}</td>
                            <td>{result.status.toUpperCase()}</td>
                            <td>{result.message}</td>
                            <td>{result.executionTime || 'N/A'}</td>
                        </tr>
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