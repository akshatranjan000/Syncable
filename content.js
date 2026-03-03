let video = null;
let applyingRemoteAction = false;
let listenersAttached = false;

/*
* Find the video element on the page.
*/
function findVideo() {
    video = document.querySelector('video');

    if (!video) {
        console.log('No video element found, retrying in 1 second...');
        setTimeout(findVideo, 1000);
    } else {
        console.log('Video element found:', video);
        attachListeners();
    }
}

/*
* Start the process of finding the video element when the content script loads.
*/
findVideo();
function send(type) {
    if (!video || applyingRemoteAction) return;

    chrome.runtime.sendMessage({
        type,
        roomId: null,
        currentTime: video.currentTime,
        playbackRate: video.playbackRate,
        url: window.location.href
    });
    console.log(`Sent message of type: ${type}`);
}

/*
* Attach event listeners to the video element for play, pause, seek, and rate change events.
* When these events occur, send a message to the background script with the updated state.
*/
function attachListeners() {
    if (listenersAttached || !video) return;

    video.addEventListener('play', () => { send('play'); });
    video.addEventListener('pause', () => { send('pause'); });
    video.addEventListener('seeked', () => { send('seek'); });
    video.addEventListener('ratechange', () => { send('ratechange'); });
    listenersAttached = true;
}

function applyRemote(fn) {
    applyingRemoteAction = true;
    try {
        fn();
    } finally {
        setTimeout(() => { 
            applyingRemoteAction = false;
        }, 150);
    }
}

/*
* Listen for messages from the background script to perform actions like syncing state or controlling playback.
*/
chrome.runtime.onMessage.addListener((msg) => {
    if (!video) return;

    if(msg.type === 'sync-state' && msg.state) {
        const { url, time, isPlaying, playbackRate } = msg.state;

        if( window.location.href !== url ) {
            console.log('Syncing video URL to:', url);
            window.location.href = url;
            return;
        }

        applyRemote(() => {
            if (typeof time === 'number') video.currentTime = time;
            if (typeof playbackRate === 'number') video.playbackRate = playbackRate;
            isPlaying ? video.play() : video.pause();
        });
        return;
    }
    
    applyRemote(() => {
        if (msg.type === 'play') {
            console.log('Received play command');
            video.play();
        } else if (msg.type === 'pause') {
            console.log('Received pause command');
            video.pause();
        } else if (msg.type === 'seek') {
            const targetTime = msg.currentTime ?? msg.time;
            console.log('Received seek command to:', targetTime);
            if (typeof targetTime === 'number') {
                video.currentTime = targetTime;
            }
        } else if (msg.type === 'ratechange') {
            console.log('Received rate change command to:', msg.playbackRate);
            if (typeof msg.playbackRate === 'number') {
                video.playbackRate = msg.playbackRate;
            }
        } else {
            console.warn('Received unknown message type:', msg.type);
        }
    });
});