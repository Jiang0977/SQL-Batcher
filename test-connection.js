const { testConnection, getDatabaseList } = require('./src/database/executor');

async function test() {
    const connectionConfig = {
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'password'
    };
    
    try {
        console.log('Testing connection...');
        const result = await testConnection(connectionConfig);
        console.log('Connection test result:', result);
        
        if (result) {
            console.log('Getting database list...');
            const databases = await getDatabaseList(connectionConfig);
            console.log('Database list:', databases);
        }
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

test();