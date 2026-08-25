// Firebase Configuration (Configured for ts-agro-tech)
const firebaseConfig = {
    apiKey: "AIzaSyBXdlFSylQoTJrl1ZJVUaA-a8WfdzUWu3c",
    authDomain: "ts-agro-tech.firebaseapp.com",
    projectId: "ts-agro-tech",
    storageBucket: "ts-agro-tech.firebasestorage.app",
    messagingSenderId: "80565007300",
    appId: "1:80565007300:web:f5d4391f6ca51990e86a91",
    measurementId: "G-QHDB9JSTTL"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Application State
let globalPosts = [];
let globalReels = [];

let cropRatesList = [
    { crop: "Wheat (Hard Red)", market: "Chicago Board of Trade (USA)", price: "$235 / ton" },
    { crop: "Basmati Rice", market: "Punjab Mandi (India)", price: "₹4,200 / quintal" },
    { crop: "Soybeans", market: "Paranaguá (Brazil)", price: "$410 / ton" },
    { crop: "Corn (Yellow Grain)", market: "Rotterdam (Europe)", price: "€215 / ton" },
    { crop: "Cotton (Medium Staple)", market: "Global Futures", price: "82.5 ¢ / lb" }
];

let weatherData = {
    "Global-US": { temp: "☀️ 26°C", desc: "Clear Skies • Optimal condition for soil aeration" },
    "Global-IN": { temp: "🌧️ 29°C", desc: "Monsoon Showers • High soil moisture" },
    "Global-EU": { temp: "⛅ 22°C", desc: "Partly Cloudy • Good harvesting window" },
    "Global-BR": { temp: "🌦️ 27°C", desc: "Light afternoon rain expected" }
};

let userSession = JSON.parse(localStorage.getItem('agroglobal_user')) || null;

// Firebase Auth Observer (Syncs login state automatically)
auth.onAuthStateChanged(user => {
    if (user) {
        userSession = {
            name: user.displayName || "Farmer",
            uid: user.uid,
            email: user.email,
            photo: user.photoURL
        };
        localStorage.setItem('agroglobal_user', JSON.stringify(userSession));
        updateUserUI();
    }
});

function updateUserUI() {
    const userBadge = document.getElementById('user-badge');
    if (userBadge && userSession) {
        const firstName = userSession.name.split(' ')[0];
        userBadge.innerText = `👤 ${firstName}`;
    }
}

// Real-Time Listener: Posts
db.collection("posts").orderBy("createdAt", "desc").onSnapshot(snapshot => {
    globalPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderFeed();
}, err => console.log("Database connecting or offline...", err));

// Real-Time Listener: Reels
db.collection("reels").orderBy("createdAt", "desc").onSnapshot(snapshot => {
    globalReels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderReels();
}, err => console.log("Database connecting or offline...", err));

// Tab Navigation
function switchTab(tabId) {
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const activePanel = document.getElementById(tabId);
    if (activePanel) activePanel.classList.add('active');

    const order = ['feed', 'reels', 'rates', 'weather', 'profile'];
    const idx = order.indexOf(tabId);
    if (idx !== -1) {
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems[idx]) navItems[idx].classList.add('active');
    }
    window.scrollTo(0, 0);
}

// Render Feed Posts
function renderFeed() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    if (globalPosts.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-sub, #666); padding: 20px;">No posts yet. Be the first farmer to share an update!</p>`;
        return;
    }

    container.innerHTML = globalPosts.map(post => {
        const isOwner = userSession && userSession.uid === post.userId;
        const deleteBtn = isOwner 
            ? `<button onclick="deletePost('${post.id}')" style="background: #FEE2E2; color: #DC2626; border: none; padding: 4px 10px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 12px;">🗑️ Delete</button>` 
            : '';

        return `
            <div class="card-box">
                <div class="post-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="user-avatar">${(post.author || 'G')[0]}</div>
                        <div>
                            <strong>${post.author || 'Global Farmer'}</strong><br>
                            <small style="color: var(--text-sub, #666);">${post.time || 'Recently'}</small>
                        </div>
                    </div>
                    ${deleteBtn}
                </div>
                <p style="font-size: 14px; line-height: 1.4; margin-top: 10px;">${post.text || post.caption || ''}</p>
                ${post.media ? (post.type === 'video' ? `<video src="${post.media}" controls class="post-media" style="width:100%; border-radius:8px; margin-top:8px;"></video>` : `<img src="${post.media}" class="post-media" style="width:100%; border-radius:8px; margin-top:8px;">`) : ''}
                <div class="post-actions" style="margin-top: 10px; display: flex; gap: 15px; cursor: pointer;">
                    <span onclick="likePost('${post.id}', ${post.likes || 0})">❤️ ${post.likes || 0} Likes</span>
                    <span>💬 Comment</span>
                    <span>✈️ Share</span>
                </div>
            </div>
        `;
    }).join('');
}

function likePost(id, currentLikes) {
    db.collection("posts").doc(id).update({ likes: currentLikes + 1 });
}

// Delete Post Function
async function deletePost(id) {
    if (!userSession) return alert("Please sign in first.");
    
    if (confirm("Are you sure you want to delete this post?")) {
        try {
            await db.collection("posts").doc(id).delete();
            alert("Post deleted successfully!");
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Could not delete post: " + error.message);
        }
    }
}

// Render Agri-Reels
function renderReels() {
    const container = document.getElementById('reels-container');
    if (!container) return;

    if (globalReels.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-sub, #666); padding: 20px;">No reels uploaded yet.</p>`;
        return;
    }

    container.innerHTML = globalReels.map(reel => {
        const isOwner = userSession && userSession.uid === reel.userId;
        const deleteBtn = isOwner 
            ? `<button onclick="deleteReel('${reel.id}')" style="background: rgba(220, 38, 38, 0.8); color: white; border: none; padding: 6px 12px; border-radius: 15px; font-weight: bold; cursor: pointer; font-size: 12px;">🗑️ Delete</button>` 
            : '';

        return `
            <div class="reel-item" style="background:white; margin-bottom:15px; border-radius:10px; padding:10px;">
                <video src="${reel.videoUrl}" class="reel-video" controls style="width:100%; max-height:450px; border-radius:8px; object-fit:cover;"></video>
                <div class="reel-overlay" style="margin-top:8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3>@${reel.author || 'Farmer'}</h3>
                        ${deleteBtn}
                    </div>
                    <p style="margin-top: 6px;">${reel.caption || ''}</p>
                    <div style="margin-top: 6px; color: #d4af37; font-weight: bold;">❤️ ${reel.likes || 0} Likes</div>
                </div>
            </div>
        `;
    }).join('');
}

// Delete Reel Function
async function deleteReel(id) {
    if (!userSession) return alert("Please sign in first.");

    if (confirm("Are you sure you want to delete this reel?")) {
        try {
            await db.collection("reels").doc(id).delete();
            alert("Reel deleted successfully!");
        } catch (error) {
            console.error("Error deleting reel:", error);
            alert("Could not delete reel: " + error.message);
        }
    }
}

// Render Market Crop Rates
function renderRates(items) {
    const container = document.getElementById('rates-container');
    if (!container) return;

    container.innerHTML = items.map(item => `
        <div class="rate-row" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <div>
                <strong>${item.crop}</strong><br>
                <small style="color: var(--text-sub, #666);">${item.market}</small>
            </div>
            <div class="rate-price" style="font-weight:bold; color:#27ae60;">${item.price}</div>
        </div>
    `).join('');
}

function filterCropRates() {
    const searchInput = document.getElementById('rate-search-input');
    if (!searchInput) return;
    const query = searchInput.value.toLowerCase();
    const filtered = cropRatesList.filter(r => r.crop.toLowerCase().includes(query) || r.market.toLowerCase().includes(query));
    renderRates(filtered);
}

// Weather Updates
function updateWeatherDisplay() {
    const select = document.getElementById('weather-region-select');
    if (!select) return;
    const region = select.value;
    const w = weatherData[region];
    if (w) {
        document.getElementById('weather-temp-val').innerText = w.temp;
        document.getElementById('weather-desc-val').innerText = w.desc;
    }
}

// Modal Handlers
function openUploadModal() { 
    if (!userSession) {
        alert("Please sign in first before uploading!");
        switchTab('profile');
        return;
    }
    const modal = document.getElementById('upload-modal');
    if (modal) modal.style.display = 'flex'; 
}

function closeUploadModal() { 
    const modal = document.getElementById('upload-modal');
    if (modal) modal.style.display = 'none';
    
    const previewBox = document.getElementById('media-preview-box');
    if (previewBox) previewBox.innerHTML = '';
    
    const fileInput = document.getElementById('upload-file-input');
    if (fileInput) fileInput.value = '';
    
    const captionInput = document.getElementById('upload-caption-text');
    if (captionInput) captionInput.value = '';
}

function handleFilePreview() {
    const fileInput = document.getElementById('upload-file-input');
    const previewBox = document.getElementById('media-preview-box');
    if (!fileInput || !fileInput.files[0] || !previewBox) return;

    const file = fileInput.files[0];
    const localUrl = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
        previewBox.innerHTML = `<video src="${localUrl}" controls class="post-media" style="width:100%; max-height:200px; border-radius:8px;"></video>`;
    } else {
        previewBox.innerHTML = `<img src="${localUrl}" class="post-media" style="width:100%; max-height:200px; object-fit:cover; border-radius:8px;">`;
    }
}

// Content Publishing Handler
async function submitContent() {
    if (!userSession) {
        alert("Please sign in first!");
        return;
    }

    const typeSelect = document.getElementById('upload-type-select');
    const type = typeSelect ? typeSelect.value : 'post';
    const captionInput = document.getElementById('upload-caption-text');
    const caption = captionInput ? captionInput.value : '';
    const fileInput = document.getElementById('upload-file-input');
    const file = fileInput ? fileInput.files[0] : null;
    const submitBtn = document.getElementById('upload-submit-btn');

    if (!caption && !file) return alert('Please enter a caption or attach a file.');

    let mediaUrl = "";

    if (submitBtn) {
        submitBtn.innerText = "Publishing...";
        submitBtn.disabled = true;
    }

    try {
        if (file) {
            if (submitBtn) submitBtn.innerText = "Uploading Media...";
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'ml_default');

            const response = await fetch(`https://api.cloudinary.com/v1_1/yagsqtrh/auto/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error ? data.error.message : 'Cloudinary upload failed');
            }
            mediaUrl = data.secure_url;
        }

        if (submitBtn) submitBtn.innerText = "Saving Post...";

        const dataPayload = {
            author: userSession.name,
            userId: userSession.uid, // Owner ID stored here!
            caption: caption,
            text: caption,
            time: "Just now",
            likes: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (type === 'reel') {
            dataPayload.videoUrl = mediaUrl;
            await db.collection("reels").add(dataPayload);
            switchTab('reels');
        } else {
            dataPayload.media = mediaUrl;
            dataPayload.type = file && file.type.startsWith('video/') ? 'video' : 'image';
            await db.collection("posts").add(dataPayload);
            switchTab('feed');
        }

        closeUploadModal();
    } catch (error) {
        console.error("Publishing error:", error);
        alert("Publishing failed: " + error.message);
    } finally {
        if (submitBtn) {
            submitBtn.innerText = "Publish Live";
            submitBtn.disabled = false;
        }
    }
}

// Authentic Google Sign-In Function
// Authentic Google Sign-In with Redirect (Solves mobile popup closing)
async function signWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Force redirect flow so popups aren't blocked by mobile browsers
        await auth.signInWithRedirect(provider);
    } catch (error) {
        console.error("Auth error:", error);
        alert("Google Sign-In failed: " + error.message);
    }
}

// Automatically catch user session after Google redirects back to your site
auth.getRedirectResult().then(result => {
    if (result && result.user) {
        handleAuthSuccess(result.user);
    }
}).catch(error => {
    console.error("Redirect auth error:", error);
});

// Helper function to update session and UI
function handleAuthSuccess(user) {
    userSession = { 
        name: user.displayName || "Google Farmer", 
        uid: user.uid,
        email: user.email,
        photo: user.photoURL
    };
    localStorage.setItem('agroglobal_user', JSON.stringify(userSession));

    updateUserUI();
    alert(`Signed in successfully as ${userSession.name}!`);
    switchTab('feed');
}

// Authentication UI Switching
function switchAuthTab(mode) {
    const btnGoogle = document.getElementById('auth-btn-google');
    const btnPhone = document.getElementById('auth-btn-phone');
    const boxGoogle = document.getElementById('auth-box-google');
    const boxPhone = document.getElementById('auth-box-phone');

    if (btnGoogle) btnGoogle.className = `toggle-btn ${mode === 'google' ? 'active' : ''}`;
    if (btnPhone) btnPhone.className = `toggle-btn ${mode === 'phone' ? 'active' : ''}`;
    if (boxGoogle) boxGoogle.style.display = mode === 'google' ? 'block' : 'none';
    if (boxPhone) boxPhone.style.display = mode === 'phone' ? 'block' : 'none';
}

function handlePhoneLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const phoneInput = document.getElementById('auth-phone-num');
    const phone = phoneInput ? phoneInput.value : '0000';
    
    // Fallback for phone login (Generates temporary UID)
    userSession = { 
        name: `Farmer (${phone.slice(-4)})`,
        uid: `phone_${phone}_${Date.now()}`
    };
    localStorage.setItem('agroglobal_user', JSON.stringify(userSession));
    updateUserUI();
    alert(`Logged in successfully!`);
    switchTab('feed');
}

// App Initialization
if (userSession) updateUserUI();
renderRates(cropRatesList);
