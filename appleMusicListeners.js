var playbackTime = 0;

MusicKit.getInstance().addEventListener(MusicKit.Events.playbackStateDidChange, function() {
    window.ipcRenderer.send('updatePlaybackState', MusicKit.getInstance().playbackState);
});

MusicKit.getInstance().addEventListener(MusicKit.Events.playbackTimeDidChange, function() {
    if(playbackTime == MusicKit.getInstance().currentPlaybackTime) return;

    playbackTime = MusicKit.getInstance().currentPlaybackTime;
    window.ipcRenderer.send('updatePlaybackTime', MusicKit.getInstance().currentPlaybackTime);
});

MusicKit.getInstance().addEventListener(MusicKit.Events.nowPlayingItemDidChange, function() {
    if(MusicKit.getInstance().nowPlayingItem === undefined) return;
    window.ipcRenderer.send('updateNowPlayingItem', MusicKit.getInstance().nowPlayingItem['attributes']['name'], MusicKit.getInstance().nowPlayingItem['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50'), MusicKit.getInstance().nowPlayingItem['attributes']['artistName'], MusicKit.getInstance().nowPlayingItem['attributes']['albumName'], Math.round(MusicKit.getInstance().nowPlayingItem['attributes']['durationInMillis'] / 1000), MusicKit.getInstance().nowPlayingItemIndex, MusicKit.getInstance().nowPlayingItem['id']);
});

MusicKit.getInstance().addEventListener(MusicKit.Events.queueItemsDidChange, function() {
    window.ipcRenderer.send('updateQueueItems', JSON.stringify(MusicKit.getInstance().queue['_queueItems']));
});

MusicKit.getInstance().addEventListener(MusicKit.Events.loaded, function() {
    window.ipcRenderer.send('getParams');
})