const { ipcRenderer } = require('electron');

function useSearchBar() {
    var idleLogo = document.getElementById('idle-logo');
    var searchInput = document.getElementById('search');
    var playerWrapper = document.getElementById('player-wrapper');
    var cancelButton = document.getElementById('cancel-search');

    if(searchInput.style.display == 'none') {
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
        alert('Will search');
    }
}

function hideSearchBar() {
    var idleLogo = document.getElementById('idle-logo');
    var searchInput = document.getElementById('search');
    var playerWrapper = document.getElementById('player-wrapper');
    var cancelButton = document.getElementById('cancel-search');

    idleLogo.style.top = '7px';
    playerWrapper.style.borderColor = 'transparent';
    searchInput.style.opacity = '0';
    cancelButton.style.opacity = '0';
    setTimeout(function() {
        searchInput.style.display = 'none';
        cancelButton.style.display = 'none';
        searchInput.value = '';
    }, 400);
}

//volume slider

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("volume").oninput = function() {
        var value = (this.value-this.min)/(this.max-this.min)*100
        this.style.background = 'linear-gradient(to right, #a0a0a0 0%, #a0a0a0 ' + value + '%, #e0e0e0 ' + value + '%, #e0e0e0 100%)'
    };
});
