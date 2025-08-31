const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { executeSqlOnDatabases, getDatabaseList, testConnection } = require('./src/database/executor');
const { saveConnection, getConnections, deleteConnection, updateConnection } = require('./src/database/connectionManager');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'renderer/js/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Open the DevTools for debugging
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for database operations
ipcMain.handle('execute-sql', async (event, { sql, selectedDatabases, connection }) => {
  try {
    const results = await executeSqlOnDatabases(sql, selectedDatabases, connection);
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-databases', async (event, connection) => {
  try {
    const databases = await getDatabaseList(connection);
    return { success: true, databases };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-connection', async (event, connection) => {
  try {
    const result = await testConnection(connection);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handlers for connection management
ipcMain.handle('save-connection', async (event, connection) => {
  try {
    const result = await saveConnection(connection);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-connections', async () => {
  try {
    const connections = await getConnections();
    return { success: true, connections };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-connection', async (event, id) => {
  try {
    const result = await deleteConnection(id);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-connection', async (event, connection) => {
  try {
    const result = await updateConnection(connection);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});