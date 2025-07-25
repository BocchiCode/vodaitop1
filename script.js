document.addEventListener('DOMContentLoaded', () => {
    // --- KHAI BÁO BIẾN ---
    const firebaseConfig = {
      apiKey: "AIzaSyC1tip6vXpVovrCv7MvJ8T_dFK-kono_HI",
      authDomain: "vodaichecked.firebaseapp.com",
      projectId: "vodaichecked",
      storageBucket: "vodaichecked.firebasestorage.app",
      messagingSenderId: "348944149446",
      appId: "1:348944149446:web:2df862792219da3a8920c7",
      measurementId: "G-TEXV6RQ1GV"
    };

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app');
    const grid = document.getElementById('champion-grid');
    const searchInput = document.getElementById('search-input');
    const userInfoDiv = document.getElementById('user-info');
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // Lấy các vùng chứa mới
    const leftSidebar = document.getElementById('left-sidebar');
    const userInfoDropdown = document.getElementById('user-info-dropdown');
    
    const progressTierIcon = document.getElementById('progress-tier-icon');
    const progressCurrent = document.getElementById('progress-current');
    const progressNextGoal = document.getElementById('progress-next-goal');
    const progressBar = document.getElementById('progress-bar');

    let allChampionsData = {};
    let currentUser = null;
    let latestVersion = '';

    const tiers = [
        { name: 'Unranked', vietnameseName: 'Chưa xếp hạng', threshold: 0, icon: 'https://raw.githubusercontent.com/Mar-Es/lol-challenges/main/src/assets/images/Challenge_Tokens/602002_IRON.png' },
        { name: 'Iron', vietnameseName: 'Sắt', threshold: 3, icon: 'https://ddragon.leagueoflegends.com/cdn/img/challenges-images/602002-IRON.png' },
        { name: 'Bronze', vietnameseName: 'Đồng', threshold: 6, icon: 'https://ddragon.leagueoflegends.com/cdn/img/challenges-images/602002-BRONZE.png' },
        { name: 'Silver', vietnameseName: 'Bạc', threshold: 12, icon: 'https://ddragon.leagueoflegends.com/cdn/img/challenges-images/602002-SILVER.png' },
        { name: 'Gold', vietnameseName: 'Vàng', threshold: 20, icon: 'https://ddragon.leagueoflegends.com/cdn/img/challenges-images/602002-GOLD.png' },
        { name: 'Platinum', vietnameseName: 'Bạch Kim', threshold: 32, icon: 'https://ddragon.leagueoflegends.com/cdn/img/challenges-images/602002-PLATINUM.png' },
        { name: 'Diamond', vietnameseName: 'Kim Cương', threshold: 45, icon: 'https://ddragon.leagueoflegends.com/cdn/img/challenges-images/602002-DIAMOND.png' },
        { name: 'Master', vietnameseName: 'Cao Thủ', threshold: 60, icon: 'https://ddragon.leagueoflegends.com/cdn/img/challenges-images/602002-MASTER.png' }
    ];

    userInfoDropdown.appendChild(userInfoDiv);

    // 4. HÀM LẮNG NGHE TRẠNG THÁI ĐĂNG NHẬP
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loginContainer.style.display = 'none';
            appContainer.style.display = 'block';
            leftSidebar.style.display = 'flex'; // Hiện sidebar trái
            userEmailSpan.textContent = user.email;

            renderChampions().then(() => {
                loadState(user.uid);
            });

        } else {
            currentUser = null;
            loginContainer.style.display = 'flex';
            appContainer.style.display = 'none';
            leftSidebar.style.display = 'none'; // Ẩn sidebar trái
        }
    });

    // 5. CÁC HÀM XỬ LÝ SỰ KIỆN
    registerForm.addEventListener('submit', e => { e.preventDefault(); auth.createUserWithEmailAndPassword(document.getElementById('register-email').value, document.getElementById('register-password').value).then(cred => registerForm.reset()).catch(err => alert(err.message)); });
    loginForm.addEventListener('submit', e => { e.preventDefault(); auth.signInWithEmailAndPassword(document.getElementById('login-email').value, document.getElementById('login-password').value).then(cred => loginForm.reset()).catch(err => alert(err.message)); });
    logoutButton.addEventListener('click', () => auth.signOut());
    grid.addEventListener('click', e => { if (!currentUser) return; const item = e.target.closest('.champion-item'); if (item) { item.classList.toggle('completed'); saveState(currentUser.uid); } });
    searchInput.addEventListener('input', handleSearch);

    // 6. CÁC HÀM CƠ BẢN
    function saveState(userId) {
        if (!userId) return;
        const completedChampions = [];
        document.querySelectorAll('.champion-item.completed').forEach(item => { completedChampions.push(item.dataset.name); });
        db.collection('users').doc(userId).set({ completed: completedChampions }).then(() => { updateProgressTracker(); });
    }

    function loadState(userId) {
        if (!userId) return;
        db.collection('users').doc(userId).get().then(doc => {
            if (doc.exists) {
                const completed = new Set(doc.data().completed || []);
                document.querySelectorAll('.champion-item').forEach(item => {
                    item.classList.toggle('completed', completed.has(item.dataset.name));
                });
            }
            updateProgressTracker();
        });
    }

    function handleSearch() {
        const query = searchInput.value.toLowerCase().trim();
        const allItems = document.querySelectorAll('.champion-item');
        allItems.forEach(item => {
            const championName = item.title.toLowerCase();
            if (championName.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    function updateProgressTracker() {
        if (!progressCurrent) return;
        const count = document.querySelectorAll('.champion-item.completed').length;
        let currentTier = tiers[0];
        let nextTier = tiers[1];
        for (let i = tiers.length - 1; i >= 0; i--) {
            if (count >= tiers[i].threshold) {
                currentTier = tiers[i];
                nextTier = tiers[i + 1] || currentTier;
                break;
            }
        }
        const progressTierName = document.getElementById('progress-tier-name');
        progressTierIcon.src = currentTier.icon;
        progressTierIcon.alt = currentTier.vietnameseName;
        progressTierName.textContent = currentTier.vietnameseName.toUpperCase();
        progressTierName.className = `tier-name tier-${currentTier.name.toLowerCase()}`;
        progressCurrent.textContent = count;
        if (currentTier.threshold === nextTier.threshold) {
            progressNextGoal.textContent = currentTier.threshold;
            progressBar.style.width = '100%';
        } else {
            progressNextGoal.textContent = nextTier.threshold;
            const progressInTier = count - currentTier.threshold;
            const tierRange = nextTier.threshold - currentTier.threshold;
            const percentage = (progressInTier / tierRange) * 100;
            progressBar.style.width = `${percentage}%`;
        }
    }
    
    // 7. HÀM RENDER TƯỚNG
    async function renderChampions() {
        if (Object.keys(allChampionsData).length > 0) {} 
        else {
            grid.innerHTML = '<p>Đang tải...</p>';
            try {
                const versionsResponse = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
                const versions = await versionsResponse.json();
                latestVersion = versions[0];
                const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
                const json = await response.json();
                allChampionsData = json.data;
            } catch (error) {
                grid.innerHTML = '<p style="color: red;">Lỗi tải danh sách tướng.</p>';
                return;
            }
        }
        
        grid.innerHTML = '';
        const championNames = Object.keys(allChampionsData).sort();
        for (const name of championNames) {
            const champData = allChampionsData[name];
            const item = document.createElement('div');
            item.className = 'champion-item';
            item.dataset.name = champData.id;
            item.title = champData.name;
            const iconDiv = document.createElement('div');
            iconDiv.className = 'champion-icon';
            iconDiv.style.backgroundImage = `url(https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/sprite/${champData.image.sprite})`;
            iconDiv.style.backgroundPosition = `-${champData.image.x}px -${champData.image.y}px`;
            const nameSpan = document.createElement('span');
            nameSpan.className = 'champion-name';
            nameSpan.textContent = champData.name;
            item.appendChild(iconDiv);
            item.appendChild(nameSpan);
            grid.appendChild(item);
        }
    }
});