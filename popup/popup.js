const roomInput = document.getElementById('roomInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinBtn = document.getElementById('joinBtn');
const backBtn = document.getElementById('backBtn');
const leaveBtn = document.getElementById('leaveBtn');
const joinBtnText = document.getElementById('joinBtnText');
const joinLogoutIcon = document.getElementById('joinLogoutIcon');
const avatarList = document.getElementById('avatarList');
const currentAvatar = document.getElementById('currentAvatar');
const avatarOptions = document.getElementById('avatarOptions');

console.log('Elements loaded:', {
    roomInput: !!roomInput,
    createRoomBtn: !!createRoomBtn,
    joinBtn: !!joinBtn,
    backBtn: !!backBtn,
    leaveBtn: !!leaveBtn,
    currentAvatar: !!currentAvatar,
    avatarOptions: !!avatarOptions
});

let joinButtonState = 'initial'; // States: 'initial', 'awaiting-input', 'joined'
let selectedAvatar = 'bear.png'; // Default avatar

// Load saved avatar
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['userAvatar'], (result) => {
        if (result.userAvatar) {
            selectedAvatar = result.userAvatar;
            if (currentAvatar) {
                currentAvatar.src = `../assets/avatars/${selectedAvatar}`;
            }
        }
    });
}

// Avatar picker functionality
if (currentAvatar) {
    currentAvatar.addEventListener('click', function(e) {
        e.stopPropagation();
        if (avatarOptions) {
            avatarOptions.classList.toggle('show');
        }
    });
}

// Close avatar picker when clicking outside
document.addEventListener('click', function(e) {
    const avatarPicker = document.getElementById('avatarPicker');
    if (avatarPicker && !avatarPicker.contains(e.target) && avatarOptions) {
        avatarOptions.classList.remove('show');
    }
});

// Avatar selection
document.querySelectorAll('.avatar-option').forEach(option => {
    option.addEventListener('click', function() {
        selectedAvatar = this.getAttribute('data-avatar');
        if (currentAvatar) {
            currentAvatar.src = `../assets/avatars/${selectedAvatar}`;
        }
        if (avatarOptions) {
            avatarOptions.classList.remove('show');
        }
        
        // Save avatar selection
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ userAvatar: selectedAvatar });
        }
    });
});

// Function to render avatars
function renderAvatars(users) {
    avatarList.innerHTML = '';
    users.forEach(user => {
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        const avatarImg = document.createElement('img');
        avatarImg.src = `../assets/avatars/${user.avatar || 'bear.png'}`;
        avatarImg.alt = user.name;
        avatarImg.style.width = '100%';
        avatarImg.style.height = '100%';
        avatarImg.style.borderRadius = '50%';
        avatarImg.style.objectFit = 'cover';
        avatar.appendChild(avatarImg);
        avatar.title = user.name;
        avatarList.appendChild(avatar);
    });
    avatarList.classList.add('show');
}

// Check if room already exists
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['roomId'], (result) => {
        if (result.roomId) {
            roomInput.value = result.roomId;
            createRoomBtn.disabled = true;
        }
    });
}

createRoomBtn.addEventListener('click', function() {
    console.log('Create Room button clicked');
    const createBtnTextSpan = document.getElementById('createBtnText');
    const logoutIcon = document.getElementById('logoutIcon');
    console.log('createBtnTextSpan:', createBtnTextSpan);
    console.log('Current text:', createBtnTextSpan ? createBtnTextSpan.textContent : 'null');
    
    // Check if it's currently a Leave button
    if (createBtnTextSpan && createBtnTextSpan.textContent === 'Leave Room') {
        // Leave room functionality
        roomInput.value = '';
        roomInput.classList.remove('hidden');
        createRoomBtn.classList.remove('slide-left');
        createRoomBtn.classList.remove('leave-mode');
        joinBtn.classList.remove('hidden');
        
        const roomIdDisplay = document.getElementById('roomIdDisplay');
        roomIdDisplay.classList.remove('show');
        
        createBtnTextSpan.textContent = 'Create Room';
        logoutIcon.style.display = 'none';
        createRoomBtn.disabled = false;
        
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove('roomId', () => {
                console.log('Room exited');
                if (chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({ type: 'exitRoom' });
                }
            });
        }
        return;
    }
    
    // Generate a 6-digit room ID
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Creating room:', roomId);
    
    // Set the room ID in the input field
    roomInput.value = roomId;
    
    // Hide the input box if visible
    roomInput.classList.remove('visible');
    roomInput.style.display = 'none';
    
    // Hide join button
    joinBtn.classList.add('hidden');
    
    // Show room ID and leave button
    const roomIdDisplay = document.getElementById('roomIdDisplay');
    const roomIdText = document.getElementById('roomIdText');
    roomIdText.textContent = roomId;
    setTimeout(() => {
        roomIdDisplay.classList.add('show');
    }, 100);
    
    // Show leave button and hide create button
    createRoomBtn.style.display = 'none';
    leaveBtn.style.display = 'block';
    
    // Show avatars (dummy data for now - replace with real user data)
    const dummyUsers = [{ name: 'You', avatar: selectedAvatar }];
    renderAvatars(dummyUsers);
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ roomId }, () => {
            console.log('Room ID saved:', roomId);
            // Notify background script to join the room
            if (chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ type: 'joinRoom', roomId });
            }
        });
    }
});

joinBtn.addEventListener('click', function() {
    if (joinButtonState === 'initial') {
        // First click: Show input box and hide create button
        roomInput.style.display = 'block';
        setTimeout(() => {
            roomInput.classList.add('visible');
        }, 10);
        createRoomBtn.classList.add('hidden');
        createRoomBtn.style.display = 'none';
        backBtn.style.display = 'block';
        joinBtnText.textContent = 'Confirm';
        joinButtonState = 'awaiting-input';
    } else if (joinButtonState === 'awaiting-input') {
        // Second click: Join room with entered ID
        const roomId = roomInput.value.trim();
        if (roomId) {
            console.log('Joining room:', roomId);
            
            // Hide input and create button
            roomInput.classList.remove('visible');
            setTimeout(() => {
                roomInput.style.display = 'none';
            }, 500);
            backBtn.style.display = 'none';
            console.log('Hiding create button');
            createRoomBtn.classList.add('hidden');
            createRoomBtn.style.display = 'none';
            
            // Show room ID display and leave button
            const roomIdDisplay = document.getElementById('roomIdDisplay');
            const roomIdText = document.getElementById('roomIdText');
            roomIdText.textContent = roomId;
            setTimeout(() => {
                roomIdDisplay.classList.add('show');
            }, 100);
            
            // Hide join button and show leave button
            joinBtn.style.display = 'none';
            leaveBtn.style.display = 'block';
            joinButtonState = 'joined';
            
            // Show avatars (dummy data for now - replace with real user data)
            const dummyUsers = [{ name: 'You', avatar: selectedAvatar }];
            renderAvatars(dummyUsers);
            
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ roomId }, () => {
                    console.log('Room ID saved:', roomId);
                    if (chrome.runtime && chrome.runtime.sendMessage) {
                        chrome.runtime.sendMessage({ type: 'joinRoom', roomId });
                    }
                });
            }
        } else {
            alert('Please enter a room ID');
        }
    } else if (joinButtonState === 'joined') {
        // Exit room functionality
        roomInput.value = '';
        roomInput.classList.remove('visible');
        roomInput.style.display = 'none';
        createRoomBtn.classList.remove('hidden');
        createRoomBtn.style.display = '';
        
        const roomIdDisplay = document.getElementById('roomIdDisplay');
        roomIdDisplay.classList.remove('show');
        
        joinBtnText.textContent = 'Join Room';
        joinLogoutIcon.style.display = 'none';
        joinBtn.classList.remove('exit-mode');
        joinButtonState = 'initial';
        
        joinButtonState = 'initial';
        
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove('roomId', () => {
                console.log('Room exited');
                if (chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({ type: 'exitRoom' });
                }
            });
        }
    }
});

// Back button functionality
backBtn.addEventListener('click', function() {
    // Hide input box and back button
    roomInput.classList.remove('visible');
    roomInput.value = '';
    setTimeout(() => {
        roomInput.style.display = 'none';
    }, 500);
    backBtn.style.display = 'none';
    
    // Show create button
    createRoomBtn.classList.remove('hidden');
    createRoomBtn.style.display = '';
    
    // Reset join button
    joinBtnText.textContent = 'Join Room';
    joinButtonState = 'initial';
});

// Leave button functionality (unified for both create and join)
leaveBtn.addEventListener('click', function() {
    // Hide room ID display and avatars
    const roomIdDisplay = document.getElementById('roomIdDisplay');
    roomIdDisplay.classList.remove('show');
    avatarList.classList.remove('show');
    avatarList.innerHTML = '';
    
    // Reset UI to initial state
    roomInput.value = '';
    roomInput.classList.remove('visible');
    roomInput.style.display = 'none';
    backBtn.style.display = 'none';
    leaveBtn.style.display = 'none';
    createRoomBtn.classList.remove('hidden');
    createRoomBtn.classList.remove('leave-mode');
    createRoomBtn.style.display = '';
    joinBtn.classList.remove('hidden');
    joinBtn.style.display = '';
    joinBtn.classList.remove('exit-mode');
    joinBtnText.textContent = 'Join Room';
    joinLogoutIcon.style.display = 'none';
    joinButtonState = 'initial';
    
    // Reset create button
    const createBtnTextSpan = document.getElementById('createBtnText');
    const logoutIcon = document.getElementById('logoutIcon');
    createBtnTextSpan.textContent = 'Create Room';
    logoutIcon.style.display = 'none';
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove('roomId', () => {
            console.log('Room exited');
            if (chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ type: 'exitRoom' });
            }
        });
    }
});

// Copy button functionality
document.getElementById('copyBtn').addEventListener('click', function() {
    const roomIdText = document.getElementById('roomIdText').textContent;
    navigator.clipboard.writeText(roomIdText).then(() => {
        console.log('Room ID copied to clipboard');
        // Optional: Show a brief "Copied!" message
        const copyBtn = document.getElementById('copyBtn');
        const originalTitle = copyBtn.title;
        copyBtn.title = 'Copied!';
        setTimeout(() => {
            copyBtn.title = originalTitle;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
});

// Chat functionality
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatMessages = document.getElementById('chat-messages');
const voiceCallBtn = document.getElementById('voiceCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');
const chatNotch = document.getElementById('chat-notch');

// Send message function
function sendMessage() {
    const messageText = chatInput.value.trim();
    if (messageText) {
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message sent';
        messageDiv.textContent = messageText;
        chatMessages.appendChild(messageDiv);
        
        // Clear input
        chatInput.value = '';
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Here you would send the message to the server
        console.log('Message sent:', messageText);
    }
}

// Send button click
chatSendBtn.addEventListener('click', sendMessage);

// Enter key to send
chatInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Voice call button
voiceCallBtn.addEventListener('click', function() {
    console.log('Voice call initiated');
    // Add visual feedback
    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
        this.style.transform = '';
    }, 200);
    // Here you would initiate a voice call
});

// Video call button
videoCallBtn.addEventListener('click', function() {
    console.log('Video call initiated');
    // Add visual feedback
    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
        this.style.transform = '';
    }, 200);
    // Here you would initiate a video call
});

// Chat notch toggle (optional collapse/expand functionality)
let chatExpanded = true;
chatNotch.addEventListener('click', function() {
    const chatContainer = document.getElementById('chat-container');
    if (chatExpanded) {
        chatContainer.style.maxHeight = '40px';
        chatExpanded = false;
    } else {
        chatContainer.style.maxHeight = '300px';
        chatExpanded = true;
    }
});
