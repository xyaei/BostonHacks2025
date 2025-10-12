// desktop-app/main.js - CLICKABLE PET + MANUAL/AUTO POPUP

const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

let petWindow;
let popupWindow = null;

function createPetWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    petWindow = new BrowserWindow({
        width: 180,
        height: 180,
        x: width - 200,
        y: height - 200,

        frame: false,
        transparent: false,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,

        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    petWindow.loadFile('pet.html');

    petWindow.on('closed', () => {
        petWindow = null;
    });

    console.log('✅ Pet widget created (clickable)');
}

function createInterventionPopup(data) {
    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.focus();
        popupWindow.webContents.send('threat-data', data);
        console.log('📤 Updated existing popup');
        return;
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    popupWindow = new BrowserWindow({
        width: 600,
        height: 700,
        x: Math.floor((width - 600) / 2),
        y: Math.floor((height - 700) / 2),

        frame: false,
        alwaysOnTop: true,
        resizable: false,

        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    popupWindow.loadFile('intervention.html');

    popupWindow.webContents.on('did-finish-load', () => {
        console.log('📤 Sending data to popup:', data.isThreat ? 'THREAT' : 'MANUAL');
        popupWindow.webContents.send('threat-data', data);
    });

    popupWindow.on('closed', () => {
        popupWindow = null;
        console.log('❌ Popup closed');
    });

    console.log('✅ Popup opened:', data.isThreat ? 'AUTO (threat)' : 'MANUAL (user click)');
}

ipcMain.on('show-intervention', (event, data) => {
    console.log('🚨 IPC: show-intervention');
    createInterventionPopup(data);
});

ipcMain.on('close-popup', () => {
    console.log('❌ IPC: close-popup');
    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.close();
    }
});

ipcMain.on('start-conversation', () => {
    console.log('💬 IPC: start-conversation');
});

app.whenReady().then(() => {
    console.log('🚀 Creating pet widget...');
    createPetWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createPetWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

console.log('✅ CyberPet initialized');
console.log('🔌 Backend: ws://localhost:8000/ws');
console.log('🖱️ Click the pet to view stats!');