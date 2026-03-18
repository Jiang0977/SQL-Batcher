const { MAX_PREVIEW_ROWS, buildExecutionResultsMarkdown } = require('../src/export/markdownExport');

describe('markdown export', () => {
    it('escapes multiline table cells and expands code fences for embedded backticks', () => {
        const markdown = buildExecutionResultsMarkdown({
            lastSql: "SELECT 1;\n```sql\nDROP TABLE users;\n```",
            exportedAt: new Date('2026-03-18T08:00:00.000Z'),
            results: [
                {
                    status: 'success',
                    connectionName: 'Main\nReplica',
                    database: 'analytics',
                    sqlType: 'SELECT',
                    executionTime: 12,
                    affectedRows: 1,
                    statements: [
                        {
                            index: 1,
                            status: 'success',
                            sqlType: 'SELECT',
                            executionTime: 12,
                            affectedRows: 1,
                            sql: "SELECT '```'",
                            message: 'Line 1\nLine 2',
                            rowData: [
                                { note: 'hello\nworld', value: 'a|b' }
                            ]
                        }
                    ]
                }
            ]
        });

        expect(markdown).toContain('````sql');
        expect(markdown).toContain('- 连接：Main / Replica');
        expect(markdown).toContain('消息：Line 1 / Line 2');
        expect(markdown).toContain('| hello<br>world | a\\|b |');
    });

    it('omits failed entries and limits exported row previews', () => {
        const markdown = buildExecutionResultsMarkdown({
            lastSql: 'SELECT * FROM t;',
            exportedAt: new Date('2026-03-18T09:00:00.000Z'),
            results: [
                {
                    status: 'success',
                    connectionName: 'Primary',
                    database: 'app_db',
                    sqlType: 'SELECT',
                    executionTime: 18,
                    affectedRows: 6,
                    statements: [
                        {
                            index: 1,
                            status: 'success',
                            sqlType: 'SELECT',
                            executionTime: 18,
                            affectedRows: 6,
                            sql: 'SELECT * FROM t;',
                            message: 'OK',
                            rowData: Array.from({ length: MAX_PREVIEW_ROWS + 1 }, (_, idx) => ({
                                id: idx + 1,
                                text: `row${idx + 1}`
                            }))
                        },
                        {
                            index: 2,
                            status: 'error',
                            sqlType: 'DELETE',
                            executionTime: 3,
                            affectedRows: 0,
                            sql: 'DELETE FROM t;',
                            message: 'boom'
                        }
                    ]
                },
                {
                    status: 'error',
                    connectionName: 'Secondary',
                    database: 'audit_db',
                    sqlType: 'DELETE',
                    executionTime: 7,
                    affectedRows: 0,
                    message: 'permission denied'
                }
            ]
        });

        expect(markdown).toContain('总执行：2，成功：1，失败：1');
        expect(markdown).toContain('> 失败的数据库与语句已在本文件中省略。');
        expect(markdown).not.toContain('Secondary');
        expect(markdown).not.toContain('DELETE FROM t;');
        expect(markdown).toContain('| 5 | row5 |');
        expect(markdown).not.toContain('| 6 | row6 |');
    });
});
