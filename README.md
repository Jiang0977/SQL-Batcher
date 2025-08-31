# SQL Batcher

SQL Batcher is a cross-platform desktop application for batch executing SQL statements across multiple databases. It helps database administrators and developers save time by executing the same SQL statement on multiple databases simultaneously.

## Features

- **Connection Management**: Add, edit, and delete multiple MySQL and PostgreSQL database connections
- **Database Selection**: Automatically list all databases in a connection and select multiple for batch execution
- **Multi-Connection Support**: Work with multiple database connections simultaneously
- **SQL Execution**: Execute SQL statements on multiple databases across different connections
- **Results Display**: View execution results for each database with success/failure status, execution time, and detailed data
- **Local Storage**: Save connection configurations locally with AES-256 encryption for sensitive data
- **SQL History**: Keep track of previously executed SQL statements for quick reuse
- **Multi-Database Support**: Works with both MySQL and PostgreSQL databases
- **Enhanced UI**: Modern, responsive interface with improved styling and custom scrollbars
- **Detailed Execution Results**: View row data for SELECT statements and affected rows count for modification queries

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/SQL-Batcher.git
   ```

2. Navigate to the project directory:
   ```
   cd SQL-Batcher
   ```

3. Install dependencies:
   ```
   npm install
   ```

## Usage

1. Start the application in development mode:
   ```
   npm start
   ```

2. Or build and run the production version:
   ```
   npm run build
   ```

3. Add a new database connection:
   - Fill in the connection details (name, type, host, port, username, password)
   - Click "Test Connection" to verify the connection
   - Click "Save Connection" to save the connection

4. Select databases for execution:
   - Select one or more saved connections from the list
   - Click "Refresh Databases" to load the database list for each connection
   - Check the databases you want to execute SQL on

5. Execute SQL:
   - Enter your SQL statement in the editor
   - Click "Execute SQL" to run the statement on all selected databases
   - View detailed results in the results panel with success/failure status, execution time, and data

## Development

This project is built with:
- **Electron** - Cross-platform desktop application framework
- **Node.js** - JavaScript runtime
- **React** - Frontend UI library
- **MySQL2** - MySQL client for Node.js
- **pg** - PostgreSQL client for Node.js
- **Webpack** - Module bundler
- **Jest** - Testing framework

### Project Structure

```
SQL-Batcher/
├── main.js              # Electron main process
├── package.json         # Project configuration
├── README.md            # This file
├── webpack.config.js    # Webpack configuration
├── renderer/            # Renderer process (UI)
│   ├── index.html       # Main HTML file
│   ├── css/             # Stylesheets
│   ├── js/              # JavaScript files
│   │   ├── bundle.js    # Bundled React app
│   │   └── components/  # React components
│   └── components/      # React components (source)
├── src/                 # Backend modules
│   └── database/        # Database related modules
├── data/                # Local data storage
│   └── connections.json # Connection configurations
└── test/                # Test files
```

### Development Scripts

- `npm start` - Start the application in development mode
- `npm run dev` - Start the application in development mode
- `npm run build` - Build the application for production
- `npm test` - Run unit tests
- `npm run test:watch` - Run unit tests in watch mode
- `npm run build:react` - Build the React frontend
- `npm run dev:react` - Build the React frontend in watch mode

## Building for Production

To build the application for distribution:

```
npm run build
```

This will create distributable packages in the `dist/` directory for Windows, macOS, and Linux.

## Security

- Passwords are encrypted using AES-256-CBC before being stored locally
- Communication between the renderer and main processes is handled securely through Electron's IPC mechanism

## Recent Improvements

### UI/UX Enhancements
- Modern, responsive design with improved visual hierarchy
- Custom styled scrollbars for better aesthetics
- Enhanced SQL editor with larger text area
- Improved connection and database selection interface

### Functionality Improvements
- Multi-connection support for simultaneous operations across different database servers
- Detailed execution results with row data visualization for SELECT statements
- Connection name display in database selection and results for better clarity
- Enhanced error handling and user feedback

### Performance Optimizations
- Improved state management for better application responsiveness
- Optimized database connection handling
- Efficient result processing and display

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.