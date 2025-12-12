import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    addDoc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    serverTimestamp,
    query,
    where,
    updateDoc,
    deleteDoc // [수정] 누락된 import 추가
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDGmwk9FtwnjUKcH4T6alvMWVQqbhVrqfI",
    authDomain: "abyss-suicide-co.firebaseapp.com",
    projectId: "abyss-suicide-co",
    storageBucket: "abyss-suicide-co.appspot.com",
    messagingSenderId: "711710259422",
    appId: "1:711710259422:web:3c5ba7c93edb3d6d6baa4f"
};

// 탭 설정
const TABS = [
    { id: 'main', title: '메인' },
    { id: 'staff', title: '직원' },
    { id: 'me', title: '내 상태' },
    { id: 'map', title: '맵' },
    { id: 'dex', title: '도감' }
];

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM 요소 참조
const header = document.getElementById('header');
// const mainApp = document.getElementById('mainApp'); // 사용되지 않음
const navEl = document.getElementById('nav');
const contentEl = document.getElementById('content');
const logOutEl = document.getElementById('log-out');
const nowTimeEl = document.getElementById('nowTime');
// const miniProfile = document.getElementById('miniProfile'); // 사용 여부 확인 필요
const systemInfo = document.getElementById('systemInfo');

const login = document.getElementById('login');
const loginForm = document.getElementById('login-form');
// const loginAuthForms = document.getElementById('login-auth-forms'); // 사용 여부 확인 필요
const loginId = document.getElementById('login-id');
const loginPassword = document.getElementById('login-password');
const loginBth = document.getElementById('login-bth');
const gotoSignupBth = document.getElementById('goto-signup-bth');
const loginBoxMsg = document.getElementById('login-box-msg');

const signupForm = document.getElementById('signup-form');
const signupId = document.getElementById('signup-id');
const signupPassword = document.getElementById('signup-password');
const signupEmail = document.getElementById('signup-email');
const signupNickname = document.getElementById('signup-nickname');
const signupBth = document.getElementById('signup-bth');
const gotoLoginBth = document.getElementById('goto-login-bth');
const signupBoxMsg = document.getElementById('signup-box-msg');

const profileModal = document.getElementById("profileModal");

let currentUser = null;

// [수정] 로그인 상태 감지 리스너 추가 (새로고침 해도 로그인 유지)
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        showLoggedInUI();
        renderAuthArea(user);
        initNav();
        loadTab('main'); // 로그인 시 메인 탭 로드
        startClock();
        subscribeSystem();
    } else {
        currentUser = null;
        showLogOutUI();
    }
});

// --- 유틸리티 함수 ---

async function uploadStaffImage(file, uid) {
    const storageRef = ref(storage, `staff/${uid}_${Date.now()}.png`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

function randomHex(){
    const r = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    const g = Math.floor(Math.random() * 256).toString(16).padStart(2, '0'); 
    const b = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return '#' + r + g + b;
}

function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
}

function pickByWeight(list) {
    const total = list.reduce((sum, item) => sum + item.weight, 0);
    let r = Math.random() * total;
    for (const item of list) {
        if (r < item.weight) return item.text;
        r -= item.weight;
    }
    return list[list.length - 1].text;
}

function fmtTime(ts) {
    if (!ts) return '';
    try {
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleString();
    } catch(e) {
        return String(ts);
    }
}

// --- UI 제어 함수 ---

function initNav() {
    navEl.innerHTML = '';
    TABS.forEach( tab => {
        const b = document.createElement('button');
        b.textContent = tab.title;
        b.dataset.tab = tab.id;
        b.addEventListener('click', () => loadTab(tab.id, true));
        navEl.appendChild(b);
    });
}
    
function setActiveNav(tabId) {
    navEl.querySelectorAll('button').forEach( b => b.classList.toggle('active', b.dataset.tab === tabId));
}

function showLogOutUI() {
    header.style.display = 'none';
    login.style.display = 'flex';
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    contentEl.innerHTML = ''; // 로그아웃 시 내용 비우기
}

function showLoggedInUI(){
    login.style.display = 'none';
    header.style.display = 'flex';
}

function startClock() {
    function tick() {
        const d = new Date();
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        if(nowTimeEl) nowTimeEl.textContent = d.toLocaleString(undefined, options);
    }
    tick();
    setInterval(tick, 1000);
}

function renderAuthArea(user){
    logOutEl.innerHTML = '';
    if (!user) return;
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = '로그아웃';
    btn.addEventListener('click', ()=> signOut(auth));
    logOutEl.appendChild(btn);
}

async function subscribeSystem(){
    const sysDocRef = doc(db, 'system', 'employeeStatus');
    try {
        const snap = await getDoc(sysDocRef);
        if (snap.exists() && systemInfo) {
            systemInfo.textContent = JSON.stringify(snap.data());
        } else if (systemInfo) {
            systemInfo.textContent = '시스템 정보 없음';
        }
    } catch(e) {
        if(systemInfo) systemInfo.textContent = '시스템 로드 실패';
    }
}

// --- 이벤트 리스너 (Auth) ---

gotoSignupBth.addEventListener('click', () => {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    loginBoxMsg.textContent = '';
    signupBoxMsg.textContent = '';
    document.getElementById('loginTitle').textContent = '회원가입';
});

gotoLoginBth.addEventListener('click', () => {
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
    signupBoxMsg.textContent = '';
    loginBoxMsg.textContent = '';
    document.getElementById('loginTitle').textContent = '로그인';
});

signupBth.addEventListener('click', async ()=>{
    signupBoxMsg.textContent = '';
    const id = signupId.value;
    const email = signupEmail.value.trim();
    const pw = signupPassword.value;
    const nick = signupNickname.value.trim();

    if (!id) { signupBoxMsg.textContent = '아이디를 입력해 주세요.'; return; }
    if (!nick) { signupBoxMsg.textContent = '닉네임을 입력해 주세요.'; return; }
    if (!email || !pw) { signupBoxMsg.textContent = '이메일과 비밀번호를 입력해 주세요.'; return; }

    try { 
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        const uid = cred.user.uid;
        await setDoc(doc(db,'users',uid), {
            email, id, password: pw, nickname: nick, colorHex: randomHex(),
            decorations: [], silver: 0, inventory: {}, status: 'alive',
            achievements: {
                deathCount: 0, expeditionCount: 0, interviewCount: 0,
                objectCount: 0, creatureSubduedCount: 0, haveSilverCount: 0
            },
            createdAt: serverTimestamp()
        });
        await setDoc(doc(db, 'staff', uid), {
            uid, name: nick, status: 'alive', image: '', silver: 0, desc: '',
            updatedAt: serverTimestamp()
        });
        signupBoxMsg.textContent = '가입 성공. 로그인 처리 중.';
    } catch(e) {
        signupBoxMsg.textContent = '가입 실패: ' + (e.message || e.code);
    }
});

loginBth.addEventListener('click', async ()=> {
    loginBoxMsg.textContent = '';
    const id = loginId.value.trim();
    const pw = loginPassword.value;

    if (!id || !pw) { 
        loginBoxMsg.textContent = '아이디와 비밀번호를 입력해 주세요.'; 
        return; 
    }

    try {
        const q = query(collection(db, 'users'), where('id', '==', id));
        const snap = await getDocs(q);
        if (snap.empty) {
            loginBoxMsg.textContent = '존재하지 않는 아이디입니다.';
            return;
        }
        const userDoc = snap.docs[0].data();
        const email = userDoc.email;
        await signInWithEmailAndPassword(auth, email, pw);
        loginBoxMsg.textContent = '로그인 성공.';
    } catch(e) {
        loginBoxMsg.textContent = '로그인 실패: ' + (e.message || e.code);
    }
});

loginForm.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); loginBth.click(); }
});

signupForm.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); signupBth.click(); }
});


// --- 탭 로드 로직 ---

async function loadTab(tabId){
    setActiveNav(tabId);
    contentEl.innerHTML = '<div class="card muted">로딩...</div>';
    switch(tabId) {
        case 'main': await renderMain(); break;
        case 'staff': await renderStaff(); break;
        case 'me': 
            // await renderMe(); // renderMe 함수 없음, 임시 처리
            contentEl.innerHTML = '<div class="card">내 정보 기능 준비중</div>';
            break;
        case 'map': await renderMap(); break;
        case 'dex': 
            // renderDex(); // renderDex 함수 없음
            contentEl.innerHTML = '<div class="card">도감 기능 준비중</div>';
            break;
        default: contentEl.innerHTML = '<div class="card">알 수 없는 탭</div>';
    }
}

// --- Main Tab ---
async function renderMain(){
    contentEl.innerHTML = '';
    
    // UI 뼈대 생성
    const flowCard = document.createElement('div');
    flowCard.className = 'card';
    flowCard.innerHTML = `<div class="muted">심연 상태</div><h3 id="abyssFlow">불러오는 중...</h3>`;
    contentEl.appendChild(flowCard);

    const statusCard = document.createElement('div');
    statusCard.className = 'card';
    statusCard.innerHTML = `<div class="muted">직원 현황</div><div id="staffStatus">불러오는 중...</div><div class="muted" style="margin-top:10px;">일정</div><div id="staffSchedule">불러오는 중...</div>`;
    contentEl.appendChild(statusCard);

    const eventCard = document.createElement('div');
    eventCard.className = 'card';
    eventCard.innerHTML = `<div class="muted">오늘의 이벤트</div><div id="todayEvent">불러오는 중...</div>`;
    contentEl.appendChild(eventCard);

    const rankCard = document.createElement('div');
    rankCard.className = 'card';
    rankCard.innerHTML = `<div class="muted">직원 순위</div><div id="staffRank">불러오는 중...</div>`;
    contentEl.appendChild(rankCard);

    // 데이터 로드
    try {
        const todayKey = getTodayKey();
        const todayRef = doc(db, 'system', 'abyssToday');
        const todaySnap = await getDoc(todayRef);
        let flowText = null, savedDate = null;

        if (todaySnap.exists()) {
            const data = todaySnap.data();
            flowText = data.flowText;
            savedDate = data.dateKey;
        }

        const cfgSnap = await getDoc(doc(db, 'system', 'abyssConfig'));

        if (flowText && savedDate === todayKey) {
            document.getElementById('abyssFlow').textContent = '오늘 심연은 ' + flowText + '습니다.';
        } else if (cfgSnap.exists()) {
            const flows = cfgSnap.data().flows || [];
            if (flows.length > 0) {
                const picked = pickByWeight(flows);
                await setDoc(todayRef, { flowText: picked, dateKey: todayKey, updatedAt: serverTimestamp() });
                document.getElementById('abyssFlow').textContent = '오늘 심연의 기류는 ' + picked + ' 입니다.';
            } else {
                document.getElementById('abyssFlow').textContent = '기류 데이터 없음';
            }
        } else {
            document.getElementById('abyssFlow').textContent = '기류 설정 없음';
        }

        const usersSnap = await getDocs(collection(db, 'users'));
        let alive=0, missing=0, dead=0, contaminated=0;
        let maxSilver = -1, minDeath = 999999;
        let topSilverName = '-', topSurvivorName = '-';

        usersSnap.forEach(docu => {
            const d = docu.data();
            const s = d.status || 'alive';
            if (s === 'alive') alive++;
            else if (s === 'missing') missing++;
            else if (s === 'dead') dead++;
            else if (s === 'contaminated') contaminated++;

            if ((d.silver || 0) > maxSilver) {
                maxSilver = d.silver || 0;
                topSilverName = d.nickname || d.id;
            }
            const dc = d.achievements?.deathCount ?? 0;
            if (dc < minDeath) {
                minDeath = dc;
                topSurvivorName = d.nickname || d.id;
            }
        });

        document.getElementById('staffStatus').innerHTML = `
            <div>생존: ${alive} | 실종: ${missing} | 오염: ${contaminated} | 사망: ${dead}</div>
        `;

        const daySnap = await getDoc(doc(db, 'system', 'day'));
        let currentDay = daySnap.exists() ? (daySnap.data().currentDay || 1) : 1;
        const schedSnap = await getDoc(doc(db, 'schedule', 'days'));

        if (schedSnap.exists()) {
            const daysData = schedSnap.data().days || {};
            const todayList = daysData[currentDay] || [];
            if (todayList.length > 0) {
                document.getElementById('staffSchedule').innerHTML = todayList.map(t => `<div>${t}</div>`).join('');
            } else {
                document.getElementById('staffSchedule').textContent = `${currentDay}일차 일정 없음`;
            }
        } else {
            document.getElementById('staffSchedule').textContent = '스케줄 데이터 없음';
        }

        document.getElementById('staffRank').innerHTML = `
            <div>은화: ${topSilverName} (${maxSilver}) | 생존왕: ${topSurvivorName} (${minDeath})</div>
        `;
        document.getElementById('todayEvent').textContent = '이벤트 데이터 없음'; // 임시

    } catch(e) {
        console.error(e);
        contentEl.innerHTML += `<div class="card muted">데이터 로드 실패</div>`;
    }
}

// --- Staff Tab ---

async function renderStaff() {
    contentEl.innerHTML = `
        <div class="card">
        <div class="muted">직원 목록</div>
        <div id="staffList" class="staff-grid"></div>
        </div>
    `;

    const listEl = document.getElementById("staffList");
    const snap = await getDocs(collection(db, "staff"));
    listEl.innerHTML = "";

    snap.forEach(docSnap => {
        const f = docSnap.data();
        const item = document.createElement("div");
        item.className = "staff-thumb";
        item.onclick = () => openProfileModal(docSnap.id, f);
        item.innerHTML = `
        <div class="thumb-img" style="background-image:url('${f.image || ''}'); aspect-ratio: 3 / 4; background-size: cover; background-position: center;"></div>
        <div class="thumb-name">${f.name}</div>
        `;
        listEl.appendChild(item);
    });
}

let radarObj = null;

function drawStatChart(stats = { str:1, vit:1, agi:1, wil:1 }) {
    const ctx = document.getElementById("statRadar");
    if (!ctx) return;
    if (radarObj) radarObj.destroy();
    
    // Chart.js가 로드되어 있다고 가정
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js library not loaded');
        return;
    }

    const clamp = v => Math.max(1, Math.min(5, Number(v)));
    radarObj = new Chart(ctx, {
        type: 'radar',
        data: {
        labels: ["근력", "건강", "민첩", "정신력"],
        datasets: [{
            data: [clamp(stats.str), clamp(stats.vit), clamp(stats.agi), clamp(stats.wil)],
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            borderColor: "#000"
        }]
        },
        options: {
        scales: {
            r: { min: 1, max: 5, ticks: { stepSize: 1, callback: v => v } }
        }
        }
    });
}

function openProfileModal(docId, data) {
    profileModal.innerHTML = `
        <div class="modal-content profile-wide">
        <button id="closeProfile" class="back-btn">← 돌아가기</button>
        <div class="profile-top">
            <div class="profile-img-wrap"><img class="profile-img" src="${data.image || ""}" alt=""></div>
            <div class="profile-info">
            <p><span class="label">이름</span> ${data.name || ""}</p>
            <p><span class="label">성별</span> ${data.gender || ""}</p>
            <p><span class="label">나이</span> ${data.age || ""}</p>
            <p><span class="label">신체</span> ${data.body || ""}</p>
            <p><span class="label">국적</span> ${data.nation || ""}</p>
            <hr>
            <p><span class="label">비고</span></p>
            <p style="white-space:pre-line">${data.note || ""}</p>
            </div>
        </div>
        <div class="stat-area-fixed">
            <div class="stat-left">
            <p>근력: ${data.str || 1}</p><p>건강: ${data.vit || 1}</p>
            <p>민첩: ${data.agi || 1}</p><p>정신력: ${data.wil || 1}</p>
            </div>
            <canvas id="statRadar" width="260" height="260"></canvas>
        </div>
        <div id="editArea"></div>
        </div>
    `;

    profileModal.showModal();
    document.getElementById("closeProfile").onclick = () => profileModal.close();

    const editBtn = document.createElement("button");
    editBtn.textContent = "편집";
    editBtn.onclick = () => openInlineEdit(docId, data);
    document.getElementById("editArea").appendChild(editBtn);

    setTimeout(() => drawStatChart(data), 100); // 모달 렌더링 후 차트 그리기
}

function openInlineEdit(docId, data) {
    const editArea = document.getElementById("editArea");
    editArea.innerHTML = `
        <div class="edit-grid-inline">
        <label>이름</label><input id="editName" value="${data.name || ''}">
        <label>성별</label><input id="editGender" value="${data.gender || ''}">
        <label>나이</label><input id="editAge" value="${data.age || ''}">
        <label>키·체중</label><input id="editBody" value="${data.body || ''}">
        <label>국적</label><input id="editNation" value="${data.nation || ''}">
        <label>비고</label><textarea id="editNote">${data.note || ''}</textarea>
        <label>이미지 업로드</label><input id="editImageFile" type="file" accept="image/*">
        <label>이미지 URL</label><input id="editImage" value="${data.image || ''}">
        <div class="edit-stats-inline">
            <label>근력</label><input id="editStr" value="${data.str || 0}">
            <label>건강</label><input id="editVit" value="${data.vit || 0}">
            <label>민첩</label><input id="editAgi" value="${data.agi || 0}">
            <label>정신력</label><input id="editWil" value="${data.wil || 0}">
        </div>
        <button id="saveStaffInline">저장</button>
        </div>
    `;

    document.getElementById("saveStaffInline").onclick = async () => {
        let finalImg = document.getElementById("editImage").value;
        const file = document.getElementById("editImageFile").files[0];

        if (file) {
            finalImg = await uploadStaffImage(file, docId);
        }

        const newData = {
            name: document.getElementById("editName").value,
            gender: document.getElementById("editGender").value,
            age: document.getElementById("editAge").value,
            body: document.getElementById("editBody").value,
            nation: document.getElementById("editNation").value,
            note: document.getElementById("editNote").value,
            image: finalImg,
            str: Number(document.getElementById("editStr").value),
            vit: Number(document.getElementById("editVit").value),
            agi: Number(document.getElementById("editAgi").value),
            wil: Number(document.getElementById("editWil").value),
            updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, "staff", docId), newData);
        openProfileModal(docId, { ...data, ...newData });
        renderStaff();
        editArea.innerHTML = '';
    };
}
// [수정] 여기에 중복되었던 saveStaffInline.onclick 코드 삭제함

// --- Map Functionality ---

// [수정] 정의되지 않은 함수 추가 (빈 함수)
async function openMapInlineEdit(mapId) {
    alert("맵 편집 기능은 아직 구현되지 않았습니다. (mapId: " + mapId + ")");
}

async function renderMap() {
    contentEl.innerHTML = '<div class="card muted">맵 로딩중...</div>';
    try {
        const snap = await getDocs(collection(db, 'maps'));
        contentEl.innerHTML = '';
        if(snap.empty){
            contentEl.innerHTML = '<div class="card">등록된 맵이 없습니다.</div>';
            return;
        }
        snap.forEach(d => {
            contentEl.appendChild(renderMapCard(d));
        });
    } catch(e){
        console.error(e);
        contentEl.innerHTML = '<div class="card">맵 로드 실패</div>';
    }
}

function showMessage(msg, type='info') {
    const el = document.createElement('div');
    el.className = `in-browser-msg ${type}`;
    el.textContent = msg;
    Object.assign(el.style, {
        position:'fixed', top:'20px', left:'50%', transform:'translateX(-50%)',
        background:'#222', color:'#fff', padding:'10px 20px', borderRadius:'6px',
        zIndex:9999, boxShadow:'0 2px 6px rgba(0,0,0,0.4)'
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

function showConfirm(msg) {
    return new Promise(resolve => {
        const confirmDiv = document.createElement('div');
        confirmDiv.className = 'fullscreen confirm-popup';
        confirmDiv.innerHTML = `
        <div class="card" style="max-width:400px; width:90%; padding:20px; display:flex; flex-direction:column; gap:12px; text-align:center;">
            <div>${msg}</div>
            <div style="display:flex; justify-content:center; gap:12px;">
            <button class="btn confirm-yes">확인</button>
            <button class="btn confirm-no">취소</button>
            </div>
        </div>
        `;
        document.body.appendChild(confirmDiv);
        confirmDiv.querySelector('.confirm-yes').onclick = () => { resolve(true); confirmDiv.remove(); };
        confirmDiv.querySelector('.confirm-no').onclick = () => { resolve(false); confirmDiv.remove(); };
    });
}

async function isAdminUser() {
    const user = auth.currentUser;
    if (!user) return false;
    try {
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        return uDoc.exists() && uDoc.data().role === 'admin';
    } catch(e) {
        console.error('isAdminUser err', e);
        return false;
    }
}

async function uploadMapImage(file, mapId) {
    const storageRef = ref(storage, `maps/${mapId || 'tmp'}_${Date.now()}.png`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

function renderMapCard(mapDoc) {
    const mapId = mapDoc.id;
    const data = mapDoc.data ? mapDoc.data() : mapDoc;
    const img = data.image || '';
    const name = data.name || '이름 없음';
    const desc = data.description || '';
    const danger = data.danger || 1;
    const types = Array.isArray(data.types) ? data.types.join(', ') : (data.types || '');

    const el = document.createElement('div');
    el.className = 'map-card card';
    el.innerHTML = `
        <div class="map-card-inner" data-id="${mapId}">
        <div class="map-media"><img class="map-img" src="${img}" alt="${name}"></div>
        <div class="map-main">
            <div class="map-head">
            <h3 class="map-name">${name}</h3>
            <div class="map-meta">
                <div class="map-danger">${'★'.repeat(danger)}${'☆'.repeat(5 - danger)}</div>
                <div class="map-types">출현: ${types}</div>
            </div>
            </div>
            <div class="map-desc">${desc}</div>
            <div class="map-actions">
            <button class="btn map-open-comments">댓글 보기</button>
            <button class="btn map-add-comment">댓글 작성</button>
            <button class="btn link map-edit-btn" style="display:none">편집</button>
            </div>
            <div class="map-comments-preview">
            <div class="comments-count muted">댓글 0개</div>
            <div class="comments-list"></div>
            <div class="comments-more" style="display:none">
                <button class="link map-more-comments">더보기</button>
            </div>
            </div>
        </div>
        </div>
    `;

    el.querySelector('.map-open-comments').addEventListener('click', () => openCommentsPopup(mapId));
    el.querySelector('.map-add-comment').addEventListener('click', () => focusCommentInput(mapId));
    el.querySelector('.map-more-comments').addEventListener('click', () => openCommentsPopup(mapId));
    el.querySelector('.map-edit-btn').addEventListener('click', async () => openMapInlineEdit(mapId));

    (async () => {
        if (await isAdminUser()) {
            const btn = el.querySelector('.map-edit-btn');
            if (btn) btn.style.display = 'inline-block';
        }
    })();

    // Preview Comments (최신 3개)
    (async () => {
        try {
            const cSnap = await getDocs(collection(db, 'maps', mapId, 'comments'));
            const arr = [];
            cSnap.forEach(d => arr.push({ id: d.id, ...d.data() }));
            arr.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
            const preview = arr.slice(0, 3);
            const commentsList = el.querySelector('.comments-list');
            const commentsCount = el.querySelector('.comments-count');
            commentsCount.textContent = `댓글 ${arr.length}개`;

            if (!preview.length) commentsList.innerHTML = `<div class="muted">댓글이 없습니다.</div>`;
            else {
                commentsList.innerHTML = '';
                preview.forEach(c => {
                    const item = document.createElement('div');
                    item.className = 'comment-item';
                    item.innerHTML = `
                        <div class="cm-left"><img class="cm-avatar" src="${c.photo||''}" alt=""></div>
                        <div class="cm-right">
                        <div class="cm-head">
                            <strong class="cm-name">${c.name||'익명'}</strong> 
                            <span class="muted cm-time">${fmtTime(c.createdAt)}</span>
                        </div>
                        <div class="cm-body">${c.text || ''}</div>
                        <div class="cm-admin" style="margin-top:6px; display:none; gap:8px;">
                            <button class="link cm-edit">수정</button>
                            <button class="link cm-del">삭제</button>
                        </div>
                        </div>
                    `;

                    (async () => {
                        if (await isAdminUser()) {
                            const btnWrap = item.querySelector('.cm-admin');
                            btnWrap.style.display = 'flex';
                            btnWrap.querySelector('.cm-edit').onclick = async () => {
                                const newText = prompt('댓글 내용을 수정하시오.', c.text||'');
                                if (!newText) return;
                                try {
                                    await updateDoc(doc(db, 'maps', mapId, 'comments', c.id), { text: newText, editedAt: serverTimestamp() });
                                    renderMap();
                                    showMessage('댓글 수정 완료', 'info');
                                } catch(e) {
                                    console.error(e);
                                    showMessage('댓글 수정 실패', 'error');
                                }
                            };
                            btnWrap.querySelector('.cm-del').onclick = async () => {
                                try {
                                    await deleteDoc(doc(db, 'maps', mapId, 'comments', c.id));
                                    renderMap();
                                    showMessage('댓글 삭제 완료', 'info');
                                } catch(e) {
                                    console.error(e);
                                    showMessage('댓글 삭제 실패', 'error');
                                }
                            };
                        }
                    })();
                    commentsList.appendChild(item);
                });
            }
            const moreWrap = el.querySelector('.comments-more');
            if (arr.length > 3 && moreWrap) moreWrap.style.display = 'block';
        } catch(e) {
            console.error('load comments preview err', e);
            // showMessage('댓글 로드 실패', 'error');
        }
    })();

    return el;
}

function focusCommentInput(mapId) {
    if (!currentUser) { showMessage('로그인이 필요합니다.', 'error'); return; }
    const text = prompt('댓글을 작성하시오 (최대 500자):');
    if (!text?.trim()) return;
    postMapComment(mapId, text.trim());
}

async function postMapComment(mapId, text) {
    try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const me = userSnap.exists() ? userSnap.data() : {};
        const newRef = doc(collection(db, 'maps', mapId, 'comments'));
        await setDoc(newRef, {
            uid: currentUser.uid,
            name: me.nickname || me.id || '사용자',
            photo: me.photo||'',
            text,
            createdAt: serverTimestamp()
        });
        renderMap();
        showMessage('댓글 등록 완료', 'info');
    } catch(e) {
        console.error('postMapComment err', e);
        showMessage('댓글 등록 실패', 'error');
    }
}

function openCommentsPopup(mapId) {
    const popup = document.createElement('div');
    popup.className = 'fullscreen comments-popup';
    popup.innerHTML = `
        <div class="card" style="max-width:800px; width:90%; max-height:80vh; overflow:hidden; display:flex; flex-direction:column;">
        <div style="padding:12px; display:flex; justify-content:space-between; align-items:center;">
            <div class="muted">댓글</div>
            <button class="btn close-comments">닫기</button>
        </div>
        <div class="comments-scroll" style="overflow:auto; padding:12px; flex:1; border-top:1px solid rgba(255,255,255,0.02);">
            <div class="comments-full-list"></div>
        </div>
        <div style="padding:12px; border-top:1px solid rgba(255,255,255,0.02); display:flex; gap:8px;">
            <input id="commentsInput" placeholder="댓글을 입력하세요" style="flex:1; padding:8px; border-radius:6px; background:transparent; border:1px solid rgba(255,255,255,0.04); color:inherit;">
            <button class="btn post-comment">등록</button>
        </div>
        </div>
    `;
    document.body.appendChild(popup);

    const closeBtn = popup.querySelector('.close-comments');
    const listEl = popup.querySelector('.comments-full-list');
    const postBtn = popup.querySelector('.post-comment');
    const inputEl = popup.querySelector('#commentsInput');

    closeBtn.onclick = () => popup.remove();
    postBtn.onclick = async () => {
        if (!currentUser) { showMessage('로그인이 필요합니다.', 'error'); return; }
        const v = inputEl.value.trim();
        if (!v) return;
        await postMapComment(mapId, v);
        popup.remove();
        openCommentsPopup(mapId);
    };

    (async () => {
        try {
            const cSnap = await getDocs(collection(db, 'maps', mapId, 'comments'));
            const arr = [];
            cSnap.forEach(d => arr.push({ id: d.id, ...d.data() }));
            arr.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            if (!arr.length) {
                listEl.innerHTML = `<div class="muted">댓글이 없습니다.</div>`;
            } else {
                listEl.innerHTML = '';
                arr.forEach(c => {
                    const item = document.createElement('div');
                    item.className = 'comment-item';
                    item.style.marginBottom = '12px';
                    // [수정] 짤린 코드 복구 및 div 닫기
                    item.innerHTML = `
                        <div style="display:flex; gap:10px;">
                            <div style="width:44px; height:44px; border-radius:50%; overflow:hidden; background:#333;">
                                <img src="${c.photo||''}" alt="" style="width:100%; height:100%; object-fit:cover;">
                            </div>
                            <div>
                                <div style="font-weight:bold;">${c.name||'익명'}</div>
                                <div class="muted" style="font-size:0.8em;">${fmtTime(c.createdAt)}</div>
                                <div style="margin-top:4px;">${c.text}</div>
                            </div>
                        </div>
                    `;
                    listEl.appendChild(item);
                });
            }
        } catch(e) {
            console.error(e);
            listEl.innerHTML = '댓글 로드 중 오류';
        }
    })();
}

// ==========================================
// [DEX] 도감 시스템 로직
// ==========================================

// 유틸: 밝기에 따라 글자색 결정 (검정/하양)
function getContrastColor(hex) {
    if(!hex) return '#fff';
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000' : '#fff';
}

// 1. 도감 메인 화면 (그리드)
async function renderDex() {
    contentEl.innerHTML = '<div class="card muted">도감 데이터 접근 중...</div>';
    
    try {
        const snap = await getDocs(collection(db, 'creatures'));
        const creatures = [];
        snap.forEach(d => creatures.push({ id: d.id, ...d.data() }));

        // 정렬: 도감 번호(발견 순서) 순
        creatures.sort((a, b) => (a.discoveryOrder || 999) - (b.discoveryOrder || 999));

        const totalCount = creatures.length;
        // 완전히 개방된(100%) 심연체 수 계산 (여기서는 예시로 unlockPercent가 DB에 있다고 가정하거나 계산)
        const fullyUnlocked = creatures.filter(c => calculateUnlockPercent(c) >= 100).length;

        contentEl.innerHTML = `
            <div style="text-align:center; margin-bottom:20px;">
                <h2 style="margin:0;">심연체 도감</h2>
                <div class="muted">관측 기록: ${fullyUnlocked} / ${totalCount}</div>
            </div>
            ${(await isAdminUser()) ? '<button id="addCreatureBtn" class="btn" style="display:block; margin:0 auto 20px auto;">+ 새 심연체 추가</button>' : ''}
            <div class="dex-grid" id="dexGrid"></div>
        `;

        if(await isAdminUser()) {
            document.getElementById('addCreatureBtn').onclick = createNewCreature;
        }

        const gridEl = document.getElementById('dexGrid');
        
        if (creatures.length === 0) {
            gridEl.innerHTML = '<div class="muted" style="grid-column: 1/-1; text-align:center;">데이터 없음</div>';
            return;
        }

        creatures.forEach(c => {
            const pct = calculateUnlockPercent(c);
            // 0%(빨강) -> 100%(초록) 색상 계산
            const r = Math.min(255, 255 * (2 * (100 - pct) / 100)); 
            const g = Math.min(255, 255 * (2 * pct / 100));
            const borderColor = `rgb(${r}, ${g}, 0)`;
            
            const item = document.createElement('div');
            item.className = 'dex-item';
            item.style.borderColor = borderColor;
            // 호버 시 강조색용 변수
            item.style.setProperty('--accent-color', borderColor);
            
            item.innerHTML = `
                <img src="${c.image || 'https://via.placeholder.com/300?text=No+Image'}" alt="${c.name}">
                <div class="dex-name-overlay">${c.name || '???'}</div>
            `;
            item.onclick = () => renderDexDetail(c.id);
            gridEl.appendChild(item);
        });

    } catch(e) {
        console.error(e);
        contentEl.innerHTML = '<div class="card error">도감 로드 실패</div>';
    }
}

// 2. 새 심연체 생성 (관리자)
async function createNewCreature() {
    if (!confirm('새 빈 심연체 데이터를 생성하시겠습니까?')) return;
    try {
        const newRef = doc(collection(db, 'creatures')); // Auto ID
        await setDoc(newRef, {
            name: '식별 불가',
            codeName: '???',
            risk: '유광', // 기본값
            appearance: 'O', // 기본값
            discoveryOrder: 0,
            image: '',
            status: 'alive',
            // 스탯
            str: 1, vit: 1, agi: 1, wil: 1,
            // 관리 정보 배열
            managementInfo: [
                { id: Date.now(), title: '기본 정보', content: '정보 없음', isPublic: false }
            ],
            // 연구 일지 배열
            researchLogs: [
                { id: Date.now(), title: '기본 일지', content: '기록 없음' }
            ], 
            createdAt: serverTimestamp()
        });
        renderDex(); // 새로고침
        showMessage('새 개체가 생성되었습니다.', 'info');
    } catch(e) {
        console.error(e);
        showMessage('생성 실패', 'error');
    }
}

// 3. 퍼센트 계산 로직
function calculateUnlockPercent(data) {
    // 로직: (공개된 관리정보 수 + 연구일지 수) / (전체 항목 수) * 100 
    // 예시로 간단하게 구현. 실제로는 항목별 가중치를 둘 수 있음.
    if (!data.managementInfo) return 0;
    
    let total = 0;
    let unlocked = 0;

    // 관리 정보 (체크박스 여부)
    data.managementInfo.forEach(info => {
        total++;
        if (info.isPublic) unlocked++;
    });
    
    // 연구 일지 (항상 1개는 기본 공개이므로 +1 보정 하거나, 규칙에 따름)
    // 여기서는 단순히 관리 정보의 공개율을 기준으로 전체 퍼센트를 잡음
    if (total === 0) return 0;
    return Math.floor((unlocked / total) * 100);
}

// 4. 상세 페이지 렌더링
async function renderDexDetail(docId) {
    contentEl.innerHTML = '<div class="card muted">데이터 로드 중...</div>';
    
    try {
        const snap = await getDoc(doc(db, 'creatures', docId));
        if (!snap.exists()) throw new Error("No Data");
        const data = snap.data();
        const isAdmin = await isAdminUser();
        const unlockPct = calculateUnlockPercent(data);

        // --- 계산 로직 ---
        const hp = (data.vit * 10) + (data.str * 2);
        const sp = (data.wil * 10) + (data.agi * 2);
        const physAtk = (data.str * 5) + (data.agi * 1);
        const menAtk = (data.wil * 5) + (data.vit * 1);

        // UI 구성
        contentEl.innerHTML = `
            <div class="dex-detail-container">
                <button class="back-btn" onclick="renderDex()">← 도감 목록으로</button>
                
                <div class="dex-section-row">
                    <div class="dex-section-col" style="display:flex; gap:15px; align-items:flex-start;">
                        <div style="flex:0 0 150px;">
                            <img id="detailImg" src="${data.image || ''}" style="width:150px; height:150px; object-fit:cover; border:1px solid #555; background:#000;">
                            ${isAdmin ? `<input type="file" id="editImgFile" style="display:none;" accept="image/*"><button class="btn" style="width:100%; margin-top:5px;" onclick="document.getElementById('editImgFile').click()">사진 변경</button>` : ''}
                        </div>
                        <div style="flex:1;">
                            <table class="dex-table">
                                <tr><th>코드명</th><td id="d-code">${data.codeName || '-'}</td></tr>
                                <tr><th>명칭</th><td>${inp(isAdmin, 'name', data.name)}</td></tr>
                                <tr><th>위험도</th><td>${sel(isAdmin, 'risk', ['유광','해수','심해','파생'], data.risk)}</td></tr>
                                <tr><th>외형</th><td>${sel(isAdmin, 'appearance', ['P','F','O','C'], data.appearance)}</td></tr>
                                <tr><th>발견 순서</th><td>${inp(isAdmin, 'discoveryOrder', data.discoveryOrder, 'number')} ${data.risk === '파생' ? '- 파생:' + inp(isAdmin, 'variantOrder', data.variantOrder || 1, 'number') : ''}</td></tr>
                                <tr><th>주요 피해</th><td>${inp(isAdmin, 'mainDamage', data.mainDamage || 'Unknown')}</td></tr>
                                <tr><th>사망/광기</th><td>${inp(isAdmin, 'probabilities', data.probabilities || '- / -')}</td></tr>
                            </table>
                        </div>
                    </div>

                    <div class="dex-section-col" style="display:flex; gap:15px;">
                        <div style="flex:1;">
                            <div class="muted" style="margin-bottom:10px;">스테이터스</div>
                            <table class="dex-table">
                                <tr><th>근력</th><td>${inp(isAdmin, 'str', data.str, 'number')}</td></tr>
                                <tr><th>건강</th><td>${inp(isAdmin, 'vit', data.vit, 'number')}</td></tr>
                                <tr><th>민첩</th><td>${inp(isAdmin, 'agi', data.agi, 'number')}</td></tr>
                                <tr><th>정신력</th><td>${inp(isAdmin, 'wil', data.wil, 'number')}</td></tr>
                            </table>
                            <div style="margin-top:10px; font-size:0.9rem;">
                                <div>최대 체력: <span class="val">${hp}</span></div>
                                <div>최대 정신: <span class="val">${sp}</span></div>
                                <div>물리 공격: <span class="val">${physAtk}</span></div>
                                <div>정신 공격: <span class="val">${menAtk}</span></div>
                            </div>
                        </div>
                        <div style="width:200px; height:200px;">
                            <canvas id="dexRadar"></canvas>
                        </div>
                    </div>
                </div>

                <div class="dex-section-row">
                    <div class="dex-section-col">
                        <div style="display:flex; justify-content:space-between;">
                            <h3>관리 정보</h3>
                            ${isAdmin ? '<button class="btn" onclick="addMgmtInfo()">+ 항목 추가</button>' : ''}
                        </div>
                        <div id="mgmtList" style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
                            </div>
                    </div>

                    <div class="dex-section-col">
                        <div style="display:flex; justify-content:space-between;">
                            <h3>연구 일지</h3>
                            ${isAdmin ? '<button class="btn" onclick="addLogInfo()">+ 일지 추가</button>' : ''}
                        </div>
                        <div id="logList" style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
                            </div>
                    </div>
                </div>

                <div class="card" style="margin-top:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            정보 개방도: <strong style="color:${unlockPct===100?'#4f4':'#f44'}">${unlockPct}%</strong>
                            <div style="width:200px; height:6px; background:#333; margin-top:5px; border-radius:3px; overflow:hidden;">
                                <div style="width:${unlockPct}%; height:100%; background:${unlockPct===100?'#4f4':'#f44'};"></div>
                            </div>
                        </div>
                        ${isAdmin ? `<button class="btn" style="background:var(--primary);" onclick="saveDexData('${docId}')">변경사항 저장</button>` : ''}
                    </div>
                </div>

                <div class="card" style="margin-top:20px;">
                    <h3 id="commentHeader">댓글</h3>
                    <div id="dexCommentsList"></div>
                    <button id="dexMoreComments" class="link" style="display:none; margin-top:10px;">댓글 더보기</button>
                    <div style="margin-top:15px; display:flex; gap:10px;">
                        <input id="dexCommentInput" class="input" placeholder="관측 기록에 대한 코멘트를 남기세요." style="flex:1;">
                        <button class="btn" onclick="postDexComment('${docId}')">등록</button>
                    </div>
                </div>
            </div>
        `;

        // --- JS 렌더링 후 처리 ---

        // 1. 차트 그리기
        drawDexChart(data);

        // 2. 관리 정보 리스트 렌더링
        const mgmtContainer = document.getElementById('mgmtList');
        (data.managementInfo || []).forEach((info, idx) => {
            const isVisible = isAdmin || info.isPublic;
            const div = document.createElement('div');
            div.className = 'card';
            div.style.padding = '10px';
            
            // 제목 결정 (기본 정보 vs 추가 정보)
            let displayTitle = idx === 0 ? '기본 정보' : `추가 정보 ${idx}`;
            // DB에 저장된 타이틀이 있다면 사용 (필요시)
            
            let html = `
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <strong class="muted">${displayTitle}</strong>
                    ${isAdmin ? `<label><input type="checkbox" class="admin-check mgmt-public-chk" ${info.isPublic?'checked':''}>공개</label> <button class="link mgmt-del-btn" style="color:#f44; font-size:0.8rem;">삭제</button>` : ''}
                </div>
            `;

            if (isAdmin) {
                html += `<textarea class="input mgmt-content" rows="3" style="width:100%;">${info.content}</textarea>`;
            } else {
                if (isVisible) {
                    html += `<div style="white-space:pre-wrap;">${info.content}</div>`;
                } else {
                    html += `<div class="secret-info" style="height:60px;"></div>`;
                }
            }
            div.innerHTML = html;
            
            if(isAdmin) {
                div.querySelector('.mgmt-del-btn').onclick = () => div.remove();
            }
            mgmtContainer.appendChild(div);
        });

        // 3. 연구 일지 리스트 렌더링
        // 규칙: 기본 일지(0번)는 무조건 공개. 나머지는 (전체 일지 수 - 1)개 중 개방도%에 따라 순차 공개
        // 예: 일지 4개. 기본 공개. 나머지 3개는 33%, 66%, 99% 달성 시 공개? -> 기획상 "존재하는 연구 일지 수에 따라 배분"
        const logContainer = document.getElementById('logList');
        const logs = data.researchLogs || [];
        const logCount = logs.length;
        
        logs.forEach((log, idx) => {
            // 공개 조건 계산
            let isOpen = false;
            if (idx === 0) isOpen = true; // 기본 일지
            else {
                // 남은 일지들에 대해 퍼센트 구간 할당
                const step = 100 / (logCount); // 단순하게 전체 n등분
                if (unlockPct >= step * idx) isOpen = true;
            }

            const canSee = isAdmin || isOpen;
            const div = document.createElement('div');
            div.className = 'card';
            div.style.padding = '10px';
            
            let title = idx === 0 ? '기본 일지' : `연구 일지 ${idx}`;

            let html = `
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <strong class="muted">${title}</strong>
                    ${isAdmin ? `<button class="link log-del-btn" style="color:#f44; font-size:0.8rem;">삭제</button>` : ''}
                </div>
            `;
            
            if (isAdmin) {
                html += `<textarea class="input log-content" rows="4" style="width:100%;">${log.content}</textarea>`;
            } else {
                if (canSee) {
                    html += `<div style="white-space:pre-wrap;">${log.content}</div>`;
                } else {
                    html += `<div class="secret-info" style="height:80px;"></div>`;
                }
            }
            div.innerHTML = html;
            if(isAdmin) div.querySelector('.log-del-btn').onclick = () => div.remove();
            logContainer.appendChild(div);
        });

        // 4. 기능 바인딩 (관리자)
        if (isAdmin) {
            // 이미지 변경
            document.getElementById('editImgFile').onchange = async (e) => {
                const f = e.target.files[0];
                if(f) {
                    const url = await uploadStaffImage(f, 'creature_' + docId); // 기존 업로드 함수 재사용
                    document.getElementById('detailImg').src = url;
                }
            };

            // 코드명 실시간 미리보기 (위험도/외형/순서 변경 시)
            const calcInputs = ['input-risk', 'input-appearance', 'input-discoveryOrder', 'input-variantOrder'];
            calcInputs.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.addEventListener('input', updateCodeNamePreview);
            });
            updateCodeNamePreview(); // 초기 실행
        }

        // 5. 댓글 로드
        loadDexComments(docId);

    } catch(e) {
        console.error(e);
        contentEl.innerHTML = '<div class="card error">상세 정보를 불러오지 못했습니다.</div>';
    }
}

// 5. 헬퍼: input/select 생성기 (관리자 모드용)
function inp(isAdmin, id, val, type='text') {
    if (!isAdmin) return val;
    return `<input id="input-${id}" class="input" type="${type}" value="${val}" style="width:100%; padding:4px;">`;
}
function sel(isAdmin, id, opts, val) {
    if (!isAdmin) return val;
    return `<select id="input-${id}" class="input" style="width:100%; padding:4px;">
        ${opts.map(o => `<option value="${o}" ${o===val?'selected':''}>${o}</option>`).join('')}
    </select>`;
}

// 6. 관리자 기능: 항목 추가
window.addMgmtInfo = () => {
    const c = document.getElementById('mgmtList');
    const idx = c.children.length; // 현재 갯수
    if (idx >= 10) return alert('너무 많습니다.');
    
    const div = document.createElement('div');
    div.className = 'card';
    div.style.padding = '10px';
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <strong class="muted">${idx===0?'기본 정보':'추가 정보 '+idx}</strong>
            <label><input type="checkbox" class="admin-check mgmt-public-chk">공개</label> 
            <button class="link mgmt-del-btn" style="color:#f44; font-size:0.8rem;">삭제</button>
        </div>
        <textarea class="input mgmt-content" rows="3" style="width:100%;"></textarea>
    `;
    div.querySelector('.mgmt-del-btn').onclick = () => div.remove();
    c.appendChild(div);
}

window.addLogInfo = () => {
    const c = document.getElementById('logList');
    const idx = c.children.length;
    if (idx >= 4) return alert('연구 일지는 최대 4개까지입니다.');
    
    const div = document.createElement('div');
    div.className = 'card';
    div.style.padding = '10px';
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <strong class="muted">연구 일지 ${idx}</strong>
            <button class="link log-del-btn" style="color:#f44; font-size:0.8rem;">삭제</button>
        </div>
        <textarea class="input log-content" rows="4" style="width:100%;"></textarea>
    `;
    div.querySelector('.log-del-btn').onclick = () => div.remove();
    c.appendChild(div);
}

// 7. 코드명 계산 로직
function updateCodeNamePreview() {
    const risk = document.getElementById('input-risk').value;
    const app = document.getElementById('input-appearance').value;
    const order = document.getElementById('input-discoveryOrder').value.padStart(2, '0');
    
    let code = '';
    
    // 위험도 매핑 (앞글자만 따거나 맵핑)
    // 유광, 해수, 심해, 파생
    let riskCode = '';
    if (risk === '유광') riskCode = 'PL'; // Polished
    else if (risk === '해수') riskCode = 'SW'; // Seawater
    else if (risk === '심해') riskCode = 'DS'; // Deep Sea
    else riskCode = 'VA'; // Variant

    if (risk === '파생') {
        const vOrder = document.getElementById('input-variantOrder').value.padStart(2, '0');
        code = `${app}${order}-${vOrder}`;
    } else {
        code = `${riskCode}-${app}${order}`;
    }
    
    document.getElementById('d-code').textContent = code;
}

// 8. 저장 로직
async function saveDexData(docId) {
    if (!confirm('변경사항을 저장하시겠습니까?')) return;

    // 코드명 재생성
    updateCodeNamePreview();
    const finalCode = document.getElementById('d-code').textContent;
    const order = Number(document.getElementById('input-discoveryOrder').value);
    
    // 발견 순서 중복 체크 (자신 제외)
    const q = query(collection(db, 'creatures'), where('discoveryOrder', '==', order));
    const snap = await getDocs(q);
    let duplicate = false;
    snap.forEach(d => { if(d.id !== docId) duplicate = true; });

    if (duplicate) {
        alert(`발견 순서 ${order}번은 이미 다른 심연체가 사용 중입니다.`);
        return;
    }

    // 관리 정보 수집
    const mgmtArr = [];
    document.querySelectorAll('#mgmtList > div').forEach((div, i) => {
        mgmtArr.push({
            id: i,
            title: i===0?'기본 정보':`추가 정보 ${i}`,
            content: div.querySelector('.mgmt-content').value,
            isPublic: div.querySelector('.mgmt-public-chk').checked
        });
    });

    // 연구 일지 수집
    const logArr = [];
    document.querySelectorAll('#logList > div').forEach((div, i) => {
        logArr.push({
            id: i,
            title: i===0?'기본 일지':`연구 일지 ${i}`,
            content: div.querySelector('.log-content').value
        });
    });

    const newData = {
        image: document.getElementById('detailImg').src,
        codeName: finalCode,
        name: document.getElementById('input-name').value,
        risk: document.getElementById('input-risk').value,
        appearance: document.getElementById('input-appearance').value,
        discoveryOrder: order,
        variantOrder: Number(document.getElementById('input-variantOrder')?.value || 0),
        mainDamage: document.getElementById('input-mainDamage').value,
        probabilities: document.getElementById('input-probabilities').value,
        
        str: Number(document.getElementById('input-str').value),
        vit: Number(document.getElementById('input-vit').value),
        agi: Number(document.getElementById('input-agi').value),
        wil: Number(document.getElementById('input-wil').value),
        
        managementInfo: mgmtArr,
        researchLogs: logArr,
        updatedAt: serverTimestamp()
    };

    try {
        await updateDoc(doc(db, 'creatures', docId), newData);
        showMessage('저장되었습니다.');
        renderDexDetail(docId); // 화면 갱신
    } catch(e) {
        console.error(e);
        alert('저장 실패: ' + e.message);
    }
}

// 9. 차트 그리기 (직원 차트 재활용)
function drawDexChart(data) {
    const ctx = document.getElementById("dexRadar");
    if (!ctx) return;
    
    // 기존 차트 인스턴스가 있으면 파괴 (Chart.js 특성)
    if (window.dexChartInstance) window.dexChartInstance.destroy();

    const clamp = v => Math.max(1, Math.min(5, Number(v)));
    
    window.dexChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ["근력", "건강", "민첩", "정신력"],
            datasets: [{
                label: 'Stats',
                data: [clamp(data.str), clamp(data.vit), clamp(data.agi), clamp(data.wil)],
                backgroundColor: "rgba(255, 0, 0, 0.2)",
                borderColor: "#f44",
                pointBackgroundColor: "#fff"
            }]
        },
        options: {
            scales: {
                r: { min: 0, max: 5, ticks: { stepSize: 1, display:false }, angleLines: { color: '#555' }, grid: { color: '#555' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// 10. 댓글 (인라인)
async function loadDexComments(docId) {
    const listEl = document.getElementById('dexCommentsList');
    const header = document.getElementById('commentHeader');
    const moreBtn = document.getElementById('dexMoreComments');
    
    const snap = await getDocs(collection(db, 'creatures', docId, 'comments'));
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    arr.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)); // 최신순

    header.textContent = `댓글 (${arr.length})`;
    listEl.innerHTML = '';

    if (arr.length === 0) {
        listEl.innerHTML = '<div class="muted">기록된 코멘트가 없습니다.</div>';
        return;
    }

    // 미리보기 3개 or 전체
    const isExpanded = listEl.dataset.expanded === 'true';
    const displayArr = isExpanded ? arr : arr.slice(0, 3);

    if (arr.length > 3 && !isExpanded) {
        moreBtn.style.display = 'block';
        moreBtn.onclick = () => {
            listEl.dataset.expanded = 'true';
            loadDexComments(docId); // 재호출하여 전체 렌더링
        };
    } else {
        moreBtn.style.display = 'none';
    }

    displayArr.forEach(c => {
        const item = document.createElement('div');
        item.style.marginBottom = '15px';
        item.style.borderBottom = '1px solid #333';
        item.style.paddingBottom = '10px';
        
        // 아이콘 색상 계산
        const hex = c.colorHex || '#555555';
        const iconColor = getContrastColor(hex);

        const isMine = currentUser && currentUser.uid === c.uid;
        const isAdmin = window.isAdmin; // isAdminUser 함수 결과값 저장 필요. 여기선 편의상 씀

        item.innerHTML = `
            <div style="display:flex; gap:10px;">
                <div class="user-icon-circle" style="background:${hex}; color:${iconColor};">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${c.nickname || '익명'}</strong>
                        <span class="muted" style="font-size:0.8rem;">${fmtTime(c.createdAt)} ${c.isEdited?'(수정됨)':''}</span>
                    </div>
                    <div class="comment-body" style="margin-top:5px; white-space:pre-wrap;">${c.text}</div>
                    
                    <div class="comment-actions" style="margin-top:5px; font-size:0.8rem; display:none;">
                        <button class="link c-edit">수정</button>
                        <button class="link c-del" style="color:#f44;">삭제</button>
                    </div>
                </div>
            </div>
        `;

        // 권한 체크 (내 댓글이거나 관리자면)
        // isAdminUser()는 비동기라 렌더링 시점에 즉시 확인 어려우므로
        // 상단 renderDexDetail에서 미리 체크하거나, 여기서 비동기로 체크
        (async () => {
             if (isMine || await isAdminUser()) {
                 const acts = item.querySelector('.comment-actions');
                 acts.style.display = 'flex';
                 acts.style.gap = '10px';
                 
                 // 삭제
                 acts.querySelector('.c-del').onclick = async () => {
                     if(!confirm('삭제하시겠습니까?')) return;
                     await deleteDoc(doc(db, 'creatures', docId, 'comments', c.id));
                     loadDexComments(docId);
                 };

                 // 수정
                 acts.querySelector('.c-edit').onclick = async () => {
                     const newText = prompt('댓글 수정', c.text);
                     if(newText === null || newText === c.text) return;
                     await updateDoc(doc(db, 'creatures', docId, 'comments', c.id), {
                         text: newText,
                         isEdited: true,
                         updatedAt: serverTimestamp()
                     });
                     loadDexComments(docId);
                 };
             }
        })();

        listEl.appendChild(item);
    });
}

// 댓글 등록
async function postDexComment(docId) {
    if (!currentUser) return alert('로그인이 필요합니다.');
    const input = document.getElementById('dexCommentInput');
    const text = input.value.trim();
    if (!text) return;

    try {
        const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const uData = uSnap.data();
        
        await addDoc(collection(db, 'creatures', docId, 'comments'), {
            uid: currentUser.uid,
            nickname: uData.nickname || 'Unknown',
            colorHex: uData.colorHex || '#555',
            text: text,
            createdAt: serverTimestamp()
        });
        input.value = '';
        loadDexComments(docId);
    } catch(e) {
        console.error(e);
        alert('댓글 등록 실패');
    }
}