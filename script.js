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

    // 4. HÀM LẮNG NGHE TRẠNG THÁI ĐĂNG NHẬP
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            userInfoDiv.style.display = 'block';
            loginRegisterFormsDiv.style.display = 'none';
            userEmailSpan.textContent = user.email;

            renderChampions().then(() => {
                loadState(user.uid);
            });

        } else {
            currentUser = null;
            userInfoDiv.style.display = 'none';
            loginRegisterFormsDiv.style.display = 'block';
            grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Vui lòng đăng nhập để xem tiến trình.</p>';
        }
    });

    // 5. CÁC HÀM XỬ LÝ SỰ KIỆN
    registerForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log('Đăng ký thành công!', userCredential.user);
                registerForm.reset();
            })
            .catch(error => alert('Lỗi Đăng Ký: ' + error.message));
    });

    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log('Đăng nhập thành công!', userCredential.user);
                loginForm.reset();
            })
            .catch(error => alert('Lỗi Đăng Nhập: ' + error.message));
    });

    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => console.log('Đã đăng xuất.'));
    });

    grid.addEventListener('click', e => {
        if (!currentUser) return;
        const item = e.target.closest('.champion-item');
        if (!item) return;
        item.classList.toggle('completed');
        saveState(currentUser.uid);
    });

    // === PHẦN THÊM MỚI 1: KÍCH HOẠT HÀM TÌM KIẾM ===
    searchInput.addEventListener('input', handleSearch);


    // 6. HÀM LƯU VÀ TẢI DỮ LIỆU
    function saveState(userId) {
        if (!userId) return;
        const completedChampions = [];
        document.querySelectorAll('.champion-item.completed').forEach(item => {
            completedChampions.push(item.dataset.name);
        });
        db.collection('users').doc(userId).set({ completed: completedChampions })
            .then(() => console.log('Lưu tiến trình thành công!'))
            .catch(error => console.error('Lỗi khi lưu:', error));
    }

    function loadState(userId) {
        if (!userId) return;
        db.collection('users').doc(userId).get()
            .then(doc => {
                if (doc.exists) {
                    const completed = new Set(doc.data().completed || []);
                    document.querySelectorAll('.champion-item').forEach(item => {
                        item.classList.toggle('completed', completed.has(item.dataset.name));
                    });
                } else {
                    console.log('Không có dữ liệu cũ.');
                }
            })
            .catch(error => console.error('Lỗi khi tải:', error));
    }

    // === PHẦN THÊM MỚI 2: HÀM LOGIC ĐỂ TÌM KIẾM ===
    function handleSearch() {
        const query = searchInput.value.toLowerCase().trim();
        const allItems = document.querySelectorAll('.champion-item');

        allItems.forEach(item => {
            // Lấy tên tướng từ thuộc tính 'data-name' mà chúng ta đã gán lúc render
            const championName = item.dataset.name.toLowerCase();

            // Kiểm tra nếu tên tướng chứa cụm từ tìm kiếm
            if (championName.includes(query)) {
                item.style.display = 'block'; // Hiển thị nếu khớp
            } else {
                item.style.display = 'none'; // Ẩn đi nếu không khớp
            }
        });
    }

    // 7. HÀM RENDER TƯỚNG
    async function renderChampions() {
        if (Object.keys(allChampionsData).length === 0) {
            grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Đang tải danh sách tướng...</p>';
            try {
                const versionsResponse = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
                const versions = await versionsResponse.json();
                latestVersion = versions[0];
                console.log("Phiên bản game mới nhất:", latestVersion);

                const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
                const json = await response.json();
                allChampionsData = json.data;

            } catch (error) {
                grid.innerHTML = '<p style="color: red; text-align: center; grid-column: 1 / -1;">Lỗi tải danh sách tướng.</p>';
                console.error("Lỗi khi fetch:", error);
                return;
            }
        }
        
        grid.innerHTML = '';
        const championNames = Object.keys(allChampionsData).sort();
        for (const name of championNames) {
            const champData = allChampionsData[name];
            
            const item = document.createElement('div');
            item.className = 'champion-item';
            item.dataset.name = champData.id; // Gán tên tướng vào đây để hàm search sử dụng
            item.title = champData.name;

            const iconDiv = document.createElement('div');
            iconDiv.className = 'champion-icon';
            iconDiv.style.backgroundImage = `url(https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/sprite/${champData.image.sprite})`;
            iconDiv.style.backgroundPosition = `-${champData.image.x}px -${champData.image.y}px`;
            
            item.appendChild(iconDiv);
            grid.appendChild(item);
        }
    }
});