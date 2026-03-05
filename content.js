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

/*
* Apply a remote action to the video element, preventing looping conflicts with local actions.
*/
function applyRemote(fn) {
    applyingRemoteAction = true;
    try {
        fn();
    } finally {
        setTimeout(() => { 
            applyingRemoteAction = false;
        }, 500); // Increased timeout to prevent event loops
    }
}

/*
* Listen for messages from the background script to perform actions like syncing state or controlling playback.
*/
chrome.runtime.onMessage.addListener(async (msg) => {
    if (!video) return;

    if(msg.type === 'sync-state' && msg.state) {
        const { time, isPlaying, playbackRate } = msg.state;
        console.log('Received sync-state message:', msg.state);
        
        // URL navigation is handled by background.js
        applyRemote(() => {
            if (typeof time === 'number') {
                video.currentTime = time;
            }
            if (typeof playbackRate === 'number') {
                video.playbackRate = playbackRate;
            }
            isPlaying ? video.play() : video.pause();
        });
        return;
    }
    
    applyRemote(() => {
        if (msg.type === 'play') {
            console.log('Received play command', msg.state);
            // Sync time from state if available
            if (msg.state?.time !== undefined) {
                video.currentTime = msg.state.time;
            }
            if (msg.state?.playbackRate !== undefined) {
                video.playbackRate = msg.state.playbackRate;
            }
            video.play();
        } else if (msg.type === 'pause') {
            console.log('Received pause command', msg.state);
            // Sync time from state if available
            if (msg.state?.time !== undefined) {
                video.currentTime = msg.state.time;
            }
            video.pause();
        } else if (msg.type === 'seek') {
            const targetTime = msg.state?.time ?? msg.currentTime ?? msg.time;
            console.log('Received seek command to:', targetTime);
            if (typeof targetTime === 'number') {
                video.currentTime = targetTime;
            }
        } else if (msg.type === 'ratechange') {
            const targetRate = msg.state?.playbackRate ?? msg.playbackRate;
            console.log('Received rate change command to:', targetRate);
            if (typeof targetRate === 'number') {
                video.playbackRate = targetRate;
            }
        } else {
            console.warn('Received unknown message type:', msg.type);
        }
    });
});