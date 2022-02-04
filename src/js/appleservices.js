function loginToApple() {
    ipcRenderer.send('show_applemusic');
    ipcRenderer.senc('present_applemusic_login');
}