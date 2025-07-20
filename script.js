document.addEventListener('DOMContentLoaded', () => {
    // 1. MÃ CẤU HÌNH FIREBASE
    const firebaseConfig = {
      apiKey: "AIzaSyC1tip6vXpVovrCv7MvJ8T_dFK-kono_HI",
      authDomain: "vodaichecked.firebaseapp.com",
      projectId: "vodaichecked",
      storageBucket: "vodaichecked.firebasestorage.app",
      messagingSenderId: "348944149446",
      appId: "1:348944149446:web:2df862792219da3a8920c7",
      measurementId: "G-TEXV6RQ1GV"
    };

    // 2. KHỞI TẠO CÁC DỊCH VỤ FIREBASE
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // 3. LẤY CÁC THÀNH PHẦN GIAO DIỆN
    const grid = document.getElementById('champion-grid');
    const searchInput = document.getElementById('search-input');
    const userInfoDiv = document.getElementById('user-info');
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const loginRegisterFormsDiv = document.getElementById('login-register-forms');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    let allChampionsData = {};
    let currentUser = null;
    let latestVersion = '';
    let championStats = {};
    let tooltip;

    // 4. HÀM LẮNG NGHE TRẠNG THÁI ĐĂNG NHẬP
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            userInfoDiv.style.display = 'block';
            loginRegisterFormsDiv.style.display = 'none';
            userEmailSpan.textContent = user.email;

            renderChampions().then(() => {
                loadState(user.uid);
                fetchArenaStats(); 
            });

        } else {
            currentUser = null;
            userInfoDiv.style.display = 'none';
            loginRegisterFormsDiv.style.display = 'block';
            grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Vui lòng đăng nhập để xem tiến trình.</p>';
        }
    });

    // 5. CÁC HÀM XỬ LÝ SỰ KIỆN
    registerForm.addEventListener('submit', e => { e.preventDefault(); auth.createUserWithEmailAndPassword(document.getElementById('register-email').value, document.getElementById('register-password').value).then(cred => registerForm.reset()).catch(err => alert(err.message)); });
    loginForm.addEventListener('submit', e => { e.preventDefault(); auth.signInWithEmailAndPassword(document.getElementById('login-email').value, document.getElementById('login-password').value).then(cred => loginForm.reset()).catch(err => alert(err.message)); });
    logoutButton.addEventListener('click', () => auth.signOut());
    searchInput.addEventListener('input', handleSearch);
    grid.addEventListener('click', e => { if (!currentUser) return; const item = e.target.closest('.champion-item'); if (item) { item.classList.toggle('completed'); saveState(currentUser.uid); } });

    grid.addEventListener('mouseover', e => {
        const item = e.target.closest('.champion-item');
        if (!item || !tooltip) return;

        const championKey = allChampionsData[item.dataset.name].key;
        const stats = championStats[championKey];
        
        if (stats) {
            tooltip.innerHTML = `
                <h4>${stats.name}</h4>
                <p><strong>Tier:</strong> <span class="tier-${stats.tier.toLowerCase().replace('+', '-plus')}">${stats.tier}</span></p>
                <p><strong>Tỉ lệ thắng:</strong> ${stats.winRate}%</p>
                <p><strong>Tỉ lệ chọn:</strong> ${stats.pickRate}%</p>
                <p><strong>Tỉ lệ cấm:</strong> ${stats.banRate}%</p>
            `;
        } else {
            tooltip.innerHTML = `<h4>${item.title}</h4><p>Đang tải hoặc không có dữ liệu chỉ số.</p>`;
        }

        const rect = item.getBoundingClientRect();
        tooltip.style.display = 'block';
        tooltip.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
    });

    grid.addEventListener('mouseout', () => {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    });

    // 6. CÁC HÀM CƠ BẢN
    function saveState(userId) { if (!userId) return; const data = []; document.querySelectorAll('.champion-item.completed').forEach(i => data.push(i.dataset.name)); db.collection('users').doc(userId).set({ completed: data }); }
    function loadState(userId) { if (!userId) return; db.collection('users').doc(userId).get().then(doc => { if (doc.exists) { const completed = new Set(doc.data().completed || []); document.querySelectorAll('.champion-item').forEach(i => i.classList.toggle('completed', completed.has(i.dataset.name))); } }); }
    function handleSearch() { const q = searchInput.value.toLowerCase().trim(); document.querySelectorAll('.champion-item').forEach(i => { const n = i.title.toLowerCase(); i.style.display = n.includes(q) ? 'flex' : 'none'; }); }

    function createTooltip() {
        if (document.getElementById('champion-tooltip')) return;
        tooltip = document.createElement('div');
        tooltip.id = 'champion-tooltip';
        document.body.appendChild(tooltip);
    }

    async function fetchArenaStats() {
        try {
            console.log("Bắt đầu tải dữ liệu chỉ số từ METAsrc...");
            const statsResponse = await fetch('/.netlify/functions/getArenaStats');
            const statsData = (await statsResponse.json()).data;
            
            for (const key in statsData) {
                const champ = statsData[key];
                championStats[champ.id] = {
                    name: champ.name,
                    tier: champ.tier_label,
                    winRate: champ.statistics.win_rate.toFixed(2),
                    pickRate: champ.statistics.pick_rate.toFixed(2),
                    banRate: champ.statistics.ban_rate.toFixed(2),
                };
            }
            console.log("Tải dữ liệu chỉ số thành công!");
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu chỉ số từ METAsrc:", error);
        }
    }

    // 7. HÀM RENDER TƯỚNG
    async function renderChampions() {
        if (Object.keys(allChampionsData).length === 0) {
            grid.innerHTML = '<p>Đang tải danh sách tướng...</p>';
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
        createTooltip();
    }
});