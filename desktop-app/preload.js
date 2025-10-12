// desktop-app/preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // 1. Send threat data from PetDisplay.jsx to main.js to open the popup
    showIntervention: (threatData) => {
        ipcRenderer.send('show-intervention', threatData);
    },

    // 2. Send close request from InterventionPopup.jsx to main.js
    closePopup: () => {
        ipcRenderer.send('close-popup');
    },

    // 3. Listen for incoming threat data (used inside InterventionPopup.jsx)
    onThreatData: (callback) => {
        // Remove existing listeners before adding a new one to prevent duplication
        ipcRenderer.removeAllListeners('threat-data');
        ipcRenderer.on('threat-data', (event, data) => callback(data));
    },

    // 4. Communication for starting the conversation/chat view (used inside InterventionPopup.jsx)
    startConversation: () => {
        ipcRenderer.send('start-conversation');
    }
});