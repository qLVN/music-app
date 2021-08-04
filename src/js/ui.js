const electron = require('electron');
const { ipcRenderer } = require('electron');
const { shell } = require('electron'); //used in html to open links

function useSearchBar() {
    var idleLogo = document.getElementById('idle-logo');
    var searchInput = document.getElementById('search');
    var playerWrapper = document.getElementById('player-wrapper');
    var cancelButton = document.getElementById('cancel-search');

    document.getElementById('playback-progress').style.opacity = 0;

    if(searchInput.style.display == 'none') {
        var playerInfo = document.getElementById('player-info');

        playerInfo.style.opacity = '0';
        setTimeout(function() {
            playerInfo.style.display = 'block';
        }, 200);

        idleLogo.style.top = '40px';
        searchInput.style.opacity = '0';
        searchInput.style.display = 'block';
        cancelButton.style.opacity = '0';
        cancelButton.style.display = 'block';
        searchInput.focus();
        playerWrapper.style.borderColor = 'rgb(255 106 122)';
        setTimeout(function() {
            searchInput.style.opacity = '1';
            cancelButton.style.opacity = '1';
        }, 0);
    } else {
        presentSearchResult(searchInput.value);
    }
}

async function searchText(text) {
    var suggestionList = document.getElementById('suggestion-list');

    if(document.getElementById('search-window').style.display == 'none') {
        toggleSearchWindow();
    } else if(text == '') {
        toggleSearchWindow();
        return;
    }

    var searchInfo = await getInfoForSearch(text);
    suggestionList.innerHTML = '';
    Object.keys(searchInfo['suggestions']).forEach(function(suggestion) {
        if(searchInfo['suggestions'][suggestion]['kind'] != 'terms') return;
        var suggestionLi = document.createElement('li');
        suggestionLi.innerHTML = '<img src="assets/search.png" /><span>' + searchInfo['suggestions'][suggestion]['displayTerm'].replace(text, '<span>' + text + '</span>') + '</span>';
        suggestionLi.setAttribute('search_term', searchInfo['suggestions'][suggestion]['searchTerm']);
        suggestionLi.setAttribute('onclick', 'presentSearchResult("' + searchInfo['suggestions'][suggestion]['searchTerm'] + '")');

        suggestionList.appendChild(suggestionLi);
    });
    var i = 0;
    Object.keys(searchInfo['suggestions']).forEach(async function(suggestion) {
        if(searchInfo['suggestions'][suggestion]['kind'] != 'topResults') return;
        i++;

        var suggestionDiv = document.createElement('div');
        if(i == 1) suggestionDiv.style.marginTop = '10px';

        var suggestionImg = document.createElement('img');
        suggestionImg.className = 'artwork';
        suggestionImg.src = searchInfo['suggestions'][suggestion]['content']['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50');
        suggestionImg.setAttribute('draggable', 'false');
        suggestionDiv.appendChild(suggestionImg);

        var suggestionTitle = document.createElement('h4');
        suggestionTitle.innerHTML = searchInfo['suggestions'][suggestion]['content']['attributes']['name'];

        var suggestionSub = document.createElement('span');
        var suggestionAdd = document.createElement('img');
        suggestionAdd.setAttribute('draggable', 'false');

        switch(searchInfo['suggestions'][suggestion]['content']['type']) {
            case 'artists':
                suggestionDiv.className = 'artist';
                suggestionSub.innerHTML = 'Artist';
                suggestionAdd.src = 'assets/arrow_right.svg';
                suggestionAdd.className = 'add go';
                suggestionDiv.setAttribute('onclick', 'presentArtist("' + searchInfo['suggestions'][suggestion]['content']['id'] + '")');
                break;
            case 'albums':
                suggestionSub.innerHTML = 'Album · ' + searchInfo['suggestions'][suggestion]['content']['attributes']['artistName'];
                suggestionAdd.src = 'assets/add.svg';
                suggestionAdd.className = 'add';
                if(await isInLibrary(searchInfo['suggestions'][suggestion]['content']['id'], 'albums')) {
                    suggestionAdd.src = 'assets/arrow_right.svg';
                    suggestionAdd.className = 'add go';
                }
                suggestionDiv.setAttribute('onclick', 'presentOnlineAlbum("' + searchInfo['suggestions'][suggestion]['content']['id'] + '")');

                var playImg = document.createElement('img');
                playImg.src = 'assets/play.svg';
                playImg.className = 'play';
                suggestionDiv.appendChild(playImg);

                suggestionImg.setAttribute('onclick', 'playAlbum("' + searchInfo['suggestions'][suggestion]['id'] + '", "' + searchInfo['suggestions'][suggestion]['content']['attributes']['artwork']['url'].replace('{w}', '40').replace('{h}', '40') + '")');
                break;
            case 'songs':
                suggestionSub.innerHTML = 'Song · ' + searchInfo['suggestions'][suggestion]['content']['attributes']['artistName'];
                suggestionAdd.src = 'assets/add.svg';
                suggestionAdd.className = 'add';
                if(await isInLibrary(searchInfo['suggestions'][suggestion]['content']['id'], 'songs')) {
                    suggestionAdd.src = 'assets/arrow_right.svg';
                    suggestionAdd.className = 'add go';
                } else {
                    suggestionAdd.setAttribute('onclick', 'queueAddSong("' + searchInfo['suggestions'][suggestion]['content']['id'] + '", this)');
                }

                suggestionDiv.setAttribute('onclick', 'presentOnlineAlbum("' + await getAlbumIdForOnlineSong(searchInfo['suggestions'][suggestion]['content']['id']) + '")');
                
                var playImg = document.createElement('img');
                playImg.src = 'assets/play.svg';
                playImg.className = 'play';
                suggestionDiv.appendChild(playImg);

                suggestionImg.setAttribute('onclick', 'playOnlineSong("' + searchInfo['suggestions'][suggestion]['content']['id'] + '", "' + searchInfo['suggestions'][suggestion]['content']['attributes']['artwork']['url'].replace('{w}', '40').replace('{h}', '40') + '")');
                break;
            default:
                return;
        }
        suggestionDiv.appendChild(suggestionTitle);
        suggestionDiv.appendChild(suggestionSub);
        suggestionDiv.appendChild(suggestionAdd);

        suggestionList.appendChild(suggestionDiv);
    });
}

function hideSearchBar() {
    var idleLogo = document.getElementById('idle-logo');
    var searchInput = document.getElementById('search');
    var playerWrapper = document.getElementById('player-wrapper');
    var cancelButton = document.getElementById('cancel-search');
    var playerInfo = document.getElementById('player-info');

    if(isSongPlaying()) {
        playerInfo.style.opacity = '0';
        playerInfo.style.display = 'block';
        setTimeout(function() {
            playerInfo.style.opacity = '1';
        }, 0);
        document.getElementById('playback-progress').style.opacity = '1';
    }

    if(!isSongPlaying()) idleLogo.style.top = '7px';
    playerWrapper.style.borderColor = 'transparent';
    searchInput.style.opacity = '0';
    cancelButton.style.opacity = '0';
    setTimeout(function() {
        searchInput.style.display = 'none';
        cancelButton.style.display = 'none';
        searchInput.value = '';
    }, 400);

    if(document.getElementById('search-window').style.display == 'block') toggleSearchWindow();
}

//volume slider / playback slider / context menu / focus tracker

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("volume").oninput = function() {
        var value = (this.value-this.min)/(this.max-this.min)*100;
        if(prefs['colorMode'] == 'dark' || prefs['colorMode'] == 'system' && systemColorMode == 'dark') {
            this.style.background = 'linear-gradient(to right, #828282 0%, #828282 ' + value + '%, #666666 ' + value + '%, #666666 100%)';
        } else {
            this.style.background = 'linear-gradient(to right, #a0a0a0 0%, #a0a0a0 ' + value + '%, #e0e0e0 ' + value + '%, #e0e0e0 100%)';
        }
        ipcRenderer.send('MusicJS', 'MusicKit.getInstance().volume = ' + this.value + ';');
        var userDataPath = dataFolderPath + "/data/userdata.json";
        var userDataContent = JSON.parse(fs.readFileSync(userDataPath, 'utf-8').toString());
        userDataContent.lastVolume = this.value;
        fs.writeFileSync(userDataPath, JSON.stringify(userDataContent, null, 4),'utf-8');
    };
    document.getElementById("playback-progress-slider").oninput = function() {
        ipcRenderer.send("MusicJS", "MusicKit.getInstance().seekToTime(" + this.value + ")");
        var value = (this.value-this.min)/(this.max-this.min)*100;
        if(prefs['colorMode'] == 'dark' || prefs['colorMode'] == 'system' && systemColorMode == 'dark') {
            this.style.background = 'linear-gradient(to right, #828282 0%, #828282 ' + value + '%, #666666 ' + value + '%, #666666 100%)';
        } else {
            this.style.background = 'linear-gradient(to right, #797979 0%, #797979 ' + value + '%, #e0e0e0 ' + value + '%, #e0e0e0 100%)';
        }
    };
    document.getElementById('search').onkeydown = function(e) {
        if(e.key === 'Enter') {
            presentSearchResult(document.getElementById('search').value);
        } else if(e.key === 'Escape') {
            hideSearchBar();
        }
    }
    $(window).click(function() {
        document.getElementById('context-menu').style.display = 'none';
        document.getElementById('context-menu').style.opacity = 0;
    });

    function onBlur() {
        document.body.className = 'is-not-focused';
    };
    function onFocus(){
        document.body.className = 'is-focused';
    };
    
    window.onfocus = onFocus;
    window.onblur = onBlur;
});

selectedNavbar = null;

function navBarSelect(id, isExtra) {
    if(isExtra != true) isExtra = false;

    selectedNavbar = id;

    var userDataPath = dataFolderPath + "/data/userdata.json";
    var userDataContent = JSON.parse(fs.readFileSync(userDataPath, 'utf-8').toString());
    if(userDataContent.isConnected != 1) { //not connected, can't switch item
        document.getElementById('nb-account').style.backgroundColor = '#e2e2e2';
        document.getElementById('c-account').style.display = 'block';
    } else {
        if(!isExtra) {
            userDataContent.lastOpenedNavbarItem = id;
            fs.writeFileSync(userDataPath, JSON.stringify(userDataContent, null, 4),'utf-8');
        } 
        $('.nb-item').each(function() {
            document.getElementById($(this).attr('id')).style.backgroundColor = 'transparent';
            document.getElementById($(this).attr('id')).style.boxShadow = 'none';
        });
        if(!isExtra) {
            if(prefs['colorMode'] == 'dark' || prefs['colorMode'] == 'system' && systemColorMode == 'dark') {
                document.getElementById('nb-' + id).style.backgroundColor = 'rgb(86 86 86)';
                document.getElementById('nb-' + id).style.boxShadow = 'rgb(23 24 25 / 20%) 0px 8px 24px';
            } else {
                document.getElementById('nb-' + id).style.backgroundColor = '#e2e2e2';
                document.getElementById('nb-' + id).style.boxShadow = 'rgba(149, 157, 165, 0.2) 0px 8px 24px';
            }
        }
        $('.c-item').each(function() {
            document.getElementById($(this).attr('id')).style.display = 'none';
        });
        document.getElementById('c-' + id).style.display = 'block';
    }
}

jQuery(window).on('resize', function() {
    var button = document.getElementById('maximize-img');

    ipcRenderer.send('app_maximize_state');
    ipcRenderer.on('app_maximize_state', (event, arg) => {
        ipcRenderer.removeAllListeners('app_maximize_state');
        if(arg.maximized) {
            button.src = 'assets/unmaximize.png';
        } else {
            button.src = 'assets/maximize.png';
        }
    });
});

function displayHeaderSong(name, artwork, artist, album, onlyTitle) {
    var playerInfo = document.getElementById('player-info');
    document.getElementById('player-name').innerText = name;
    if(!onlyTitle) {
        document.getElementById('player-sub').innerText = artist + ' — ' + album;
    } else {
        document.getElementById('player-sub').innerText = '';
    }
    document.getElementById('player-artwork').src = 'assets/loadingArtwork.png';
    setTimeout(function() {
        document.getElementById('player-artwork').src = artwork;
    }, 0);
    

    document.getElementById('idle-logo').style.top = '40px';
    playerInfo.style.opacity = '0';
    playerInfo.style.display = 'block';
    setTimeout(function() {
        playerInfo.style.opacity = '1';
        document.getElementById('playback-progress').style.opacity = '1';
    }, 0);
}

function setControlButtonsEnabled(bool) {
    if(bool) {
        document.querySelectorAll('.control-button').forEach(function(button) {
            button.style.opacity = '0.7';
        });
    }
}

function toggleQueue() {
    var queueButton = document.getElementById('queue-button');
    var queueWrapper = document.getElementById('queue-wrapper');

    if(queueButton.style.backgroundColor == 'transparent') { //was closed
        queueButton.style.backgroundColor = '#dadada';
        queueButton.style.filter = 'invert(1)';

        queueWrapper.style.display = 'block';
        queueWrapper.style.right = '-15px';
        queueWrapper.style.opacity = '0';
        setTimeout(function() {
            queueWrapper.style.right = '0px';
            queueWrapper.style.opacity = '1';
        }, 10);
    } else {
        queueButton.style.backgroundColor = 'transparent';
        queueButton.style.filter = 'unset';

        queueWrapper.style.right = '-15px';
        queueWrapper.style.opacity = '0';
        setTimeout(function() {
            queueWrapper.style.display = 'none';
        }, 200);
    }
}

async function presentAlbum(id) {
    document.getElementById('album-song-list').innerHTML = '';
    navBarSelect('album', true);
    if(document.getElementById('search-window').style.display == 'block') toggleSearchWindow();
    document.getElementById('album-loading-item').style.display = 'block';
    document.getElementById('album-show-artwork').src = 'assets/noArtwork.png';

    var albumData = await getAlbumData(id);
    document.getElementById('album-show-artwork').src = albumData['attributes']['artwork']['url'].replace('{w}', '270').replace('{h}', '270');
    document.getElementById('album-show-title').innerHTML = albumData['attributes']['name'];
    document.getElementById('album-show-artist').innerHTML = albumData['attributes']['artistName'];
    if(albumData['relationships']['artists']['data'][0]['relationships']['catalog']['data'][0] !== undefined) {
        var id = albumData['relationships']['artists']['data'][0]['relationships']['catalog']['data'][0]['id'];
    } else {
        var id = 0;
    }
    document.getElementById('album-show-artist').setAttribute('onclick', 'presentArtist("' + id + '")')
    document.getElementById('album-show-genre-date').innerHTML = albumData['attributes']['genreNames'][0] + ' · ' + albumData['attributes']['releaseDate'].substring(0, 4);

    var date = new Date(albumData['attributes']['releaseDate']);
    document.getElementById('album-releasedate').innerHTML = moment(date).format("DD MMMM YYYY");
    document.getElementById('album-counter').innerHTML = albumData['attributes']['trackCount'] + ' Song(s)';
    document.getElementById('album-copyright').innerHTML = albumData['relationships']['catalog']['data'][0]['attributes']['copyright'];

    document.getElementById('album-loading-item').style.display = 'none';

    document.getElementById('album-show-play').setAttribute('onclick', 'playAlbum("' + albumData['id'] + '", "' + albumData['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50') + '")');

    var songNumber = 0;
    Object.keys(albumData['relationships']['tracks']['data']).forEach(function(song) {
        songNumber++;
        var songLi = document.createElement('li');
        songLi.className = 'album-show-song-line';
        songLi.setAttribute('onclick', 'selectSongInAlbumShow(this)');
        songLi.setAttribute('song_id', albumData['relationships']['tracks']['data'][song]['id'])
        min = Math.floor((albumData['relationships']['tracks']['data'][song]['attributes']['durationInMillis']/1000/60) << 0),
        sec = Math.floor((albumData['relationships']['tracks']['data'][song]['attributes']['durationInMillis']/1000) % 60);
        if (sec < 10) {
            sec = '0' + sec;
        }
        songLi.innerHTML = '<img src="assets/play.svg" draggable="false" onclick="playSongFromAlbum(\'' + albumData['id'] + '\', \'' + albumData['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50') + '\', ' + (songNumber - 1) + ')" /><span class="index">' + songNumber + '</span>' + albumData['relationships']['tracks']['data'][song]['attributes']['name'] + '<i class="fas fa-ellipsis-h"></i><span class="time">' + min + ':' + sec + '</span>';
        songLi.innerHTML = songLi.innerHTML + '<svg class="playback-bars__svg" viewBox="0 0 11 11"><defs> <rect id="bar-ember34" x="0" width="2.1" y="0" height="11" rx=".25"></rect> <mask id="bar-mask-ember34"> <use href="#bar-ember34" fill="white"></use> </mask> </defs> <g mask="url(#bar-mask-ember34)"> <use class="playback-bars__bar playback-bars__bar--1" href="#bar-ember34"></use> </g> <g mask="url(#bar-mask-ember34)" transform="translate(2.9668 0)"> <use class="playback-bars__bar playback-bars__bar--2" href="#bar-ember34"></use> </g> <g mask="url(#bar-mask-ember34)" transform="translate(5.9333 0)"> <use class="playback-bars__bar playback-bars__bar--3" href="#bar-ember34"></use> </g> <g mask="url(#bar-mask-ember34)" transform="translate(8.8999 0)"> <use class="playback-bars__bar playback-bars__bar--4" href="#bar-ember34"></use> </g></svg>';

        document.getElementById('album-song-list').appendChild(songLi);
        if(songNumber == 2) {
            document.getElementById('album-show-shuffle').style.display = 'inline-block';
        } else if(songNumber < 2) {
            document.getElementById('album-show-shuffle').style.display = 'none';
        }
    });
}

async function presentOnlineAlbum(id) {
    document.getElementById('album-song-list').innerHTML = '';
    navBarSelect('album', true);
    if(document.getElementById('search-window').style.display == 'block') hideSearchBar();
    document.getElementById('album-loading-item').style.display = 'block';
    document.getElementById('album-show-artwork').src = 'assets/noArtwork.png';

    var albumData = await getOnlineAlbumData(id);
    document.getElementById('album-show-artwork').src = albumData['attributes']['artwork']['url'].replace('{w}', '270').replace('{h}', '270').replace('{f}', 'png');
    document.getElementById('album-show-title').innerHTML = albumData['attributes']['name'];
    document.getElementById('album-show-artist').innerHTML = albumData['attributes']['artistName'];
    var id = albumData['relationships']['artists']['data'][0]['id'];
    document.getElementById('album-show-artist').setAttribute('onclick', 'presentArtist("' + id + '")')
    document.getElementById('album-show-genre-date').innerHTML = albumData['attributes']['genreNames'][0] + ' · ' + albumData['attributes']['releaseDate'].substring(0, 4);

    var date = new Date(albumData['attributes']['releaseDate']);
    document.getElementById('album-releasedate').innerHTML = moment(date).format("DD MMMM YYYY");
    document.getElementById('album-counter').innerHTML = albumData['attributes']['trackCount'] + ' Song(s)';
    document.getElementById('album-copyright').innerHTML = albumData['attributes']['copyright'];

    document.getElementById('album-loading-item').style.display = 'none';

    document.getElementById('album-show-play').setAttribute('onclick', 'playAlbum("' + albumData['id'] + '", "' + albumData['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50').replace('{f}', 'png') + '")');

    var songNumber = 0;
    Object.keys(albumData['relationships']['tracks']['data']).forEach(function(song) {
        songNumber++;
        var songLi = document.createElement('li');
        songLi.className = 'album-show-song-line';
        songLi.setAttribute('onclick', 'selectSongInAlbumShow(this)');
        min = Math.floor((albumData['relationships']['tracks']['data'][song]['attributes']['durationInMillis']/1000/60) << 0),
        sec = Math.floor((albumData['relationships']['tracks']['data'][song]['attributes']['durationInMillis']/1000) % 60);
        if (sec < 10) {
            sec = '0' + sec;
        }

        songLi.innerHTML = '<img src="assets/play.svg" draggable="false" onclick="playSongFromAlbum(\'' + albumData['id'] + '\', \'' + albumData['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50').replace('{f}', 'png') + '\', ' + (songNumber - 1) + ')" /><span class="index">' + songNumber + '</span>' + albumData['relationships']['tracks']['data'][song]['attributes']['name'] + '<i class="fas fa-ellipsis-h" onclick="showContextMenu(\'media\', \'' + albumData['relationships']['tracks']['data'][song]['id'] + '\', this, true, \'songs\', \'album\')"></i><span class="time">' + min + ':' + sec + '</span>';
        songLi.innerHTML = songLi.innerHTML + '<svg class="playback-bars__svg" viewBox="0 0 11 11"><defs> <rect id="bar-ember34" x="0" width="2.1" y="0" height="11" rx=".25"></rect> <mask id="bar-mask-ember34"> <use href="#bar-ember34" fill="white"></use> </mask> </defs> <g mask="url(#bar-mask-ember34)"> <use class="playback-bars__bar playback-bars__bar--1" href="#bar-ember34"></use> </g> <g mask="url(#bar-mask-ember34)" transform="translate(2.9668 0)"> <use class="playback-bars__bar playback-bars__bar--2" href="#bar-ember34"></use> </g> <g mask="url(#bar-mask-ember34)" transform="translate(5.9333 0)"> <use class="playback-bars__bar playback-bars__bar--3" href="#bar-ember34"></use> </g> <g mask="url(#bar-mask-ember34)" transform="translate(8.8999 0)"> <use class="playback-bars__bar playback-bars__bar--4" href="#bar-ember34"></use> </g></svg>';

        document.getElementById('album-song-list').appendChild(songLi);
        if(songNumber == 2) {
            document.getElementById('album-show-shuffle').style.display = 'inline-block';
        } else if(songNumber < 2) {
            document.getElementById('album-show-shuffle').style.display = 'none';
        }
    });
}

async function presentArtist(id) {
    navBarSelect('artist', true);
    if(document.getElementById('search-window').style.display == 'block') hideSearchBar();
    document.getElementById('c-artist-loading-item').style.display = 'block';

    document.getElementById('artist-show-avatar').removeAttribute('src'); //reset avatar/heroart
    document.getElementById('artist-show-parralax').style.display = 'none';
    document.getElementById('artist-show-avatar').style.display = 'block';
    document.getElementById('artist-content').className = 'content-avatarmode';
    document.getElementById('artist-show-name').removeAttribute('style');

    var artistData = await getArtistData(id);
    
    if(artistData['attributes']['editorialArtwork']['centeredFullscreenBackground'] !== undefined) {
        var parralaxAvatar = artistData['attributes']['editorialArtwork']['centeredFullscreenBackground']['url'];
        var width = artistData['attributes']['editorialArtwork']['centeredFullscreenBackground']['width'];
        var height = artistData['attributes']['editorialArtwork']['centeredFullscreenBackground']['height'];
        document.getElementById('artist-show-parralax').src = parralaxAvatar.replace('{w}', width).replace('{h}', height).replace('{f}', 'png');
        document.getElementById('artist-show-parralax').style.display = 'block';
        document.getElementById('artist-show-avatar').style.display = 'none';
        document.getElementById('artist-content').className = 'content-heromode';
        document.getElementById('artist-show-name').style.color = 'white';
    } else if(artistData['attributes']['artwork'] !== undefined) {
        document.getElementById('artist-show-avatar').src = artistData['attributes']['artwork']['url'].replace('{w}', '190').replace('{h}', '190').replace('{f}', 'png');
        document.getElementById('artist-show-parralax').style.display = 'none';
        document.getElementById('artist-show-avatar').style.display = 'block';
        document.getElementById('artist-content').className = 'content-avatarmode';
        document.getElementById('artist-show-name').removeAttribute('style');
    } else { // no avatar
        document.getElementById('artist-show-avatar').removeAttribute('src');
        document.getElementById('artist-show-parralax').style.display = 'none';
        document.getElementById('artist-show-avatar').style.display = 'block';
        document.getElementById('artist-content').className = 'content-avatarmode';
        document.getElementById('artist-show-name').removeAttribute('style');
    }

    document.getElementById('artist-show-name').innerHTML = artistData['attributes']['name'];
    document.getElementById('c-artist-loading-item').style.display = 'none';
}

async function presentSearchResult(text) {
    navBarSelect('search', true);
    if(document.getElementById('search-window').style.display == 'block') hideSearchBar();
    document.getElementById('artist-loading-item').style.display = 'block';

    document.getElementById('top-results').style.display = 'none';
    document.getElementById('top-results-container').innerHTML = '';
    document.getElementById('artist-results').style.display = 'none';
    document.getElementById('artist-results-container').innerHTML = '';
    document.getElementById('album-results').style.display = 'none';
    document.getElementById('album-results-container').innerHTML = '';

    var searchData = await getSearchData(text);

    document.getElementById('search-results-title').innerHTML = 'Search results for "' + text + '"';

    if(searchData['top'] !== undefined) {
        document.getElementById('top-results').style.display = 'block';

        var topCounter = 0;
        Object.keys(searchData['top']['data']).forEach(async function(top) {
            topCounter++;
            if(topCounter >= 4) return;

            var topDiv = document.createElement('div');
            topDiv.setAttribute('align', 'left');

            var topClickWrapper = document.createElement('div');
            topClickWrapper.className = 'click-wrapper';

            var topArtwork = document.createElement('img');
            topArtwork.src = searchData['top']['data'][top]['attributes']['artwork']['url'].replace('{w}', '200').replace('{h}', '200').replace('{f}', 'png');
            topArtwork.className = 'artwork';
            topArtwork.setAttribute('draggable', 'false');

            var topTitle = document.createElement('h4');
            topTitle.innerHTML = searchData['top']['data'][top]['attributes']['name'];

            var topMore = document.createElement('i');
            topMore.className = 'fas fa-ellipsis-h';

            var topSub = document.createElement('span');

            topDiv.appendChild(topArtwork);

            switch(searchData['top']['data'][top]['type']) {
                case 'artists':
                    topArtwork.className = 'artwork artist';
                    topSub.innerHTML = 'Artist';
                    topClickWrapper.setAttribute('onclick', 'presentArtist("' + searchData['top']['data'][top]['id'] + '")');
                    break;
                case 'albums':
                    var playImg = document.createElement('img');
                    playImg.className = 'play';
                    playImg.setAttribute('draggable', 'false');
                    playImg.src = 'assets/play.svg';
                    topArtwork.setAttribute('onclick', 'playAlbum("' + searchData['top']['data'][top]['id'] + '", "' + searchData['top']['data'][top]['attributes']['artwork']['url'].replace('{w}', '200').replace('{h}', '200').replace('{f}', 'png') + '")')
                    topDiv.appendChild(playImg);

                    var addImg = document.createElement('img');
                    addImg.className = 'add';
                    addImg.setAttribute('draggable', 'false');
                    addImg.src = 'assets/add.svg';
                    if(await isInLibrary(searchData['top']['data'][top]['id'], 'albums')) {
                        addImg.style.display = 'none';
                        //add 'from your library'
                    }
                    topDiv.appendChild(addImg);
                    topSub.innerHTML = 'Album · ' + searchData['top']['data'][top]['attributes']['artistName'];
                    topClickWrapper.setAttribute('onclick', 'presentOnlineAlbum("' + searchData['top']['data'][top]['id'] + '")');
                    break;
                case 'songs':
                    var playImg = document.createElement('img');
                    playImg.className = 'play';
                    playImg.setAttribute('draggable', 'false');
                    playImg.src = 'assets/play.svg';
                    playImg.style.pointerEvents = 'none';
                    topArtwork.setAttribute('onclick', 'playSong("' + searchData['top']['data'][top]['id'] + '", "' + searchData['top']['data'][top]['attributes']['name'] + '", "' + topArtwork.src + '", "' + searchData['top']['data'][top]['attributes']['artistName'] + '", "' + searchData['top']['data'][top]['attributes']['artistName'] + '", ' + Math.round(searchData['top']['data'][top]['attributes']['durationInMillis']/1000) + ')')
                    topDiv.appendChild(playImg);
                    var addImg = document.createElement('img');
                    addImg.className = 'add';
                    addImg.setAttribute('draggable', 'false');
                    addImg.src = 'assets/add.svg';
                    addImg.setAttribute('onclick', 'queueAddSong("' + searchData['top']['data'][top]['id'] + '", this)');
                    if(await isInLibrary(searchData['top']['data'][top]['id'], 'songs')) {
                        addImg.style.display = 'none';
                        //add 'from your library'
                    }
                    topDiv.appendChild(addImg);
                    topSub.innerHTML = 'Song · ' + searchData['top']['data'][top]['attributes']['artistName'];
                    var albumId = searchData['top']['data'][top]['attributes']['url'];
                    albumId = albumId.split('/album/').pop();
                    albumId = albumId.split('/').pop();
                    if(albumId.includes('?')) albumId = albumId.split('?')[0];
                    topClickWrapper.setAttribute('onclick', 'presentOnlineAlbum("' + albumId + '")');
                    break;
                default:
                    return;
            }

            topDiv.appendChild(topClickWrapper);
            topDiv.appendChild(topTitle);
            topDiv.appendChild(topSub);
            topDiv.appendChild(topMore);

            document.getElementById('top-results-container').appendChild(topDiv);
        });
    }
    if(searchData['artist'] !== undefined) {
        document.getElementById('artist-results').style.display = 'block';

        var artistCounter = 0;
        Object.keys(searchData['artist']['data']).forEach(function(artist) {
            artistCounter++;
            if(artistCounter >= 11) return;

            var avatarWrapper = document.createElement('div');

            var artworkImg = document.createElement('img');
            artworkImg.src = searchData['artist']['data'][artist]['attributes']['artwork']['url'].replace('{w}', '140').replace('{h}', '140').replace('{f}', 'png');
            artworkImg.setAttribute('onclick', 'presentArtist("' + searchData['artist']['data'][artist]['id'] + '")');

            var artistSpan = document.createElement('span');
            artistSpan.innerHTML = searchData['artist']['data'][artist]['attributes']['name'];

            avatarWrapper.appendChild(artworkImg);
            avatarWrapper.appendChild(artistSpan);

            document.getElementById('artist-results-container').appendChild(avatarWrapper);
        });
    }
    if(searchData['album'] !== undefined) {
        document.getElementById('album-results').style.display = 'block';

        var albumCounter = 0;
        Object.keys(searchData['album']['data']).forEach(function(album) {
            albumCounter++;
            if(albumCounter >= 11) return;

            var avatarWrapper = document.createElement('div');
            avatarWrapper.innerHTML = '<i class="fas fa-play left" onclick="playAlbum(\'' + searchData['album']['data'][album]['id'] + '\', \'' + searchData['album']['data'][album]['attributes']['artwork']['url'].replace('{w}', '50').replace('{h}', '50').replace('{f}', 'png') + '\')"></i><i class="fas fa-ellipsis-h right"></i>';

            var artworkImg = document.createElement('img');
            artworkImg.src = searchData['album']['data'][album]['attributes']['artwork']['url'].replace('{w}', '200').replace('{h}', '200').replace('{f}', 'png');
            artworkImg.setAttribute('onclick', 'presentOnlineAlbum("' + searchData['album']['data'][album]['id'] + '")');

            var nameSpan = document.createElement('span');
            nameSpan.innerHTML = searchData['album']['data'][album]['attributes']['name'];
            nameSpan.setAttribute('onclick', 'presentOnlineAlbum("' + searchData['album']['data'][album]['id'] + '")');

            var artistSpan = document.createElement('span');
            artistSpan.className = 'lighter';
            artistSpan.innerHTML = searchData['album']['data'][album]['attributes']['artistName'];
            artistSpan.setAttribute('onclick', 'presentArtist("' + searchData['album']['data'][album]['relationships']['artists']['data'][0]['id'] + '")');

            avatarWrapper.appendChild(artworkImg);
            avatarWrapper.appendChild(nameSpan);
            avatarWrapper.appendChild(artistSpan);

            document.getElementById('album-results-container').appendChild(avatarWrapper);
        });
    }
}

function queueAddSong(id, addElement) {
    //change addElement to loading
    addSongToLibrary(id);
    addElement.src = 'assets/tick.png';
}

function toggleSearchWindow() {
    var searchWindow = document.getElementById('search-window');

    if(searchWindow.style.display == 'none') {
        searchWindow.style.display = 'block';
    } else {
        searchWindow.style.display = 'none';
    }
}

async function showContextMenu(type, id, element, online, id_type, pane) {
    //
    // online is if the item is in the library or in Apple Music
    // pane is eg. recently-added
    //
    var contextMenu = document.getElementById('context-menu');

    var addToLibrary = document.getElementById('context-menu-addlibrary');
    var removeFromLibrary = document.getElementById('context-menu-removelibrary');
    var contextMedia = document.getElementById('context-menu-media');

    addToLibrary.style.display = 'none';
    removeFromLibrary.style.display = 'none';
    contextMedia.style.display = 'none';

    document.querySelectorAll('[contexted]').forEach(function(contextedElement) {
        contextedElement.removeAttribute('contexted');
    });

    element.setAttribute('contexted', true);

    switch(type) {
        case 'media':
            contextMedia.style.display = 'block';
            if(online) {
                if(await isInLibrary(id, id_type)) {
                    removeFromLibrary.style.display = 'block';
                    removeFromLibrary.addAttribute('onclick', 'prepareRemoveItemFromLibrary("' + id + '", "' + id_type + '", "' + pane + '")'); //remove from library
                } else {
                    addToLibrary.style.display = 'block';
                }
            } else {
                removeFromLibrary.style.display = 'block';
            }
            break;
        default:
            break;
    }

    if(element.getBoundingClientRect().left > $(window).width() / 2) {
        contextMenu.style.left = element.getBoundingClientRect().left - 172 + element.getBoundingClientRect().width;
    } else {
        contextMenu.style.left = element.getBoundingClientRect().left;
    }

    if(element.getBoundingClientRect().top > $(window).height() / 2) {
        contextMenu.style.top = element.getBoundingClientRect().top - 130 + element.getBoundingClientRect().height;
    } else {
        contextMenu.style.top = element.getBoundingClientRect().top;
    }

    setTimeout(function() { //important
        contextMenu.style.display = 'block';
        setTimeout(function() {
            contextMenu.style.opacity = 1;
        }, 200);
    }, 10); //important
}

function changeAppColorMode(color) { console.log('ff');
    if(color == 'system') {
        color = systemColorMode;
    }

    var value = (document.getElementById("volume").value-document.getElementById("volume").min)/(document.getElementById("volume").max-document.getElementById("volume").min)*100;

    switch(color) {
        case 'light':
            $('.nb-item').each(function() {
                if(document.getElementById($(this).attr('id')).style.backgroundColor == 'rgb(86, 86, 86)') {
                    document.getElementById($(this).attr('id')).style.backgroundColor = 'rgb(226, 226, 226)';
                    document.getElementById($(this).attr('id')).style.boxShadow = 'rgba(149, 157, 165, 0.2) 0px 8px 24px';
                }
            });
            document.getElementById("volume").style.background = 'linear-gradient(to right, #a0a0a0 0%, #a0a0a0 ' + value + '%, #e0e0e0 ' + value + '%, #e0e0e0 100%)';
            $('link[href="css/darkmode.css"]').remove();
            break;
        case 'dark':
            $('.nb-item').each(function() {
                if(document.getElementById($(this).attr('id')).style.backgroundColor == 'rgb(226, 226, 226)') {
                    document.getElementById($(this).attr('id')).style.backgroundColor = 'rgb(86, 86, 86)';
                    document.getElementById($(this).attr('id')).style.boxShadow = 'rgba(23, 24, 25, 0.2) 0px 8px 24px';
                }
            });
            document.getElementById("volume").style.background = 'linear-gradient(to right, #828282 0%, #828282 ' + value + '%, #666666 ' + value + '%, #666666 100%)';
            $('link[href="css/darkmode.css"]').remove();
            $('head').append('<link rel="stylesheet" href="css/darkmode.css" type="text/css" />');
            break;
    }
}

function changeAppPerformanceMode(bool) {
    if(bool) { //enable
        $('style[id="performance-mode-css"]').remove();
        $('head').append('<style id="performance-mode-css">* { transition: none !important; animation: none !important; }</style>');
    } else {
        $('style[id="performance-mode-css"]').remove();
    }
}