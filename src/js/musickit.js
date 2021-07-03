var playbackState = 0;
var queueItems;

function playSong(id, name, artwork, artist, album, duration) {
    var playbackSlider = document.getElementById('playback-progress-slider');

    displayHeaderSong(name, artwork, artist, album, "loading");
    ipcRenderer.send('MusicJS', 'MusicKit.getInstance().playMediaItem(new MusicKit.MediaItem({ id: "' + id + '" }));');
    
    playbackSlider.setAttribute('max', duration);
    playbackSlider.value = 0;
}

function playOnlineSong(id, artwork) {
    if(document.getElementById('search-window').style.display == 'block') hideSearchBar();
    displayHeaderSong('Loading...', artwork, '', 'assets', "loading");
    ipcRenderer.send('MusicJS', 'MusicKit.getInstance().setQueue({ song: "' + id + '" }).then(function() { MusicKit.getInstance().play(); });');
}

function playAlbum(id, artwork) {
    displayHeaderSong('Loading...', artwork, '', 'assets', "loading");
    ipcRenderer.send('MusicJS', 'MusicKit.getInstance().setQueue({ album: "' + id + '" }).then(function() { MusicKit.getInstance().play(); });');
}

function playSongFromAlbum(id, artwork, index) {
    displayHeaderSong('Loading...', artwork, '', 'assets', "loading");
    ipcRenderer.send('MusicJS', 'MusicKit.getInstance().setQueue({ album: "' + id + '" }).then(function() { MusicKit.getInstance().changeToMediaAtIndex(' + index + '); });');
}

function playPauseSong() {
    var playPauseButton = document.getElementById('playpause-button');

    if(playbackState == 3) {
        ipcRenderer.send('MusicJS', 'MusicKit.getInstance().play();');
        playPauseButton.src = 'assets/pause.svg';
    } else {
        ipcRenderer.send('MusicJS', 'MusicKit.getInstance().pause();');
        playPauseButton.src = 'assets/play.svg';    }
}

function isSongPlaying() {
    var end;
    switch(playbackState) {
        case 0:
            end = false;
            break;
        case 1:
            end = true;
            break;
        case 2:
            end = true;
            break;
        case 3:
            end = true;
            break;
        case 4:
            end = false;
            break;
        case 5:
            end = false;
            break;
        case 6:
            end = false;
            break;
        case 7:
            end = false;
            break;
        case 8:
            end = false;
            break;
        case 9:
            end = false;
            break;
        case 10:
            end = false;
            break;
    }

    return end;
}

function setPlaybackState(state) {
    // 0: "none"
    // 1: "loading"
    // 2: "playing"
    // 3: "paused"
    // 4: "stopped"
    // 5: "ended"
    // 6: "seeking"
    // 8: "waiting"
    // 9: "stalled"
    // 10: "completed"
    playbackState = state;

    var playbackSlider = document.getElementById('playback-progress-slider');
    var playPauseButton = document.getElementById('playpause-button');
    var playbackWrapper = document.getElementById('playback-progress');
    var playerInfo = document.getElementById('player-info');

    if(state == 1) { //loading
        document.getElementById('playback-progress-loading').style.opacity = '1';
    } else {
        document.getElementById('playback-progress-loading').style.opacity = '0';
    }

    switch(state) {
        case 0:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            document.getElementById('idle-logo').style.top = '7px';
            break;
        case 1:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            playPauseButton.src = 'assets/pause.svg';
            playerInfo.style.opacity = '1';
            playerInfo.style.display = 'block';
            playbackWrapper.style.opacity = 1;
            document.getElementById('idle-logo').style.top = '40px';
            break;
        case 2:
            setControlButtonsEnabled(true);
            playbackSlider.style.opacity = 1;
            playPauseButton.src = 'assets/pause.svg';
            playerInfo.style.opacity = '1';
            playerInfo.style.display = 'block';
            playbackWrapper.style.opacity = 1;
            document.getElementById('idle-logo').style.top = '40px';
            break;
        case 3:
            setControlButtonsEnabled(true);
            playbackSlider.style.opacity = 1;
            document.getElementById('idle-logo').style.top = '40px';
            break;
        case 4:
            setControlButtonsEnabled(false);
            document.getElementById('idle-logo').style.top = '7px';
            playerInfo.style.opacity = '0';
            setTimeout(function() {
                playerInfo.style.display = 'none';
            }, 200);
            playbackSlider.style.opacity = 0;
            playbackWrapper.style.opacity = 0;
            break;
        case 5:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            document.getElementById('idle-logo').style.top = '7px';
            break;
        case 6:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            document.getElementById('idle-logo').style.top = '7px';
            break;
        case 7:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            document.getElementById('idle-logo').style.top = '7px';
            break;
        case 8:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            document.getElementById('idle-logo').style.top = '7px';
            break;
        case 9:
            // setControlButtonsEnabled(false);
            // playbackSlider.style.opacity = 0;
            // document.getElementById('idle-logo').style.top = '7px';
            break;
        case 10:
            setControlButtonsEnabled(false);
            playbackSlider.style.opacity = 0;
            document.getElementById('idle-logo').style.top = '7px';
            break;
    }
}

function setPlaybackTime(time) {
    var playbackSlider = document.getElementById('playback-progress-slider');
    playbackSlider.value = time;
    var value = (playbackSlider.value-playbackSlider.min)/(playbackSlider.max-playbackSlider.min)*100;
    playbackSlider.style.background = 'linear-gradient(to right, #797979 0%, #797979 ' + value + '%, #e0e0e0 ' + value + '%, #e0e0e0 100%)';
}

function setQueueItems(items) {
    queueItems = items;

    document.getElementById('queue-song-list').innerHTML = '';

    var i = 0;
    Object.keys(items).forEach(function(song) {
        i++;
        var songLi = document.createElement('li');
        songLi.className = 'queue-song-line';
        songLi.setAttribute('onclick', 'selectSongInQueue(this)')

        min = Math.floor((items[song]['item']['attributes']['durationInMillis']/1000/60) << 0),
        sec = Math.floor((items[song]['item']['attributes']['durationInMillis']/1000) % 60);
        if (sec < 10) {
            sec = '0' + sec;
        }
        songLi.innerHTML = '<img src="' + items[song]['item']['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50') + '" /><span class="title">' + items[song]['item']['attributes']['name'] + '</span><span class="artist">' + items[song]['item']['attributes']['artistName'] + '</span><span class="time">' + min + ':' + sec + '</span><i class="fas fa-ellipsis-h"></i';
        document.getElementById('queue-song-list').appendChild(songLi);
    });

    if(!!document.getElementById('queue-clear')) document.getElementById('queue-clear').remove();

    if(i <= 1) {
        document.getElementById('queue-nosongs').style.display = 'block';
        document.getElementById('queue-upnext').style.display = 'none';
    } else {
        document.getElementById('queue-nosongs').style.display = 'none';
        document.getElementById('queue-upnext').style.display = 'block';

        var clearQueue = document.createElement('span');
        clearQueue.innerHTML = 'Clear';
        clearQueue.id = 'queue-clear';
        clearQueue.setAttribute('onclick', 'ipcRenderer.send("MusicJS", "MusicKit.getInstance().clearQueue();");');
        document.getElementById('queue-wrapper').appendChild(clearQueue);
    }
}

var nowPlayingItem;

function setNowPlayingItem(name, artwork, artist, album, duration, index) {
    nowPlayingItem = { name: name, artwork: artwork, artist: artist, album: album, index: index };

    var playerInfo = document.getElementById('player-info');
    document.getElementById('player-name').innerText = name;
    document.getElementById('player-sub').innerText = artist + ' — ' + album;
    document.getElementById('player-artwork').src = 'assets/loadingArtwork.png';
    setTimeout(function() {
        document.getElementById('player-artwork').src = artwork;
    }, 0);

    index++;
    var i = 1;
    document.querySelectorAll('.queue-song-line').forEach(function(queueSong) {
        if(i <= index) {
            queueSong.style.display = 'none';
        } else {
            queueSong.style.display = 'block';
        }
        i++;
    });

    document.getElementById('playback-progress-slider').setAttribute('max', duration);
    
    playerInfo.style.opacity = '1';
}

function toggleShuffle(button, customValue) {
    if(customValue !== undefined) {
        var button = document.getElementById('shuffle-button');
        switch(customValue) {
            case 0:
                button.className = 'side';
                ipcRenderer.send("MusicJS", "MusicKit.getInstance().shuffleMode = 0;");
                break;
            case 1:
                button.className = 'side selected';
                ipcRenderer.send("MusicJS", "MusicKit.getInstance().shuffleMode = 1;");
                break;
        }
        return;
    }

    var userDataPath = dataFolderPath + "/data/userdata.json";
    var userDataContent = JSON.parse(fs.readFileSync(userDataPath, 'utf-8').toString());

    if(button.className.includes('selected')) {
        button.className = 'side';
        ipcRenderer.send("MusicJS", "MusicKit.getInstance().shuffleMode = 0;");
        userDataContent.lastShuffleMode = 0;
    } else {
        button.className = 'side selected';
        ipcRenderer.send("MusicJS", "MusicKit.getInstance().shuffleMode = 1;");
        userDataContent.lastShuffleMode = 1;
    }

    fs.writeFileSync(userDataPath, JSON.stringify(userDataContent, null, 4),'utf-8');
}

function changeRepeatMode(button, customValue) {
    var actualRepeatMode = document.getElementById('repeat-button').getAttribute('repeat_mode');

    if(customValue !== undefined) {
        var button = document.getElementById('repeat-button');
        switch (customValue) {
            case 0:
                button.setAttribute('repeat_mode', '0');
                button.className = 'side';
                button.src = 'assets/repeat.svg';
                ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 0;");
                break;
            case 1:
                button.setAttribute('repeat_mode', '1');
                button.className = 'side selected';
                button.src = 'assets/repeatOne.svg';
                ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 1;");
                break;
            case 2:
                button.setAttribute('repeat_mode', '2');
                button.className = 'side selected';
                button.src = 'assets/repeat.svg';
                ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 2;");
                break;
                    
        }

        return;
    }

    //0: no repeat
    //2: repeat
    //1: repeat one-time

    var userDataPath = dataFolderPath + "/data/userdata.json";
    var userDataContent = JSON.parse(fs.readFileSync(userDataPath, 'utf-8').toString());

    switch(actualRepeatMode) {
        case '0': // -> 2
            button.setAttribute('repeat_mode', '2');
            button.className = 'side selected';
            button.src = 'assets/repeat.svg';
            ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 2;");
            userDataContent.lastRepeatMode = 2;
            break;
        case '2': // -> 1
            button.setAttribute('repeat_mode', '1');
            button.className = 'side selected';
            button.src = 'assets/repeatOne.svg';
            ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 1;");
            userDataContent.lastRepeatMode = 1;
            break;
        case '1': // -> 0
            button.setAttribute('repeat_mode', '0');
            button.className = 'side';
            button.src = 'assets/repeat.svg';
            ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 0;");
            userDataContent.lastRepeatMode = 0;
            break;
        default: //if undefined -> 2
            button.setAttribute('repeat_mode', '2');
            button.className = 'side selected';
            button.src = 'assets/repeat.svg';
            ipcRenderer.send("MusicJS", "MusicKit.getInstance().repeatMode  = 2;");
            userDataContent.lastRepeatMode = 2;
            break;
    }

    fs.writeFileSync(userDataPath, JSON.stringify(userDataContent, null, 4),'utf-8');
}