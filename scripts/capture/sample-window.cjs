const { app, BrowserWindow } = require('electron');
const { readFileSync } = require('node:fs');

// A separate image viewer behind the application, used as the screen OCR source.
app.whenReady().then(async () => {
  const image = readFileSync(process.argv[2]).toString('base64');
  const window = new BrowserWindow({
    x: 0, y: 0, width: 1440, height: 900, frame: false,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(
    `<html><head><title>ScreenPinyin sample</title></head><body style="margin:0;overflow:hidden"><img style="display:block" width="1440" height="900" src="data:image/png;base64,${image}"></body></html>`,
  )}`);
  console.log('Sample viewer ready');
});
app.on('window-all-closed', () => app.quit());
