const roomInput = document.getElementById('roomInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinBtn = document.getElementById('joinBtn');
const joinBtnText = joinBtn.querySelector('.button_text');

// Check if room already exists
chrome.storage.local.get(['roomId'], (result) => {
    if (result.roomId) {
        roomInput.value = result.roomId;
        createRoomBtn.disabled = true;
        joinBtnText.textContent = 'Exit Room';
    }
});

createRoomBtn.addEventListener('click', function() {
    // Generate a 6-digit room ID
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Creating room:', roomId);
    
    // Set the room ID in the input field
    roomInput.value = roomId;
    
    // Disable the Create Room button
    createRoomBtn.disabled = true;
    
    // Change Join Room to Exit Room
    joinBtnText.textContent = 'Exit Room';
    
    chrome.storage.local.set({ roomId }, () => {
        console.log('Room ID saved:', roomId);
    });
});

joinBtn.addEventListener('click', function() {
    if (joinBtnText.textContent === 'Exit Room') {
        // Exit room functionality
        roomInput.value = '';
        createRoomBtn.disabled = false;
        joinBtnText.textContent = 'Join Room';
        chrome.storage.local.remove('roomId', () => {
            console.log('Room exited');
        });
    } else {
        // Join room functionality
        const roomId = roomInput.value;
        if (roomId) {
            console.log('Joining room:', roomId);
            createRoomBtn.disabled = true;
            joinBtnText.textContent = 'Exit Room';
            chrome.storage.local.set({ roomId }, () => {
                console.log('Room ID saved:', roomId);
            });
        }
    }
});