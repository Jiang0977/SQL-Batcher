const MAX_PREVIEW_ROWS = 5;

function normalizeLineBreaks(value) {
    return String(value ?? '').replace(/\r\n?/g, '\n');
}

function formatInlineText(value, fallback = 'N/A') {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    return normalizeLineBreaks(value).replace(/\n+/g, ' / ').trim();
}

function escapeMarkdownTableCell(value) {
    if (value === undefined || value === null) {
        return '';
    }

    return normalizeLineBreaks(value)
        .replace(/\\/g, '\\\\')
        .replace(/\|/g, '\\|')
        .replace(/\n/g, '<br>');
}

function formatRowDataTable(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return '';
    }

    const previewRows = rows.slice(0, MAX_PREVIEW_ROWS);
    const columns = Array.from(
        previewRows.reduce((set, row) => {
            Object.keys(row || {}).forEach((key) => set.add(key));
            return set;
        }, new Set())
    );

    if (columns.length === 0) {
        return '';
    }

    const header = `| ${columns.join(' | ')} |`;
    const divider = `| ${columns.map(() => '---').join(' | ')} |`;
    const body = previewRows
        .map((row) => `| ${columns.map((col) => escapeMarkdownTableCell(row[col])).join(' | ')} |`)
        .join('\n');

    return [header, divider, body].join('\n');
}

function getCodeFence(text) {
    const matches = normalizeLineBreaks(text).match(/`+/g) || [];
    const longestRun = matches.reduce((max, match) => Math.max(max, match.length), 0);
    return '`'.repeat(Math.max(3, longestRun + 1));
}

function formatCodeBlock(text, language = '') {
    const content = normalizeLineBreaks(text);
    const fence = getCodeFence(content);
    return `${fence}${language}\n${content}\n${fence}`;
}

function buildExecutionResultsMarkdown({ results = [], lastSql = '', exportedAt = new Date() } = {}) {
    const executionResults = Array.isArray(results) ? results : [];
    const successCount = executionResults.filter((result) => result.status === 'success').length;
    const failureCount = executionResults.filter((result) => result.status === 'error').length;
    const exportedAtText = exportedAt instanceof Date && !Number.isNaN(exportedAt.valueOf())
        ? exportedAt.toISOString()
        : new Date().toISOString();
    const lines = [
        '# SQL Batcher 查询结果',
        `导出时间：${exportedAtText}`,
        `总执行：${executionResults.length}，成功：${successCount}，失败：${failureCount}`,
        '> 失败的数据库与语句已在本文件中省略。',
        '## 原始 SQL',
        formatCodeBlock(lastSql || '（无）', 'sql')
    ];

    if (executionResults.length === 0) {
        lines.push('## 结果', '本次暂无任何结果。');
        return lines.join('\n\n');
    }

    const successfulResults = executionResults.filter((result) => result.status === 'success');
    if (successfulResults.length === 0) {
        lines.push('## 结果', '本次执行无成功结果，已省略具体条目。');
        return lines.join('\n\n');
    }

    successfulResults.forEach((result, resultIndex) => {
        lines.push(
            `## 数据库 #${resultIndex + 1}`,
            `- 连接：${formatInlineText(result.connectionName, 'Unknown')}`,
            `- 数据库：${formatInlineText(result.database)}`,
            `- SQL 类型：${formatInlineText(result.sqlType)}`,
            `- 执行耗时：${formatInlineText(result.executionTime, 'N/A')} ms`,
            `- 影响行数：${result.affectedRows !== undefined ? result.affectedRows : 'N/A'}`
        );

        if (!Array.isArray(result.statements) || result.statements.length === 0) {
            return;
        }

        const successStatements = result.statements.filter((statement) => statement.status === 'success');
        if (successStatements.length === 0) {
            return;
        }

        lines.push('### 语句明细');
        successStatements.forEach((statement) => {
            lines.push(
                `- #${statement.index} | 类型：${formatInlineText(statement.sqlType)} | 耗时：${formatInlineText(statement.executionTime, 'N/A')} ms | 影响行数：${statement.affectedRows !== undefined ? statement.affectedRows : 'N/A'}`,
                formatCodeBlock(statement.sql || '', 'sql'),
                `消息：${formatInlineText(statement.message, 'OK')}`
            );

            if (Array.isArray(statement.rowData) && statement.rowData.length > 0) {
                lines.push(
                    `行数据预览（最多 ${MAX_PREVIEW_ROWS} 行）：`,
                    formatRowDataTable(statement.rowData)
                );
            }
        });
    });

    return lines.join('\n\n');
}

module.exports = {
    MAX_PREVIEW_ROWS,
    buildExecutionResultsMarkdown,
    escapeMarkdownTableCell,
    formatCodeBlock,
    formatRowDataTable
};
