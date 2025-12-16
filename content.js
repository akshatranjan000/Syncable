let video;

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

findVideo();

function attachListeners() {
    video.addEventListener('play', () => {
        console.log('Video played');
        chrome.runtime.sendMessage({ type: 'play' });
    });
    
    video.addEventListener('pause', () => {
        console.log('Video paused');
        chrome.runtime.sendMessage({ type: 'pause' });
    });

    video.addEventListener('seeked', () => {
        console.log('Video seeked to:', video.currentTime);
        chrome.runtime.sendMessage({ type: 'seek', time: video.currentTime });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!video) return;

    if (message.type === 'play') {
        console.log('Received play command');
        video.play();
    } else if (message.type === 'pause') {
        console.log('Received pause command');
        video.pause();
    } else if (message.type === 'seek') {
        console.log('Received seek command to:', message.time);
        video.currentTime = message.time;
    }
});