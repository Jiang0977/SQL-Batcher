// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        invoke: (channel, data) => {
            // Whitelist channels
            let validChannels = [
                'execute-sql',
                'get-databases',
                'test-connection',
                'save-connection',
                'get-connections',
                'delete-connection',
                'update-connection'
            ];
            if (validChannels.includes(channel)) {
                return ipcRenderer.invoke(channel, data);
            }
        },
        on: (channel, func) => {
            let validChannels = [];
            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender` 
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        }
    }
});