/* =========================================================
    firebase 불러오기
========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updateProfile,
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
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";


/* =========================================================
    firebase 콘픽
========================================================= */

const firebaseConfig = {
    apiKey: "AIzaSyDGmwk9FtwnjUKcH4T6alvMWVQqbhVrqfI",
    authDomain: "abyss-suicide-co.firebaseapp.com",
    projectId: "abyss-suicide-co",
    storageBucket: "abyss-suicide-co.firebasestorage.app",
    messagingSenderId: "711710259422",
    appId: "1:711710259422:web:3c5ba7c93edb3d6d6baa4f"
};

/* =========================================================
    firebase 초기화
========================================================= */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* =========================================================
    DOM 요소 참조/선언
========================================================= */

const header = document.getElementById('header');
const navEl = document.getElementById('nav');
const contentEl = document.getElementById('content');
const abyssFlowEl = document.getElementById('abyssFlow');
const staffStatusEl = document.getElementById('staffStatus');
const staffScheduleEl = document.getElementById('staffSchedule');
const staffRankEl = document.getElementById('staffRank');

const logOutEl = document.getElementById('log-out');
const nowTimeEl = document.getElementById('nowTime');
const systemInfo = document.getElementById('systemInfo');

const login = document.getElementById('login');
const loginForm = document.getElementById('login-form');
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

const DEFAULT_MAP_IMAGE = './images/default-map.png';
const DEFAULT_PROFILE_IMAGE = './images/default-profile.png';

let currentUser = null;

/* =========================================================
    데이터 값 선언
========================================================= */

const baseStats = {
    muscle: 1, agility: 1, endurance: 1,flexibility: 1, visual: 1, auditory: 1, situation: 1, reaction: 1, intellect: 1, judgment: 1, memory: 1, spirit: 1, decision: 1, stress: 1
};

const TABS = [
    { id: 'main', title: '메인' },
    { id: 'staff', title: '직원' },
    { id: 'me', title: '내 상태' },
    { id: 'map', title: '맵' },
    { id: 'dex', title: '도감' }
];

function mapStatKeyToLabel(key) {
    const map = {
        muscle: '근력', agility: '민첩', endurance: '지구력', flexibility: '유연성', 
        visual: '시각', auditory: '청각', situation: '상황 인지 능력', reaction: '반응속도', 
        intellect: '지능', judgment: '판단력', memory: '기억력', spirit: '정신력', 
        decision: '의사 결정 능력', stress: '스트레스 내성',
        currentHP: '현재 체력', maxHP: '최대 체력',
        currentSpirit: '현재 정신력', maxSpirit: '최대 정신력'
    };
    return map[key] || key;
}

const DANGER_TYPES = {
    '유광': '유광',
    '해수': '해수',
    '심해': '심해',
    '파생': '파생' // 파생은 코드명 규칙이 다름
};

const SHAPE_TYPES = ['P', 'F', 'O', 'C'];

const injuryParts = [
    'head', 'neck', 'leftEye', 'rightEye', 
    'leftArm','leftHand','leftLeg','leftFoot',
    'torso','rightArm','rightHand','rightLeg','rightFoot'
];

const mapKeyToLabel = {
    head: '머리',
    neck: '목',
    leftEye: '왼쪽 안구',
    rightEye: '오른쪽 안구',
    leftArm: '왼팔',
    leftHand: '왼손',
    leftLeg: '왼다리',
    leftFoot: '왼발',
    torso: '상체',
    rightArm: '오른팔',
    rightHand: '오른손',
    rightLeg: '오른다리',
    rightFoot: '오른발'
};

// 랜덤 주사위
function rollDice(count, sides) {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
}

// 스텟 기반 배율: 스텟 3 기준 1.0, +0.2씩 증가, -0.2씩 감소
function getStatMultiplier(stat) {
    if (!stat || typeof stat !== 'number') return 1.0;
    return 1.0 + (stat - 3) * 0.2;
}

/**
 * 아비스 스탯 계산 (체력, 정신력, 공격, 방어, 침식)
 * @param {object} stats - strength, agility, health, mind 등 스탯
 * @param {number} currentSpirit - 현재 정신력
 * @param {number} targetSpirit - 상대 정신력
 */
function calculateAbyssStats(stats, currentSpirit = null, targetSpirit = null) {
    const str = stats.strength || 0;
    const agi = stats.agility || 0;
    const health = stats.health || 0;
    const mind = stats.mind || 0;

    // 최대 체력/정신력
    const maxHp = (health * 10) + 50;
    const maxMp = (mind * 10) + 50;

    // 배율 계산
    const strMultiplier = getStatMultiplier(str);
    const agiMultiplier = getStatMultiplier(agi);

    // 공격: (1d12+12) × 근력 배율
    const physicalAttack = (rollDice(1, 12) + 12) * strMultiplier;

    // 방어 배율: 받은 데미지 × 민첩 배율
    const defenseMultiplier = agiMultiplier;

    // 침식 저항: (정신력×10)+15
    const erosionResistance = (mind * 10) + 15;

    // 침식 데미지: (4d6+5) × (1 + (100 - 현재 정신력) * 0.002) × (1 + 상대 정신력 * 0.02)
    let erosionDamage = null;
    if (currentSpirit !== null && targetSpirit !== null) {
        const baseErosion = rollDice(4, 6) + 5;
        erosionDamage = baseErosion * (1 + (100 - currentSpirit) * 0.002) * (1 + targetSpirit * 0.02);
    }

    return {
        maxHp,
        maxMp,
        physicalAttack,
        defenseMultiplier,
        erosionResistance,
        mentalAttack
    };
}

/* =========================================================
    어드민 확인
========================================================= */

async function isAdminUser() {
    const user = auth.currentUser;
    if (!user) return false;
    try {
        // 'users' 컬렉션에서 사용자 UID로 문서 조회
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        // 사용자가 존재하고 역할(role)이 'admin'인지 확인
        return uDoc.exists() && uDoc.data().role === 'admin';
    } catch(e) {
        console.error('isAdminUser check failed:', e);
        return false;
    }
}

/* =========================================================
    css
========================================================= */

/* =========================================================
    메세지 출력
========================================================= */

// 공통 스타일 적용 함수
function applyStyles(el, styles) {
    Object.assign(el.style, styles);
}

// 브라우저 상단 메시지 표시
function showMessage(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `in-browser-msg ${type}`;
    el.textContent = msg;

    applyStyles(el, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#222',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '6px',
        zIndex: 9999,
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        fontFamily: 'sans-serif',
        textAlign: 'center'
    });

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

// 브라우저 전체 확인 팝업
function showConfirm(msg) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'fullscreen confirm-popup';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div>${msg}</div>
            <div style="display:flex; justify-content:center; gap:12px; margin-top:12px;">
                <button class="btn confirm-yes">확인</button>
                <button class="btn confirm-no">취소</button>
            </div>
        `;

        applyStyles(overlay, {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000
        });

        applyStyles(card, {
            maxWidth: '400px',
            width: '90%',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            textAlign: 'center'
        });

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        const yesBtn = card.querySelector('.confirm-yes');
        if (yesBtn) {
            yesBtn.addEventListener('click', () => { 
                resolve(true); 
                overlay.remove(); 
            });
        }

        const noBtn = card.querySelector('.confirm-no');
        if (noBtn) {
            noBtn.addEventListener('click', () => { 
                resolve(false); 
                overlay.remove(); 
            });
        }
    });
}

/* =========================================================
    UI 관련
========================================================= */

function renderDangerStars(level, max = 5) {
    return '★'.repeat(level) + '☆'.repeat(max - level);
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

/* =========================================================
    컬러 코드
========================================================= */

/**
 * 단색 프로필 배경 밝기 계산 (대략)
 * @param {string} hex - 16진수 색상 코드 (#RRGGBB)
 * @returns {number} 밝기 값
 */
function getBrightness(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return (r*299 + g*587 + b*114)/1000;
}

function calculatePartColor(injury, contamination) {
    // 0~100 스케일을 0~1로 변환
    const i = Math.min(100, injury) / 100;
    const c = Math.min(100, contamination) / 100;

    // R: 오염도 기반, G: 낮게 유지, B: 부상+오염 기반
    let r = Math.round(i * 10 + c * 100);
    let g = Math.round(i * 10 + c * 10);
    let b = Math.round(i * 150 + c * 150);

    // 부상/오염 모두 없으면 매우 옅은 색
    if (i === 0 && c === 0) return 'rgba(255, 255, 255, 0.1)';

    // 색상 포화도 보정 (최대값 제한)
    r = Math.min(200, r + 50);
    g = Math.min(200, g + 50);
    b = Math.min(255, b + 50);

    return `rgb(${r}, ${g}, ${b})`;
}

function randomHex(){
    const r = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    const g = Math.floor(Math.random() * 256).toString(16).padStart(2, '0'); 
    const b = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return '#' + r + g + b;
}

/* =========================================================
   방사형 그래프 만들기
========================================================= */

const radarCharts = {};

// 얘는 평소에 쓰이는 거
/**
 * 범용 레이더 차트 생성/업데이트
 * @param {string} containerClass 차트를 그릴 div 클래스
 * @param {string[]} labels 축 이름
 * @param {number[]} data 값
 * @param {number} max 최대값
 * @param {string} bgColor 배경색
 * @param {string} borderColor 테두리색
 */
function drawRadarChart(containerClass, labels, data, max = 5, bgColor = 'rgba(0,0,0,0.1)', borderColor = '#000') {
    const container = document.querySelector(`.${containerClass}`);
    if (!container) return;

    // 기존 캔버스 제거 후 새 캔버스 생성
    container.innerHTML = `<canvas id="${containerClass}-canvas"></canvas>`;
    const ctx = document.getElementById(`${containerClass}-canvas`);
    if (!ctx) return;

    if (radarCharts[containerClass]) radarCharts[containerClass].destroy();

    const clamp = v => Math.max(0, Number(v));

    radarCharts[containerClass] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: '스테이터스 레벨',
                data: data.map(clamp),
                backgroundColor: bgColor,
                borderColor: borderColor,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: borderColor
            }]
        },
        options: {
            responsive: true,
            aspectRatio: 1,
            scales: {
                r: {
                    min: 0,
                    max: max,
                    ticks: {
                        stepSize: 1,
                        color: 'rgba(255,255,255,0.7)',
                        backdropColor: 'rgba(0,0,0,0.5)'
                    },
                    pointLabels: {
                        color: 'rgba(255,255,255,0.9)',
                        font: { size: 11 }
                    },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    angleLines: { color: 'rgba(255,255,255,0.2)' }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// 세부 정보 테이블(직원 탭에 넣어야지)

/**
 * 스테이터스 객체를 받아서 신체/정신 차트 그리기
 * @param {object} stats 스테이터스 객체
 */
function initStatsRadarCharts(stats) {
    if (typeof Chart === 'undefined') return console.warn('Chart.js library not loaded');

    // 신체 스테이터스
    drawRadarChart(
        'chart-container-1',
        ['근력','민첩','지구력','유연성','시각','청각','상황 인지 능력','반응속도'],
        [stats.muscle, stats.agility, stats.endurance, stats.flexibility, stats.visual, stats.auditory, stats.situation, stats.reaction],
        5,
        'rgba(255,99,132,0.2)',
        'rgb(255,99,132)'
    );

    // 정신 스테이터스
    drawRadarChart(
        'chart-container-2',
        ['지능','판단력','기억력','정신력','의사 결정 능력','스트레스 내성'],
        [stats.intellect, stats.judgment, stats.memory, stats.spirit, stats.decision, stats.stress],
        5,
        'rgba(54,162,235,0.2)',
        'rgb(54,162,235)'
    );
}

/* =========================================================
   가로형 테이블
========================================================= */

function renderHorizontalTable(title, rows, isAdmin, isStatLike = false) {
    const rowHtml = rows.map(row => {
        const inputId = `${isStatLike ? 'stat' : 'person'}${row.label.replace(/\s/g, '')}`;
        const valueContent = isAdmin
            ? (row.isLong 
                ? `<textarea id="${inputId}" style="width:100%; min-height:60px;">${row.value}</textarea>`
                : `<input type="${typeof row.value === 'number' ? 'number' : 'text'}" id="${inputId}" value="${row.value}" style="width:100%;">`)
            : row.value;

        return `
            <tr class="horizontal-table-row">
                <td class="table-label" style="font-weight: bold; padding: 8px; background: rgba(255,255,255,0.03); width: 150px;">${row.label}</td>
                <td class="table-value" style="padding: 8px;">${valueContent}</td>
            </tr>
        `;
    }).join('');

    return `
        <table class="data-table horizontal" style="width:100%; margin-top:10px; border-collapse:collapse;">
            <tbody>${rowHtml}</tbody>
        </table>
    `;
}


/* =========================================================
    시간 함수
========================================================= */
 
// 현재 시간 확인. 사이드 바에 띄우는 용
function startClock() {
    function tick() {
        const d = new Date();
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        if(nowTimeEl) nowTimeEl.textContent = d.toLocaleString(undefined, options);
    }
    tick();
    setInterval(tick, 1000);
}

// 메세지 표시에 사용, 몇 시간 전이었는지 표시한다
function fmtTime(timestamp) {
    if (!timestamp || !timestamp.seconds) return ''; 
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    // 24시간 이내: 상대 시간 표시
    if (diffSeconds < 60) return '방금 전';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}분 전`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}시간 전`;
    
    // 하루 이상 차이날 경우 YYYY.MM.DD 형식으로 표시
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
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

/* =========================================================
    인증 상태 변화 감지 및 유지
========================================================= */

onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
        const nickname = user.displayName || '인턴 사원';

        await checkAndCreateSheet(user.uid, nickname);

        showLoggedInUI();
        renderAuthArea(user);
        initNav();
        loadTab('main');
        startClock();
        subscribeSystem();

        await renderMain();
        await renderMap();
        await renderStaff();
        await renderDex();
        await renderMe();

    } else {
        currentUser = null;

        // 로그아웃 UI
        showLogOutUI();
    }
});

async function getCurrentUserSheetId() {
    if (auth.currentUser) return auth.currentUser.uid;

    return new Promise(resolve => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            unsubscribe();
            resolve(user ? user.uid : null);
        });
    });          
}

async function checkAndCreateSheet(uid, nickname) {
    const isAdmin = await isAdminUser();
    if (isAdmin) return; // 어드민이면 시트 생성 안 함

    const sheetDocRef = doc(db, 'sheets', uid);
    const sheetDoc = await getDoc(sheetDocRef);

    if (!sheetDoc.exists()) {
        const defaultSheetData = createDefaultSheet(uid, nickname);
        await setDoc(sheetDocRef, defaultSheetData);
        console.log(`Default sheet created for user: ${uid}`);

        openNewUserCustomization(uid, nickname);
    }
}

/* =========================================================
    댓글
========================================================= */

// 댓글 카드. 미리보기+더보기랑 댓글 입력...
/**
 * 댓글 카드 생성
 * @param {string} id - 댓글 대상 ID (맵, 덱 등)
 * @param {string} dbCollection - 댓글이 저장될 Firestore 컬렉션 이름
 * @returns {HTMLElement} 댓글 카드 DOM
 */
function renderCommentCard({ id, dbCollection = 'maps' }) {
    const el = document.createElement('div');
    el.className = 'comment-card card';
    el.innerHTML = `
        <div class="comment-card-inner" data-id="${id}">
            <div class="comment-input-area" style="margin-bottom: 15px;">
                <input type="text" id="commentInput-${id}" placeholder="댓글 작성 (엔터로 등록)"
                       style="width:100%; padding:8px; border-radius:6px; background:transparent; border:1px solid rgba(255,255,255,0.1); color:inherit;">
            </div>
            <div class="comments-preview">
                <div class="comments-count muted">댓글 0개</div>
                <div class="comments-list"></div>
                <div class="comments-more" style="display:none">
                    <button class="link more-comments">더보기</button>
                </div>
            </div>
        </div>
    `;

    attachCommentListeners({ el, id, dbCollection });
    return el;
}

// 버튼 이벤트+미리보기 로드
function attachCommentListeners({ el, id, dbCollection }) {
    const inputEl = el.querySelector(`#commentInput-${id}`);

    if (inputEl) {
        inputEl.addEventListener('keydown', async e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const text = inputEl.value.trim();
                if (!text) return;
                await postComment({ id, text, dbCollection });
                inputEl.value = '';
                loadCommentPreview({ el, id, dbCollection });
            }
        });
    }

    el.querySelector('.more-comments')?.addEventListener('click', () => openCommentsPopup(id, dbCollection));

    loadCommentPreview({ el, id, dbCollection });
}

// db에서 댓글 불러와서 미리보기 표시
async function loadCommentPreview({ el, id, dbCollection }) {
    try {
        const snap = await getDocs(collection(db, dbCollection, id, 'comments'));

        if (!id || !dbCollection) {
            console.error('댓글 로드 실패: 경로 정보 누락', { id, dbCollection });
            return;
        }

        const arr = [];
        snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
        arr.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        const preview = arr.slice(0, 3);

        const listEl = el.querySelector('.comments-list');
        const countEl = el.querySelector('.comments-count');
        countEl.textContent = `댓글 ${arr.length}개`;

        if (!preview.length) listEl.innerHTML = `<div class="muted">댓글이 없습니다.</div>`;
        else {
            listEl.innerHTML = '';
            preview.forEach(async c => {
                const brightness = getBrightness(c.userColor || '#CCCCCC');
                const iconColor = brightness > 125 ? 'black' : 'white';
                const item = document.createElement('div');
                item.className = 'comment-item';
                item.dataset.id = c.id;
                item.dataset.uid = c.uid;
                item.style.display = 'flex';
                item.style.gap = '10px';
                item.style.marginBottom = '10px';
                item.innerHTML = `
                    <div style="width:30px; height:30px; border-radius:50%; background-color:${c.userColor||'#CCCCCC'};
                                display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <span class="material-icons" style="font-size:20px; color:${iconColor}">person</span>
                    </div>
                    <div style="flex-grow:1;">
                        <div style="font-weight:bold;">${c.name||'익명'}</div>
                        <div style="font-size:0.8em; color:#aaa;">${fmtTime(c.createdAt)}${c.editedAt ? ' (수정됨)' : ''}</div>
                        <div class="comment-text">${c.text}</div>
                        <div class="comment-actions" style="display:none; margin-top:5px;">
                            <button class="comment-edit btn small">수정</button>
                            <button class="comment-delete btn small danger">삭제</button>
                        </div>
                    </div>
                `;
                listEl.appendChild(item);

                // 수정/삭제 버튼 활성화
                const isManager = await isAdminUser();
                const isOwner = auth.currentUser && auth.currentUser.uid === c.uid;

                if (isManager || isOwner) {
                    const actions = item.querySelector('.comment-actions');
                    actions.style.display = 'block';

                    const editBtn = actions.querySelector('.comment-edit');
                    const deleteBtn = actions.querySelector('.comment-delete');

                    editBtn.addEventListener('click', async () => {
                        const originalText = item.querySelector('.comment-text').textContent;
                        const newText = prompt('댓글 내용을 수정하시오.', originalText);
                        if (newText) {
                            await updateDoc(doc(db, dbCollection, id, 'comments', c.id), {
                                text: newText,
                                editedAt: serverTimestamp()
                            });
                            loadCommentPreview({ el, id, dbCollection });
                        }
                    });

                    deleteBtn.addEventListener('click', async () => {
                        if (await showConfirm('정말로 이 댓글을 삭제하시겠습니까?')) {
                            await deleteDoc(doc(db, dbCollection, id, 'comments', c.id));
                            loadCommentPreview({ el, id, dbCollection });
                        }
                    });
                }
            });
        }

        const moreBtn = el.querySelector('.more-comments');
        moreBtn.style.display = arr.length > 3 ? 'inline-block' : 'none';

    } catch(e) {
        console.error('댓글 로드 실패', e);
    }
}

// 댓글 등록
async function postComment({ id, text, dbCollection }) {
    const user = auth.currentUser;
    if (!user) return showMessage('로그인이 필요합니다.', 'warning');

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    await addDoc(collection(db, dbCollection, id, 'comments'), {
        uid: user.uid,
        name: userData.nickname || '익명',
        userColor: userData.colorHex || '#CCCCCC',
        text,
        createdAt: serverTimestamp(),
        editedAt: null
    });
}

/* =========================================================
    로그인
========================================================= */

// 버튼 누르면 반대로 바꿔주어요
function switchAuthMode(mode) {
    const isSignup = mode === 'signup';

    loginForm.style.display = isSignup ? 'none' : 'block';
    signupForm.style.display = isSignup ? 'block' : 'none';

    loginBoxMsg.textContent = '';
    signupBoxMsg.textContent = '';

    document.getElementById('loginTitle').textContent =
        isSignup ? '회원가입' : '로그인';
}

// 회원가입/로그인으로 가기 버튼
gotoSignupBth.addEventListener('click', () => {
    switchAuthMode('signup');
});

gotoLoginBth.addEventListener('click', () => {
    switchAuthMode('login');
});

// 엔터 누르면 자동 로그인
loginForm.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); loginBth.click(); }
});

signupForm.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); signupBth.click(); }
});

// 회원가입
signupBth.addEventListener('click', async ()=> {
    signupBoxMsg.textContent = '';

    const id = signupId.value.trim();
    const email = signupEmail.value.trim();
    const pw = signupPassword.value;
    const nick = signupNickname.value.trim();

    if (!id) {
        signupBoxMsg.textContent = '아이디를 입력해 주세요.';
        return;
    }
    if (!nick) {
        signupBoxMsg.textContent = '닉네임을 입력해 주세요.';
        return;
    }
    if (!email || !pw) {
        signupBoxMsg.textContent = '이메일과 비밀번호를 입력해 주세요.';
        return;
    }

    signupBth.disabled = true;

    try {
        const idQuery = query(
            collection(db, 'users'),
            where('id', '==', id)
        );
        const idSnap = await getDocs(idQuery);
        
        if (!idSnap.empty) {
            signupBoxMsg.textContent = '이미 사용 중인 아이디입니다.';
            return;
        }
        signupBth.disabled = true;

        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        const user = cred.user;
        const uid = user.uid;

        await updateProfile(user, {
            displayName: nick
        });

        await setDoc(doc(db, 'users', uid), {
            email,
            id,
            nickname: nick,
            colorHex: randomHex(),
            decorations: [],
            createdAt: serverTimestamp()
        });
        await setDoc(doc(db, 'staff', uid), {
            uid,
            name: nick,
            status: 'alive',
            image: '',
            silver: 0,
            desc: '',
            updatedAt: serverTimestamp()
        });

        const defaultSheet = createDefaultSheet(uid, nick);
        await setDoc(doc(db, 'sheets', uid), defaultSheet);

        console.log('cred.user:', cred.user, 'uid:', cred.user?.uid);

        signupBoxMsg.textContent = '가입 완료. 설정을 진행합니다.';

        openNewUserCustomization(uid, nick);

    } catch (e) {
        console.error(e);

        let msg = '가입 중 오류가 발생했습니다.';
        if (e.code === 'auth/email-already-in-use') {
            msg = '이미 사용 중인 이메일입니다.';
        } else if (e.code === 'auth/weak-password') {
            msg = '비밀번호가 너무 약합니다.';
        }

        signupBoxMsg.textContent = msg;
    } finally {
        signupBth.disabled = false;
    }
});

// 로그인
loginBth.addEventListener('click', async () => {
    loginBoxMsg.textContent = '';

    const id = loginId.value.trim();
    const pw = loginPassword.value;

    if (!id || !pw) {
        loginBoxMsg.textContent = '아이디와 비밀번호를 입력해 주세요.';
        return;
    }

    loginBth.disabled = true;

    try {
        const q = query(
            collection(db, 'users'),
            where('id', '==', id)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
            loginBoxMsg.textContent = '존재하지 않는 아이디입니다.';
            return;
        }

        if (snap.size > 1) {
            // 데이터 무결성 문제
            console.error('Duplicate user id:', id);
            loginBoxMsg.textContent = '계정 데이터에 문제가 있습니다.';
            return;
        }

        const { email } = snap.docs[0].data();

        await signInWithEmailAndPassword(auth, email, pw);

        loginBoxMsg.textContent = '로그인 성공.';
    } catch (e) {
        console.error(e);

        let msg = '로그인에 실패했습니다.';
        if (e.code === 'auth/wrong-password') {
            msg = '비밀번호가 올바르지 않습니다.';
        } else if (e.code === 'auth/user-disabled') {
            msg = '비활성화된 계정입니다.';
        }

        loginBoxMsg.textContent = msg;
    } finally {
        loginBth.disabled = false;
    }
});

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

function renderAuthArea(user){
    logOutEl.innerHTML = '';
    if (!user) return;

    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = '로그아웃';

    btn.addEventListener('click', async () => {
        await signOut(auth);

        // 로그아웃 시 갱신
        document.getElementById('miniProfile').textContent = '로그인 필요';
        document.getElementById('systemInfo').textContent = '불러오는 중...';

        if (staffRankEl) staffRankEl.innerHTML = '';
        if (staffStatusEl) staffStatusEl.innerHTML = '';
        if (staffScheduleEl) staffScheduleEl.innerHTML = '';
    });

    logOutEl.appendChild(btn);
}

/* =========================================================
    본인 시트 작성
========================================================= */

// 커스터마이징 팝업
function openNewUserCustomization(uid, nickname) {
    if (!window.baseStats) {
        console.error('baseStats is not defined');
        return;
    }

    if (document.getElementById('custModal')) return;

    const defaultData = createDefaultSheet(uid, nickname);
    const p = defaultData.personnel;
    const statsKeys = Object.keys(baseStats);

    let statsForm = `
        <h3 style="border-bottom:1px solid #333; padding:10px 0;">
            기본 스테이터스 설정 (총 포인트 제한: 55)
        </h3>
        <p style="color:yellow;">
            현재 사용 포인트: <span id="currentPoints">0</span> / 55
        </p>
    `;

    statsKeys.forEach(key => {
        const val = baseStats[key] || 1;
        statsForm += `
            <div class="form-row stat-row">
                <label style="width:150px;">${mapStatKeyToLabel(key)}</label>
                <input type="range"
                       id="stat-${key}"
                       min="1"
                       max="5"
                       value="${val}"
                       class="stat-slider">
                <span id="value-${key}">${val}</span>
            </div>
        `;
    });

    document.body.insertAdjacentHTML('beforeend', `
        <div id="custModal" style="position:fixed; inset:0; background:rgba(0,0,0,.8); z-index:9999;
             display:flex; justify-content:center; align-items:center;">
            <div class="card" style="width:700px; max-height:80vh; overflow-y:auto;">
                <h2>캐릭터 생성</h2>

                <div class="form-row">
                    <label>이름</label>
                    <input type="text" value="${p.name}" disabled>
                </div>

                <div class="form-row">
                    <label>성별</label>
                    <select id="custGender">
                        <option value="남성" ${p.gender === '남성' ? 'selected' : ''}>남성</option>
                        <option value="여성" ${p.gender === '여성' ? 'selected' : ''}>여성</option>
                    </select>
                </div>

                <div class="form-row">
                    <label>나이</label>
                    <input type="number" id="custAge" value="${p.age || 20}">
                </div>

                <div class="form-row">
                    <label>키</label>
                    <input type="number" id="custHeight" value="${p.height || 170}">
                </div>

                <div class="form-row">
                    <label>체중</label>
                    <input type="number" id="custWeight" value="${p.weight || 60}">
                </div>

                ${statsForm}

                <button id="saveCustomSheetBtn" class="btn primary"
                        style="width:100%; margin-top:20px;">
                    설정 저장
                </button>
            </div>
        </div>
    `);

    document.querySelectorAll('.stat-slider').forEach(slider => {
        slider.addEventListener('input', updateStatPoints);
    });

    updateStatPoints();

    document.getElementById('saveCustomSheetBtn').addEventListener('click', async () => {
        const data = collectCustomizationData();

        if (data.totalPoints > 55) {
            showMessage('스탯 포인트가 초과되었습니다.', 'error');
            return;
        }

        await saveCustomizedSheet(uid, nickname, data);
        document.getElementById('custModal')?.remove();
    });
}

function collectCustomizationData() {
    const { stats, totalPoints } = calculateStats();

    return {
        personnel: {
            gender: document.getElementById('custGender').value,
            age: Number(document.getElementById('custAge').value),
            height: Number(document.getElementById('custHeight').value),
            weight: Number(document.getElementById('custWeight').value)
        },
        stats,
        totalPoints
    };
}

function calculateStats() {
    const stats = {};
    let totalPoints = 0;

    document.querySelectorAll('.stat-slider').forEach(slider => {
        const key = slider.id.replace('stat-', '');
        const value = Number(slider.value) || 1;
        stats[key] = value;
        totalPoints += value;

        const valueEl = document.getElementById(`value-${key}`);
        if (valueEl) valueEl.textContent = value;
    });

    return { stats, totalPoints };
}

// 포인트 계산
function updateStatPoints() {
    const { totalPoints } = calculateStats();

    const currentPointsEl = document.getElementById('currentPoints');
    const saveBtn = document.getElementById('saveCustomSheetBtn');

    if (!currentPointsEl) return;

    currentPointsEl.textContent = totalPoints;
    currentPointsEl.style.color = totalPoints > 55 ? 'red' : 'lime';

    if (saveBtn) saveBtn.disabled = totalPoints > 55;
}


// 시트값 저장
async function saveCustomizedSheet(uid, nickname, data) {
    const initialSheet = createDefaultSheet(uid, nickname);

    const finalSheetData = {
        ...initialSheet,
        personnel: {
            ...initialSheet.personnel,
            ...data.personnel
        },
        stats: data.stats,
        status: {
            ...initialSheet.status,
            maxSpirit: 10 * (data.stats.spirit || 1) + 50,
            currentSpirit: 10 * (data.stats.spirit || 1) + 50
        },
        updatedAt: serverTimestamp()
    };

    try {
        await setDoc(doc(db, 'sheets', uid), finalSheetData, { merge: true });
        showMessage('캐릭터 시트 저장 완료', 'success');
        renderMe();
    } catch (e) {
        console.error(e);
        showMessage('시트 저장 실패', 'error');
    }
}

/* =========================================================
   사이드 바
========================================================= */

// 햄버거 메뉴 열기/닫기
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('show');
});

let unsubscribeMiniProfile = null;

function subscribeMiniProfile() {
    const el = document.getElementById('miniProfile');
    if (!el) return;

    const uid = auth.currentUser?.uid;
    if (!uid) {
        el.textContent = '로그인 필요';
        return;
    }

    // 중복 구독 방지
    if (unsubscribeMiniProfile) unsubscribeMiniProfile();

    const userRef = doc(db, 'users', uid);
    unsubscribeMiniProfile = onSnapshot(userRef, snap => {
        if (!snap.exists()) {
            el.textContent = '유저 정보 없음';
            return;
        }

        const d = snap.data();
        const name = d.nickname || uid;
        const silver = d.silver || 0;

        el.innerHTML = `
            <div><strong>${name}</strong></div>
            <div class="muted">은화 ${silver}</div>
        `;
    }, err => {
        console.error(err);
        el.textContent = '정보 로드 실패';
    });
}

let unsubscribeSystemStats = null;

function subscribeSystemStats() {
    const el = document.getElementById('systemInfo');
    if (!el) return;

    if (unsubscribeSystemStats) unsubscribeSystemStats();

    const usersRef = collection(db, 'users');

    unsubscribeSystemStats = onSnapshot(usersRef, snap => {
        let alive = 0, missing = 0, dead = 0, contaminated = 0;
        let maxSilver = 0, richName = '-';

        snap.forEach(docu => {
            const d = docu.data();

            switch (d.status) {
                case 'dead': dead++; break;
                case 'missing': missing++; break;
                case 'contaminated': contaminated++; break;
                default: alive++;
            }

            const silver = d.silver || 0;
            if (silver > maxSilver) {
                maxSilver = silver;
                richName = d.nickname || docu.id;
            }
        });

        el.innerHTML = `
            <div>생존 ${alive} / 실종 ${missing}</div>
            <div>오염 ${contaminated} / 사망 ${dead}</div>
            <div class="muted">최고 은화: ${richName} (${maxSilver})</div>
        `;
    }, err => {
        console.error(err);
        el.textContent = '시스템 통계 실패';
    });
}

function initSidebarRealtime() {
    startClock();
    subscribeMiniProfile();
    subscribeSystemStats();
}

initSidebarRealtime();

function cleanupSidebarSubscriptions() {
    if (unsubscribeMiniProfile) unsubscribeMiniProfile();
    if (unsubscribeSystemStats) unsubscribeSystemStats();
}

/* =========================================================
    탭 메뉴 로드
========================================================= */

async function loadTab(tabId){
    setActiveNav(tabId);
    contentEl.innerHTML = '<div class="card muted">로딩...</div>';
    switch(tabId) {
        case 'main': await renderMain(); break;
        case 'staff': await renderStaff(); break;
        case 'me': await renderMe(); break;
        case 'map': await renderMap(); break;
        case 'dex': await renderDex(); break; // [수정] renderDex 호출
        default: contentEl.innerHTML = '<div class="card">알 수 없는 탭</div>';
    }
}

function setActiveNav(tabId) {
    navEl.querySelectorAll('button').forEach( b => b.classList.toggle('active', b.dataset.tab === tabId));
}

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

/* =========================================================
   매인 탭
========================================================= */

async function renderMain() {
    contentEl.innerHTML = '';

    createMainUICards();

    // 카드 안의 요소 레퍼런스 가져오기
    const abyssFlowEl = document.getElementById('abyssFlow');
    const staffStatusEl = document.getElementById('staffStatus');
    const staffScheduleEl = document.getElementById('staffSchedule');
    const staffRankEl = document.getElementById('staffRank');
    const todayEventEl = document.getElementById('todayEvent');

    try {
        await updateAbyssFlow(abyssFlowEl);
        await updateStaffStatusAndSchedule(staffStatusEl, staffScheduleEl);
        await updateStaffRank(staffRankEl);
        if(todayEventEl) todayEventEl.textContent = '이벤트 데이터 없음';
    } catch(e) {
        console.error(e);
        contentEl.innerHTML += `<div class="card muted">데이터 로드 실패</div>`;
    }

    // 1분마다 실시간 갱신
    setInterval(() => {
        updateStaffStatusAndSchedule(staffStatusEl, staffScheduleEl);
        updateStaffRank(staffRankEl);
        updateAbyssFlow(abyssFlowEl);
    }, 60 * 1000);
}

// 카드만 넣는 함수
function createMainUICards() {
    const flowCard = document.createElement('div');
    flowCard.className = 'card';
    flowCard.innerHTML = `<div class="muted">심연 상태</div><h3 id="abyssFlow">불러오는 중...</h3>`;
    contentEl.appendChild(flowCard);

    const statusCard = document.createElement('div');
    statusCard.className = 'card';
    statusCard.innerHTML = `
        <div class="muted">직원 현황</div>
        <div id="staffStatus">불러오는 중...</div>
        <div class="muted" style="margin-top:10px;">일정</div>
        <div id="staffSchedule">불러오는 중...</div>
    `;
    contentEl.appendChild(statusCard);

    const eventCard = document.createElement('div');
    eventCard.className = 'card';
    eventCard.innerHTML = `<div class="muted">오늘의 이벤트</div><div id="todayEvent">불러오는 중...</div>`;
    contentEl.appendChild(eventCard);

    const rankCard = document.createElement('div');
    rankCard.className = 'card';
    rankCard.innerHTML = `<div class="muted">직원 순위</div><div id="staffRank">불러오는 중...</div>`;
    contentEl.appendChild(rankCard);
}

// 심연 기류
async function updateAbyssFlow(abyssFlowEl) {
    if (!abyssFlowEl) return;

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
        abyssFlowEl.textContent = '오늘 심연은 ' + flowText + '습니다.';
    } else if (cfgSnap.exists()) {
        const flows = cfgSnap.data().flows || [];
        if (flows.length > 0) {
            const picked = pickByWeight(flows);
            await setDoc(todayRef, { flowText: picked, dateKey: todayKey, updatedAt: serverTimestamp() });
            abyssFlowEl.textContent = '오늘 심연은 ' + picked + '습니다.';
        } else {
            abyssFlowEl.textContent = '기류 데이터 없음';
        }
    } else {
        abyssFlowEl.textContent = '기류 설정 없음';
    }
}

// 직원 상태 & 일정
async function updateStaffStatusAndSchedule(staffStatusEl, staffScheduleEl) {
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        let alive = 0, missing = 0, dead = 0, contaminated = 0;

        usersSnap.forEach(docu => {
            const s = docu.data().status || 'alive';
            if (s === 'alive') alive++;
            else if (s === 'missing') missing++;
            else if (s === 'dead') dead++;
            else if (s === 'contaminated') contaminated++;
        });

        if (staffStatusEl) {
            staffStatusEl.innerHTML = `생존: ${alive} | 실종: ${missing} | 오염: ${contaminated} | 사망: ${dead}`;
        }

        const dayNames = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
        const todayName = dayNames[new Date().getDay()];

        const schedSnap = await getDoc(doc(db, 'schedule', 'days'));
        if (staffScheduleEl) {
            if (schedSnap.exists()) {
                const daysData = schedSnap.data().days || {};
                const todayList = daysData[todayName] || [];
                staffScheduleEl.innerHTML = todayList.length ? todayList.map(t => `<div>${t}</div>`).join('') : `${todayName} 일정 없음`;
            } else {
                staffScheduleEl.textContent = '스케줄 데이터 없음';
            }
        }
    } catch(e) {
        console.error("updateStaffStatusAndSchedule failed:", e);
        if(staffStatusEl) staffStatusEl.textContent = '상태 불러오기 실패';
        if(staffScheduleEl) staffScheduleEl.textContent = '스케줄 불러오기 실패';
    }
}

// 직원 순위
async function updateStaffRank(staffRankEl) {
    if (!staffRankEl) return;

    const usersSnap = await getDocs(collection(db, 'users'));
    let maxSilver = -1, minDeath = 999999;
    let topSilverName = '-', topSurvivorName = '-';

    usersSnap.forEach(docu => {
        const d = docu.data();
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

    staffRankEl.innerHTML = `은화: ${topSilverName} (${maxSilver}) | 생존왕: ${topSurvivorName} (${minDeath})`;
}

/* =========================================================
   직원 탭
========================================================= */

// 일단 로드하다
async function renderStaff() {
    contentEl.innerHTML = `
        <div class="card">
            <div class="muted">직원 목록</div>
            <div id="staffList" class="staff-grid" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:20px;"></div>
        </div>
    `;

    const listEl = document.getElementById("staffList");
    const snap = await getDocs(collection(db, "sheets"));
    listEl.innerHTML = "";

    snap.forEach(docSnap => {
        const sheet = docSnap.data();
        const p = sheet.personnel || {};

        const item = document.createElement("div");
        item.className = "staff-thumb";
        item.style.cursor = "pointer";

        item.addEventListener("click", () => {
            // 클릭 시 기존 내용 초기화 후 상세 화면만 렌더
            contentEl.innerHTML = '';
            renderProfileCard(docSnap.id, sheet, contentEl);
        });

        item.innerHTML = `
            <div class="thumb-img"
                 style="background-image:url('${p.photoUrl || p.image || ''}');
                        aspect-ratio:3/4;
                        background-size:cover;
                        background-position:center;
                        border-radius:8px;">
            </div>
            <div class="thumb-name" style="text-align:center; margin-top:5px;">${p.name || '이름 없음'}</div>
        `;

        listEl.appendChild(item);
    });
}

// 세부적 프로필
async function renderProfileCard(docId, data, container) {
    const p = data.personnel || {};
    const s = data.stats || {};

    // 기존 카드 제거
    const existingCard = container.querySelector('.profile-card');
    if (existingCard) container.removeChild(existingCard);

    // 카드 래퍼
    const wrap = document.createElement('div');
    wrap.className = 'profile-card-wrap';
    wrap.style.display = 'grid';
    wrap.style.gridTemplateColumns = '1fr 1fr';
    wrap.style.gridTemplateRows = 'auto auto';
    wrap.style.width = '100%';
    wrap.style.maxWidth = '1200px';   // ← 최소 이 정도는 돼야 사람용
    wrap.style.margin = '0 auto';     // 중앙 정렬

    const card = document.createElement('div');
    card.className = 'profile-card';
    card.style.background = '#1a1a1a';
    card.style.padding = '20px';
    card.style.borderRadius = '8px';
    card.style.width = '100%';
    card.style.minHeight = '400px'; // 선택
    card.style.position = 'relative';
    card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '20px';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.addEventListener('click', () => {
    if (container.contains(wrap)) container.removeChild(wrap);
        renderStaff(); // 카드 닫으면 직원 목록 다시 렌더
    });
    card.appendChild(closeBtn);

    // 프로필 정보
    const topSection = document.createElement('div');
    topSection.style.display = 'flex';
    topSection.style.gap = '20px';
    topSection.innerHTML = `
        <div><img src="${p.image || ''}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;"></div>
        <div>
            <p>이름: ${p.name || ''}</p>
            <p>성별: ${p.gender || ''}</p>
            <p>나이: ${p.age || ''}</p>
            <p>키/체중: ${p.height || '-'} / ${p.weight || '-'}</p>
            <p>국적: ${p.nationality || ''}</p>
        </div>
    `;
    card.appendChild(topSection);

    // 스탯 / 차트 / 편집
    const bottomSection = document.createElement('div');
    bottomSection.style.display = 'flex';
    bottomSection.style.flexDirection = 'column';
    bottomSection.style.gap = '20px';

    const statsRow = document.createElement('div');
    statsRow.style.display = 'grid';
    statsRow.style.gridTemplateColumns = '1.2fr 1fr';
    statsRow.style.gap = '20px';

    statsRow.innerHTML = `
        <div>${await renderHorizontalTable('신체', [
            { label: '근력', value: s.muscle },
            { label: '민첩', value: s.agility },
            { label: '지구력', value: s.endurance },
            { label: '유연성', value: s.flexibility },
            { label: '시각', value: s.visual },
            { label: '청각', value: s.auditory },
            { label: '상황 인지', value: s.situation },
            { label: '반응속도', value: s.reaction }
        ], await isAdminUser(), true)}</div>
        <div>${await renderHorizontalTable('정신', [
            { label: '지능', value: s.intellect },
            { label: '판단력', value: s.judgment },
            { label: '기억력', value: s.memory },
            { label: '정신력', value: s.spirit },
            { label: '의사결정', value: s.decision },
            { label: '스트레스', value: s.stress }
        ], await isAdminUser(), true)}</div>
    `;

    bottomSection.appendChild(statsRow);

    const chartRow = document.createElement('div');
    chartRow.style.display = 'flex';
    chartRow.style.gap = '40px';
    chartRow.innerHTML = `
        <div id="radarChart-physical" style="width:100%;height:300px;"></div>
        <div id="radarChart-mental" style="width:100%;height:300px;"></div>
    `;
    bottomSection.appendChild(chartRow);

    if (await isAdminUser()) {
        const editBtn = document.createElement('button');
        editBtn.textContent = '편집';
        editBtn.addEventListener('click', () => openInlineEdit(docId, data, card));
        const editArea = document.createElement('div');
        editArea.appendChild(editBtn);
        bottomSection.appendChild(editArea);
    }

    card.appendChild(bottomSection);
    wrap.appendChild(card);
    container.appendChild(wrap);

    requestAnimationFrame(() => {
        initStatsRadarCharts(s, 'radarChart-physical', 'radarChart-mental');
    });
}

// 수정 버튼 눌렀을 때
async function openInlineEdit(docId, data, cardEl) {
    const p = data.personnel || {};
    const s = data.stats || {};

    // 프로필 영역 교체
    const topSection = cardEl.querySelector('.profile-top') || cardEl.children[1];
    topSection.innerHTML = `
        <div style="display:flex; gap:20px;">
            <img src="${p.image || ''}"
                 style="width:120px;height:120px;object-fit:cover;border-radius:8px;">
            <div style="display:flex; flex-direction:column; gap:6px;">
                <label>이름 <input id="editName" value="${p.name || ''}"></label>
                <label>성별 <input id="editGender" value="${p.gender || ''}"></label>
                <label>나이 <input id="editAge" type="number" value="${p.age || ''}"></label>
                <label>키 <input id="editHeight" type="number" value="${p.height || ''}"></label>
                <label>체중 <input id="editWeight" type="number" value="${p.weight || ''}"></label>
                <label>국적 <input id="editNationality" value="${p.nationality || ''}"></label>
                <label>이미지 URL <input id="editImage" value="${p.image || ''}"></label>
                <input id="editImageFile" type="file">
            </div>
        </div>
    `;

    // 스탯 테이블 영역 치환
    const statArea = cardEl.querySelector('.stats-area') || cardEl;
    statArea.innerHTML = `
        <div style="display:grid; grid-template-columns:120px 1fr 40px; gap:8px;">
            ${Object.keys(s).map(k => `
                <label>${k}</label>
                <input type="range" min="0" max="10"
                       id="edit-${k}" value="${s[k] || 0}">
                <span id="val-${k}">${s[k] || 0}</span>
            `).join('')}
        </div>

        <button id="saveInline"
            style="margin-top:15px; background:#4caf50; color:#fff;
                   border:none; padding:6px 12px; border-radius:4px;">
            저장
        </button>
    `;

    // 슬라이더 값 표시
    Object.keys(s).forEach(k => {
        const slider = document.getElementById(`edit-${k}`);
        slider.addEventListener('input', () => {
            document.getElementById(`val-${k}`).textContent = slider.value;
        });
    });

    // 저장
    document.getElementById('saveInline').addEventListener('click', async () => {
        let finalImg = document.getElementById("editImage").value;
        const file = document.getElementById("editImageFile").files[0];
        if (file) finalImg = await uploadStaffImage(file, docId);

        const newStats = {};
        Object.keys(s).forEach(k => {
            newStats[k] = Number(document.getElementById(`edit-${k}`).value);
        });

        await updateDoc(doc(db, "sheets", docId), {
            personnel: {
                ...p,
                name: editName.value,
                gender: editGender.value,
                age: Number(editAge.value),
                height: Number(editHeight.value),
                weight: Number(editWeight.value),
                nationality: editNationality.value,
                image: finalImg
            },
            stats: newStats,
            updatedAt: serverTimestamp()
        });

        renderStaff();
    });
}

/* =========================================================
   맵
========================================================= */

// 일단 맵을 열 게 한 다
async function renderMap() {
    contentEl.innerHTML = '<div class="card muted">맵 로딩중...</div>';
    const isManager = await isAdminUser();

    try {
        const snap = await getDocs(collection(db, 'maps'));
        contentEl.innerHTML = '';

        if (isManager) {
            const addBtn = document.createElement('button');
            addBtn.id = 'addMapBtn';
            addBtn.className = 'btn';
            addBtn.textContent = '새 맵 추가';
            addBtn.style.marginBottom = '20px';
            addBtn.addEventListener('click', () => openNewMapInlineEdit());
            contentEl.appendChild(addBtn);
        }

        if (snap.empty) {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'card';
            emptyCard.textContent = '등록된 맵이 없습니다.';
            contentEl.appendChild(emptyCard);
            return;
        }

        // wrapper/grid 생성
        const gridWrap = document.createElement('div');
        gridWrap.style.display = 'grid';
        gridWrap.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
        gridWrap.style.gap = '20px';

        for (const d of snap.docs) {
            const cardNode = await renderMapCard(d); // 카드 생성만
            if (cardNode) {
                cardNode.addEventListener('click', () => {
                    // 맵 목록 날리고 상세 보여주기
                    contentEl.innerHTML = '';
                    openMapPopup(d.id, contentEl);
                });
                gridWrap.appendChild(cardNode);
            }
        }

        contentEl.appendChild(gridWrap);

    } catch(e){
        console.error(e);
        contentEl.innerHTML = '<div class="card">맵 로드 실패</div>';
    }
}

// 맵 렌더링
async function renderMapCard(mapDoc) {
    const mapId = mapDoc.id;
    const data = mapDoc.data ? mapDoc.data() : mapDoc;

    const img = data.image || DEFAULT_MAP_IMAGE;
    const name = data.name || '이름 없음';
    const danger = data.danger || 1;
    const types = Array.isArray(data.types) ? data.types.join(', ') : (data.types || '');

    const el = document.createElement('div');
    el.className = 'map-card card';
    el.style.transition = 'transform 0.2s';
    el.onmouseenter = () => el.style.transform = 'scale(1.03)';
    el.onmouseleave = () => el.style.transform = 'scale(1)';

    el.innerHTML = `
        <div class="map-card-inner" data-id="${mapId}" style="display:flex; gap:20px; align-items:flex-start;">
            <div class="map-media" style="flex:1;">
                <img class="map-img" src="${img}" alt="${name}" style="width:100%; border-radius:8px; object-fit:cover;">
            </div>
            <div class="map-info-section" style="flex:2; display:flex; flex-direction:column; gap:10px;">
                <h3 class="map-name">${name}</h3>
                <p class="map-description">${data.description || ''}</p>
                <div class="map-meta" style="display:flex; gap:10px; align-items:center;">
                    <div class="map-danger">${renderDangerStars(danger)}</div>
                    <div class="map-types">출현: ${types}</div>
                </div>
                <div class="map-right-teams" style="margin-top:10px;"></div>
                <div class="map-comments-section" style="margin-top:10px;"></div>
            </div>
        </div>
    `;

    const teamsContainer = el.querySelector('.map-right-teams');
    const commentsArea = el.querySelector('.map-comments-section');

    // 탐사팀 목록
    const recentVisits = Array.isArray(data.visits) ? data.visits : [];
    for (const v of recentVisits) {
        const teamEl = document.createElement('div');
        teamEl.textContent = v.teamName;
        teamEl.style.color = v.colorHex || '#fff';
        teamEl.className = 'explore-team';
        teamEl.addEventListener('click', e => {
            e.stopPropagation(); // 클릭 전파 막기
            showTeamVisit(v, null);
        });
        teamsContainer.appendChild(teamEl);
    }

    // 댓글 렌더링
    const commentCard = renderCommentCard({ id: mapId, dbCollection: 'maps' });
    commentsArea.appendChild(commentCard);

    return el;
}

// 팝업 렌더링
async function openMapPopup(mapId, containerOrId = 'mapMainContainer') {
    const snap = await getDoc(doc(db, 'maps', mapId));
    if (!snap.exists()) return;
    const data = snap.data();

    let container;
    if (typeof containerOrId === 'string') {
        container = document.getElementById(containerOrId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerOrId;
            document.body.appendChild(container);
        }
    } else {
        container = containerOrId;
    }

    container.innerHTML = '';

    // 뒤로가기
    const backBtn = document.createElement('button');
    backBtn.textContent = '← 뒤로가기';
    backBtn.className = 'btn';
    backBtn.style.marginBottom = '20px';
    backBtn.addEventListener('click', () => renderMap());
    container.appendChild(backBtn);

    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '20px';

    /* ================= 카드 1 : 맵 소개 ================= */
    const infoCard = document.createElement('div');
    infoCard.className = 'card map-info-card';
    infoCard.innerHTML = `
        <img src="${data.image || DEFAULT_MAP_IMAGE}" style="width:100%; border-radius:6px;">
        <h3>${data.name || '이름 없음'}</h3>
        <p>${data.description || ''}</p>
        <div>위험도: ${renderDangerStars(data.danger || 1)}</div>
        <div>출현: ${Array.isArray(data.types) ? data.types.join(', ') : data.types || ''}</div>
    `;

    if (await isAdminUser()) {
        const editBtn = document.createElement('button');
        editBtn.textContent = '편집';
        editBtn.className = 'btn';
        editBtn.addEventListener('click', () => openMapInlineEdit(mapId, data));
        infoCard.appendChild(editBtn);
    }

    /* ================= 카드 2 : 격자 + 탐사팀 ================= */
    const exploreCard = document.createElement('div');
    exploreCard.className = 'card map-explore-card';
    exploreCard.style.display = 'flex';
    exploreCard.style.gap = '20px';

    // 격자
    const gridContainer = document.createElement('div');
    const rows = data.grid?.rows || 8;
    const cols = data.grid?.cols || 8;
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateRows = `repeat(${rows}, 40px)`;
    gridContainer.style.gridTemplateColumns = `repeat(${cols}, 40px)`;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.style.border = '1px solid #888';
            gridContainer.appendChild(cell);
        }
    }

    // 탐사팀
    const teamsContainer = document.createElement('div');
    teamsContainer.style.minWidth = '200px';

    for (const v of data.visits || []) {
        const teamEl = document.createElement('div');
        teamEl.textContent = v.teamName;
        teamEl.style.color = v.colorHex || '#fff';
        teamEl.className = 'explore-team';
        teamsContainer.appendChild(teamEl);
    }

    exploreCard.appendChild(gridContainer);
    exploreCard.appendChild(teamsContainer);

    /* ================= 카드 3 : 댓글 ================= */
    const commentCard = document.createElement('div');
    commentCard.className = 'card map-comment-card';
    commentCard.appendChild(renderCommentCard({ id: mapId, dbCollection: 'maps' }));

    /* ================= 조립 ================= */
    wrap.appendChild(infoCard);
    wrap.appendChild(exploreCard);
    wrap.appendChild(commentCard);

    container.appendChild(wrap);
}

// 탐사팀 클릭 시 격자 경로 표시 + 말풍선
function showTeamVisit(visit, gridContainer){
    const path = visit.path || [];
    const members = visit.members || [];

    // 먼저 모든 이전 선 제거 (필요 시)
    gridContainer.querySelectorAll('.visit-line').forEach(l=>l.remove());
    gridContainer.querySelectorAll('.visit-bubble').forEach(b=>b.remove());

    path.forEach((p, i)=>{
        const cell = gridContainer.querySelector(`.grid-cell[data-x='${p.x}'][data-y='${p.y}']`);
        if(!cell) return;

        // 경로 선
        if(i>0){
            const prev = path[i-1];
            const line = document.createElement('div');
            line.className = 'visit-line';
            line.style.position='absolute';
            line.style.height='2px';
            line.style.background='#0f0';
            line.style.left='50%';
            line.style.top='50%';
            line.style.transformOrigin='0 0';
            // 위치/길이/각도 계산
            const dx = (p.x - prev.x)*40;
            const dy = (p.y - prev.y)*40;
            const length = Math.sqrt(dx*dx+dy*dy);
            const angle = Math.atan2(dy, dx)*180/Math.PI;
            line.style.width = `${length}px`;
            line.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
            line.style.transition='width 0.5s linear';
            cell.appendChild(line);
        }

        // 특수 상황 말풍선 (사망, 실종, 오염 등)
        const events = members.filter(m=>['dead','missing','contaminated'].includes(m.status));
        events.forEach(m=>{
            const bubble = document.createElement('div');
            bubble.className='visit-bubble';
            bubble.textContent = `${m.name} ${statusText(m.status)}`;
            bubble.style.position='absolute';
            bubble.style.top='-20px';
            bubble.style.left='50%';
            bubble.style.transform='translateX(-50%)';
            bubble.style.background='rgba(255,0,0,0.8)';
            bubble.style.color='#fff';
            bubble.style.padding='2px 4px';
            bubble.style.borderRadius='4px';
            cell.appendChild(bubble);
        });
    });
}

// 상태 텍스트 변환
function statusText(status){
    switch(status){
        case 'dead': return '사망';
        case 'missing': return '실종';
        case 'contaminated': return '오염';
        case 'aborted': return '귀환 불가';
        case 'completed': return '탐사 종료';
        default: return '';
    }
}

async function openMapInlineEdit(mapId = null, data = {}) {
    const selector = mapId
        ? `.map-card-inner[data-id="${mapId}"]`
        : `.map-card-inner[data-id="new"]`;
    const cardInner = document.querySelector(selector);
    if (!cardInner) return;

    const originalContent = cardInner.innerHTML;

    const currentImage = data.image || '';
    const currentDanger = data.danger || 1;
    const currentTypes = Array.isArray(data.types) ? data.types.join(', ') : (data.types || '');

    cardInner.innerHTML = `
        <div class="map-edit-form">
            <div class="map-card-inner map-edit-layout">
                <div class="map-media">
                    <img class="map-img map-img-preview" src="${currentImage}" alt="맵 이미지">
                    <div style="margin-top:10px;">
                        <label class="muted">이미지 URL</label>
                        <input id="editMapImage" value="${currentImage}" placeholder="이미지 URL">
                    </div>
                    <div style="margin-top:10px;">
                        <label class="muted">이미지 파일 업로드</label>
                        <input id="editMapImageFile" type="file" accept="image/*">
                    </div>
                </div>
                <div class="map-main">
                    <div class="map-head" style="flex-direction: column; align-items: flex-start;">
                        <label class="muted">이름</label>
                        <input id="editMapName" class="form-control-inline" value="${data.name || ''}">
                        <div class="map-meta" style="margin-top:10px;">
                            <label class="muted">위험도 (1~5)</label>
                            <input id="editMapDanger" type="number" min="1" max="5" value="${currentDanger}" style="width:50px;">
                            <span id="dangerStars" class="muted"></span>
                        </div>
                        <div class="map-meta" style="margin-top:10px;">
                            <label class="muted">출현 타입 (쉼표 구분)</label>
                            <input id="editMapTypes" value="${currentTypes}" placeholder="예: 불, 물, 풀">
                        </div>
                    </div>
                    <div style="margin-top:20px;">
                        <label class="muted">설명</label>
                        <textarea id="editMapDesc" rows="6" style="width:100%;">${data.description || ''}</textarea>
                    </div>
                    <div style="margin-top:15px; display:flex; gap:10px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
                        <button id="saveMapInline" class="btn primary">저장</button>
                        <button id="cancelMapInline" class="btn link">취소</button>
                        <button id="deleteMapInline" class="btn danger" style="margin-left:auto;">삭제</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const imgPreview = cardInner.querySelector('.map-img-preview');
    const inputs = {
        image: document.getElementById("editMapImage"),
        file: document.getElementById("editMapImageFile"),
        danger: document.getElementById("editMapDanger"),
        name: document.getElementById("editMapName"),
        types: document.getElementById("editMapTypes"),
        desc: document.getElementById("editMapDesc")
    };

    const updateDangerStars = value => {
        const starsEl = cardInner.querySelector("#dangerStars");
        if (starsEl) starsEl.textContent = renderDangerStars(Math.min(5, Math.max(1, Number(value) || 1)));
    };
    updateDangerStars(currentDanger);

    // 이미지 미리보기
    inputs.image.addEventListener('input', () => { imgPreview.src = inputs.image.value; inputs.file.value = ''; });
    inputs.file.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => imgPreview.src = ev.target.result;
            reader.readAsDataURL(file);
            inputs.image.value = '';
        } else if (!inputs.image.value) imgPreview.src = '';
    });
    inputs.danger.addEventListener('input', e => updateDangerStars(e.target.value));

    const collectFormData = async () => {
        let finalImg = inputs.image.value;
        if (inputs.file.files[0]) finalImg = await uploadMapImage(inputs.file.files[0], mapId);
        return {
            name: inputs.name.value,
            danger: Number(inputs.danger.value),
            types: inputs.types.value.split(',').map(t => t.trim()).filter(t => t),
            description: inputs.desc.value,
            image: finalImg,
            updatedAt: serverTimestamp()
        };
    };

    const saveData = async () => {
        try {
            const newData = await collectFormData();
            await updateDoc(doc(db, "maps", mapId), newData);
            updateDangerStars(newData.danger);
        } catch(e) { console.error(e); showMessage('자동 저장 실패', 'error'); }
    };

    let saveTimeout;
    const autoSaveHandler = () => { clearTimeout(saveTimeout); saveTimeout = setTimeout(saveData, 1000); };
    Object.values(inputs).forEach(el => el.addEventListener('input', autoSaveHandler));
    Object.values(inputs).forEach(el => el.addEventListener('change', autoSaveHandler));

    const btns = {
        save: document.getElementById("saveMapInline"),
        cancel: document.getElementById("cancelMapInline"),
        delete: document.getElementById("deleteMapInline")
    };

    btns.save?.addEventListener('click', async () => { await saveData(); renderMap(); });
    btns.cancel?.addEventListener('click', () => { cardInner.innerHTML = originalContent; renderMap(); });
    btns.delete?.addEventListener('click', async () => {
        if (await showConfirm(`정말로 맵 '${data.name}'을 삭제하시겠습니까?`)) {
            try { await deleteDoc(doc(db, "maps", mapId)); showMessage('맵 삭제 완료', 'info'); renderMap(); }
            catch(e) { console.error(e); showMessage('맵 삭제 실패', 'error'); }
        }
    });

    window.addEventListener('beforeunload', saveData);
}

async function openNewMapInlineEdit() {
    const tempEl = document.createElement('div');
    tempEl.className = 'map-card card';
    tempEl.id = 'new_map_' + Date.now();
    tempEl.style.marginBottom = '20px';

    const mapAddBtn = document.getElementById('addMapBtn');
    (mapAddBtn ? mapAddBtn.after(tempEl) : contentEl.prepend(tempEl));

    const defaultDanger = 1;
    tempEl.innerHTML = `
        <div class="map-card-inner" data-id="new">
            <div class="map-edit-form">
                <h4>새 맵 생성</h4>
                <div class="map-card-inner map-edit-layout">
                    <div class="map-media">
                        <img class="map-img map-img-preview" src="" alt="맵 이미지 미리보기">
                        <div style="margin-top:10px;"><label class="muted">이미지 URL</label><input id="newMapImage" placeholder="이미지 URL"></div>
                        <div style="margin-top:10px;"><label class="muted">이미지 파일 업로드</label><input id="newMapImageFile" type="file" accept="image/*"></div>
                    </div>
                    <div class="map-main">
                        <div class="map-head" style="flex-direction: column; align-items: flex-start;">
                            <label class="muted">이름</label>
                            <input id="newMapName" class="form-control-inline" placeholder="맵 이름">
                            <div class="map-meta" style="margin-top:10px;">
                                <label class="muted">위험도 (1~5)</label>
                                <input id="newMapDanger" type="number" min="1" max="5" value="${defaultDanger}" style="width:50px;">
                                <span id="dangerStars">${renderDangerStars(defaultDanger)}</span>
                            </div>
                            <div class="map-meta" style="margin-top:10px;">
                                <label class="muted">출현 타입 (쉼표 구분)</label>
                                <input id="newMapTypes" class="form-control-inline" placeholder="예: 불, 물, 풀">
                            </div>
                        </div>
                        <div style="margin-top:20px;">
                            <label class="muted">설명</label>
                            <textarea id="newMapDesc" rows="6" style="width:100%; min-height:120px; resize:vertical;"></textarea>
                        </div>
                        <div style="margin-top:15px; display:flex; gap:10px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
                            <button id="saveNewMapInline" class="btn primary">생성</button>
                            <button id="cancelNewMapInline" class="btn link">취소</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const imgPreview = tempEl.querySelector('.map-img-preview');
    const imgUrlInput = tempEl.querySelector('#newMapImage');
    const imgFileInput = tempEl.querySelector('#newMapImageFile');
    const dangerInput = tempEl.querySelector('#newMapDanger');

    dangerInput.addEventListener('input', e => {
        const starsEl = tempEl.querySelector('#dangerStars');
        if (starsEl) starsEl.textContent = renderDangerStars(Number(e.target.value) || 1);
    });

    imgUrlInput.addEventListener('input', () => { imgPreview.src = imgUrlInput.value; imgFileInput.value = ''; });
    imgFileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => imgPreview.src = ev.target.result;
            reader.readAsDataURL(file);
            imgUrlInput.value = '';
        } else imgPreview.src = '';
    });

    tempEl.querySelector('#saveNewMapInline')?.addEventListener('click', async () => {
        if (!tempEl.querySelector('#newMapName').value) return showMessage('맵 이름을 입력해주세요.', 'error');
        try {
            const newDocRef = doc(collection(db, "maps"));
            let finalImg = imgUrlInput.value;
            if (imgFileInput.files[0]) finalImg = await uploadMapImage(imgFileInput.files[0], newDocRef.id);
            const typesArray = tempEl.querySelector('#newMapTypes').value.split(',').map(t => t.trim()).filter(t => t);
            await setDoc(newDocRef, {
                name: tempEl.querySelector('#newMapName').value,
                danger: Number(dangerInput.value),
                types: typesArray,
                description: tempEl.querySelector('#newMapDesc').value,
                image: finalImg,
                createdAt: serverTimestamp()
            });
            showMessage('새 맵 생성 완료', 'info');
            renderMap();
        } catch(e) { console.error(e); showMessage('새 맵 생성 실패', 'error'); }
    });

    tempEl.querySelector('#cancelNewMapInline')?.addEventListener('click', () => tempEl.remove());
}

/* =========================================================
   도감
========================================================= */

// 심연체들 렌더링
async function renderDex() {
    contentEl.innerHTML = '<div class="card muted">도감 정보 로딩중...</div>';
    const isManager = await isAdminUser();

    try {
        const snap = await getDocs(collection(db, 'abyssal_dex'));
        const abyssList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        const totalCount = abyssList.length;
        const completedCount = abyssList.filter(a => calculateDisclosurePercentage(a) === 100).length;

        contentEl.innerHTML = '';
        contentEl.appendChild(renderSummaryCard(completedCount, totalCount));

        if (isManager) {
            const addBtn = document.createElement('button');
            addBtn.className = 'btn';
            addBtn.style.marginBottom = '20px';
            addBtn.textContent = '새 심연체 추가 +';
            addBtn.addEventListener('click', () => createNewAbyss());

            contentEl.appendChild(addBtn);
        }

        const gridContainer = document.createElement('div');
        gridContainer.className = 'dex-grid';
        gridContainer.style = 'display:flex; flex-wrap:wrap; gap:20px; justify-content:center;';

        abyssList.forEach(abyss => {
            const card = renderDexCard(abyss, isManager);
            if (card) {
                card.addEventListener('click', () => renderDexDetail(abyss.id));
                gridContainer.appendChild(card);
            }
        });

        contentEl.appendChild(gridContainer);
    } catch(e) {
        console.error(e);
        contentEl.innerHTML = '<div class="card error">도감 정보를 로드하는 데 실패했습니다.</div>';
    }
}

async function createNewAbyss() {
    showMessage('새 심연체 순서를 계산하고 있습니다...', 'info');

    const abyssCollectionRef = collection(db, 'abyssal_dex');
    const newDocRef = doc(abyssCollectionRef);
    const newId = newDocRef.id;

    let nextDiscoverySeq = 1;

    try {
        const snap = await getDocs(abyssCollectionRef);

        // 파생 제외 최대 discoverySeq 계산
        nextDiscoverySeq =
            snap.docs
                .map(d => d.data()?.basic)
                .filter(b => b?.danger !== '파생')
                .reduce((max, b) => Math.max(max, b?.discoverySeq || 0), 0) + 1;

    } catch (e) {
        console.error("최대 discoverySeq 조회 실패:", e);
        showMessage('순서 조회 중 오류 발생. 기본값 1을 사용합니다.', 'warning');
    }

    // 초기 데이터 객체
    const initialData = {
        id: newId,
        basic: {
            discoverySeq: nextDiscoverySeq,
            danger: '유광',
            shape: 'P',
            name: `새 심연체 ${nextDiscoverySeq}`,
            derivedSeq: 0,
            image: '',
            majorDamage: '',
            deathChance: '',
            sanityChance: '',
            isPublic: {
                name: false, code: false, danger: false, shape: false, discoverySeq: false,
                majorDamage: false, deathChance: false, sanityChance: false, image: false
            }
        },
        stats: {
            strength: 1, health: 1, agility: 1, mind: 1,
            isPublic: { strength: false, health: false, agility: false, mind: false }
        },
        management: {
            basicInfo: [{ label: '기본 정보', value: '초기 관리 정보', isPublic: false }],
            collectionInfo: [{ label: '채취 정보', value: '초기 채취 정보', isPublic: false }],
            otherInfo: [{ label: '기타 정보', value: '초기 기타 정보', isPublic: false }]
        },
        logs: [{ title: '기본 일지', content: '기록 시작', createdAt: new Date(), isPublic: true }],
        comments: [],
        createdAt: serverTimestamp()
    };

    // 코드명 생성
    initialData.basic.code = generateAbyssCode(
        initialData.basic.danger,
        initialData.basic.shape,
        initialData.basic.discoverySeq,
        initialData.basic.derivedSeq
    );

    // DB 저장 + 편집 화면 호출
    try {
        await setDoc(newDocRef, initialData);
        showMessage(`새 심연체 [${initialData.basic.code}] 템플릿 추가 완료. 내용을 편집하세요.`, 'info');
        renderDexDetail(newId, true, initialData);
    } catch (e) {
        console.error("새 심연체 추가 실패:", e);
        showMessage('새 심연체 추가 실패', 'error');
    }
}

function generateAbyssCode(danger, shape, discoverySeq, derivedSeq) {
    const dangerCode = DANGER_TYPES[danger] || ''
    const shapeCode = shape || '';
    
    discoverySeq = discoverySeq || 0;
    derivedSeq = derivedSeq || 0;

    if (danger === '파생' && derivedSeq > 0) {
        return `${shapeCode}${discoverySeq}-${derivedSeq}`;
    } else {
        return `${dangerCode}-${shapeCode}${discoverySeq}`;
    }
}

// 개방된 심연체 퍼센트
function renderSummaryCard(completed, total) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '20px';
    card.innerHTML = `
        <h2>도감 개방 현황: ${completed} / ${total}</h2>
        <p class="muted">총 ${total}개의 심연체 중 ${completed}개의 정보가 완전히 개방되었습니다.</p>
    `;
    return card;
}

function calculateDisclosurePercentage(abyssData) {
    let totalFields = 0;
    let publicCount = 0;

    // 1. Basic
    const basicCounts = countPublicFromObject(abyssData.basic?.isPublic);
    totalFields += basicCounts.total;
    publicCount += basicCounts.publicCount;

    // 2. Stats
    const statsCounts = countPublicFromObject(abyssData.stats?.isPublic);
    totalFields += statsCounts.total;
    publicCount += statsCounts.publicCount;

    // 3. Management
    const managementKeys = ['basicInfo', 'collectionInfo', 'otherInfo'];
    managementKeys.forEach(key => {
        const items = abyssData.management?.[key] || [];
        const startIndex = key === 'basicInfo' ? 1 : 0; // 첫 항목 제외
        const counts = countPublic(items.slice(startIndex));
        totalFields += counts.total;
        publicCount += counts.publicCount;
    });

    // 4. Logs
    const logs = abyssData.logs || [];
    const logCounts = countPublic(logs.slice(1)); // 첫 로그 제외
    totalFields += logCounts.total;
    publicCount += logCounts.publicCount;

    return totalFields === 0 ? 0 : Math.min(100, Math.floor((publicCount / totalFields) * 100));
}

// 유틸 함수
function countPublic(fields) {
    let total = 0, publicCount = 0;
    fields.forEach(f => {
        total++;
        if (f.isPublic) publicCount++;
    });
    return { total, publicCount };
}

function countPublicFromObject(obj) {
    const keys = Object.keys(obj || {});
    const total = keys.length;
    const publicCount = keys.reduce((acc, k) => acc + (obj[k] ? 1 : 0), 0);
    return { total, publicCount };
}

// 심연체 카드
function renderDexCard(abyssData, isManager) {
    const { id, basic = {} } = abyssData;
    const disclosurePercent = calculateDisclosurePercentage(abyssData);

    const isImagePublic = basic.isPublic?.image || false;
    const showImage = isImagePublic || isManager;
    const imgUrl = showImage ? (basic.image || DEFAULT_PROFILE_IMAGE) : '';

    const displayName = getDisplayField(basic.name, basic.isPublic?.name, '정보 없음', isManager);
    const displayCode = getDisplayField(basic.code, basic.isPublic?.code, '???', isManager);

    const isCompletelyHidden = !isManager && !isImagePublic && !basic.isPublic?.code && !basic.isPublic?.name;
    if (isCompletelyHidden) return null;

    const borderColor = `rgb(${255 - Math.floor(disclosurePercent*2.55)}, ${Math.floor(disclosurePercent*2.55)}, 0)`;
    const cardStyles = [
        `width: calc(25% - 15px)`,
        `aspect-ratio: 1 / 1`,
        `background-size: cover`,
        `background-position: center`,
        `border: 5px solid ${borderColor}`,
        `position: relative`,
        `cursor: pointer`,
        `overflow: hidden`,
        `transition: all 0.3s`,
        showImage && imgUrl ? `background-image: url('${imgUrl}')` : `background-color: #555`
    ].filter(Boolean).join('; ');

    const el = document.createElement('div');
    el.className = 'dex-card';
    el.dataset.id = id;
    el.style.cssText = cardStyles;

    el.innerHTML = `
        <div class="dex-overlay">
            <strong>${displayName}</strong>
            <span>${displayCode}</span>
        </div>
        <div class="dex-hover-overlay">
            <strong>${displayName}</strong>
            <span>개방률: ${disclosurePercent}%</span>
        </div>
    `;

    return el;
}

function getDisplayField(value, isPublic, fallback = '???', isManager) {
    return (isPublic || isManager) ? (value || fallback) : '???';
}

// 심연체 삭제
async function deleteAbyssData(id) {
    if (!confirm('정말로 이 심연체를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return;
    }
    
    showMessage('데이터를 Firebase에서 삭제 중...', 'danger');
    try {
        await deleteDoc(doc(db, 'abyssal_dex', id));
        showMessage('삭제 완료! 도감 목록으로 돌아갑니다.', 'success');
        // 삭제 후 목록으로 돌아갑니다.
        renderDex(); 
    } catch (error) {
        console.error("Error deleting data:", error);
        showMessage('삭제 중 오류 발생', 'error');
        throw error;
    }
}

// 심연체 저장
async function saveAbyssData(id, data) {
    showMessage('데이터를 Firebase에 저장 중...', 'info');
    try {
        data.basic.code = generateAbyssCode(data.basic.danger, data.basic.shape, data.basic.discoverySeq, data.basic.derivedSeq);
        
        await setDoc(doc(db, 'abyssal_dex', id), data, { merge: true });
        showMessage('저장 완료!', 'success');
    } catch (error) {
        console.error("Error saving data:", error);
        showMessage('저장 중 오류 발생', 'error');
        throw error;
    }
}

async function renderDexDetail(id, isEditMode = false, preloadedData = null) {
    const data = await loadAbyssData(id, preloadedData);
    if (!data) return;

    const isManager = await isAdminUser();
    data.basic.code = generateAbyssCode(
        data.basic.danger, data.basic.shape, data.basic.discoverySeq, data.basic.derivedSeq
    );

    const calculatedStats = calculateAbyssStats(data.stats);
    const disclosurePercent = calculateDisclosurePercentage(data);

    // HTML 렌더링
    contentEl.innerHTML = `
        <div class="dex-detail-wrap card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <button class="btn link" id="backToDexList">← 도감 목록으로</button>
                <div style="display: flex; gap: 10px;">
                    <div style="font-size: 1.2em; color: ${disclosurePercent === 100 ? 'var(--green)' : 'var(--accent)'};">
                        개방률: ${disclosurePercent}%
                    </div>
                    ${isManager ? `<button class="btn ${isEditMode ? 'warning' : ''}" id="toggleEditMode">
                        ${isEditMode ? '저장 및 편집 종료' : '편집'}</button>` : ''}
                    ${isManager && !isEditMode ? `<button class="btn danger" id="deleteAbyssBtn">심연체 삭제</button>` : ''}
                </div>
            </div>
            ${isManager && isEditMode ? renderDisclosurePresetHtml() : ''}

            <div class="dex-sections-grid" style="
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                grid-template-rows: auto auto; 
                gap: 20px;
            ">
                <div id="basicInfoSection" style="grid-column: 1; grid-row: 1;"></div>
                <div id="statsSection" style="grid-column: 2; grid-row: 1;"></div>
                <div id="radarChartSection" style="grid-column: 1; grid-row: 2;">
                    <h3>스탯 분포</h3>
                    <div id="radarChartContainer" style="width: 100%; height: 300px;"></div>
                </div>
                <div id="managementSection" style="grid-column: 2; grid-row: 2;"></div>
            </div>

            <hr style="margin: 30px 0;">
            <div id="logsSection"></div>
            <div class="dex-comments-area" data-id="${id}"></div>
        </div>
    `;

    const commentsArea = contentEl.querySelector('.dex-comments-area');
    commentsArea.appendChild(renderCommentCard({ id, dbCollection: 'abyssal_dex' }));

    // 섹션 렌더링
    renderBasicInfoSection(document.getElementById('basicInfoSection'), data, isEditMode, isManager);
    renderStatsSection(document.getElementById('statsSection'), data, calculatedStats, isEditMode, isManager);
    renderManagementSection(document.getElementById('managementSection'), data, isEditMode, isManager);
    renderLogsSection(document.getElementById('logsSection'), data, isEditMode, isManager);

    drawRadarChart('radarChartContainer', Object.keys(calculatedStats), Object.values(calculatedStats), 5, 'rgba(0,0,0,0.1)', 'var(--accent)');

    // 이벤트
    const backBtn = document.getElementById('backToDexList');
    if (backBtn) backBtn.addEventListener('click', renderDex);

    if (isManager) {
        const toggleBtn = document.getElementById('toggleEditMode');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', async () => {
                if (isEditMode) {
                    try {
                        await saveAbyssData(id, data);
                        renderDexDetail(id, false);
                    } catch(e) {
                        console.error(e);
                        showMessage('저장 중 오류 발생', 'error');
                    }
                } else {
                    renderDexDetail(id, true);
                }
            });
        }

        const deleteBtn = document.getElementById('deleteAbyssBtn');
        if (deleteBtn) deleteBtn.addEventListener('click', () => deleteAbyssData(id));

        attachDisclosurePresetButtons(data, isEditMode, isManager);
    }
}

function renderDisclosurePresetHtml() {
    return `
        <div style="
            margin-bottom: 15px;
            border: 1px dashed var(--muted);
            padding: 10px;
            border-radius: 5px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        ">
            <strong>전체 공개/비공개 프리셋:</strong>

            <button class="btn-xs primary disclosure-preset-btn" data-section="basic" data-public="true">
                기본 정보 공개
            </button>
            <button class="btn-xs danger disclosure-preset-btn" data-section="basic" data-public="false">
                기본 정보 비공개
            </button>

            <button class="btn-xs primary disclosure-preset-btn" data-section="stats" data-public="true">
                스탯 공개
            </button>
            <button class="btn-xs danger disclosure-preset-btn" data-section="stats" data-public="false">
                스탯 비공개
            </button>

            <button class="btn-xs primary disclosure-preset-btn" data-section="management" data-public="true">
                관리 정보 공개
            </button>
            <button class="btn-xs danger disclosure-preset-btn" data-section="management" data-public="false">
                관리 정보 비공개
            </button>

            <button class="btn-xs primary disclosure-preset-btn" data-section="logs" data-public="true">
                연구 일지 공개
            </button>
            <button class="btn-xs danger disclosure-preset-btn" data-section="logs" data-public="false">
                연구 일지 비공개
            </button>
        </div>
    `;
}

async function loadAbyssData(id, preloadedData = null) {
    if (preloadedData) return preloadedData;

    contentEl.innerHTML = '<div class="card muted">상세 정보 로딩중...</div>';
    try {
        const docSnap = await getDoc(doc(db, 'abyssal_dex', id));
        if (!docSnap.exists()) throw new Error('심연체 정보를 찾을 수 없음');
        const data = docSnap.data();
        if (!data.basic) throw new Error("'basic' 정보 없음");
        return data;
    } catch (e) {
        console.error("데이터 로딩 실패:", e);
        showMessage(e.message || '데이터 로딩 중 오류 발생', 'error');
        renderDex();
        return null;
    }
}

function attachDisclosurePresetButtons(data, isEditMode, isManager) {
    if (!isManager || !isEditMode) return;

    document.querySelectorAll('.disclosure-preset-btn').forEach(button => {
        button.addEventListener('click', () => {
            const sectionKey = button.dataset.section;
            const isPublic = button.dataset.public === 'true';

            setSectionDisclosure(data, sectionKey, isPublic);

            // 섹션 UI 업데이트
            renderBasicInfoSection(document.getElementById('basicInfoSection'), data, isEditMode, isManager);
            renderStatsSection(document.getElementById('statsSection'), data, calculateAbyssStats(data.stats), isEditMode, isManager);
            renderManagementSection(document.getElementById('managementSection'), data, isEditMode, isManager);
            renderLogsSection(document.getElementById('logsSection'), data, isEditMode, isManager);

            const newPercent = calculateDisclosurePercentage(data);
            showMessage(`${sectionKey} 섹션을 ${isPublic ? '공개' : '비공개'}로 설정했습니다. 개방률: ${newPercent}%`, 'info');

            // 개방률 UI 업데이트
            const percentEl = document.querySelector('.dex-detail-wrap .gap:last-child > div');
            if (percentEl) percentEl.textContent = `개방률: ${newPercent}%`;
        });
    });
}

function renderBasicInfoSection(el, data, isEditMode, isManager) {
    const d = data.basic;
    const section = 'basic';

    // 이미지 HTML 생성
    const imgHtml = `
        <div style="width:100%; aspect-ratio:1/1; 
                    background-image: url('${d.image || ''}'); 
                    background-size: cover; background-position: center; 
                    border-radius:8px; margin-bottom:15px;"></div>
        ${isEditMode ? `
            <input type="text" id="editImageURL" placeholder="이미지 URL" value="${d.image || ''}" 
                   data-key="image" data-section="${section}" class="inline-edit-field form-control-inline" 
                   style="width:100%; margin-top:5px;">
            <input type="file" id="editImageFile" accept="image/*" style="width:100%; margin-top:5px;">
        ` : ''}
    `;

    const discoveryKey = d.danger === '파생' ? 'derivedSeq' : 'discoverySeq';
    const discoveryLabel = d.danger === '파생' ? '파생 순서' : '발견 순서';

    // 렌더링할 필드 목록
    const fields = [
        { label: '코드명', key: 'code', type: 'text', readOnly:true, hasPublicCheckbox:true },
        { label: '명칭', key: 'name', type: 'text', hasPublicCheckbox:true },
        { label: '위험도', key: 'danger', type: 'select', options:Object.keys(DANGER_TYPES), hasPublicCheckbox:false },
        { label: '외형', key: 'shape', type: 'select', options:SHAPE_TYPES, hasPublicCheckbox:false },
        { label: discoveryLabel, key: discoveryKey, type: 'number', min:1, hasPublicCheckbox:false },
        { label: '주요 피해', key: 'majorDamage', type: 'text', hasPublicCheckbox:true },
        { label: '사망 가능성', key: 'deathChance', type: 'text', hasPublicCheckbox:true },
        { label: '광기 가능성', key: 'sanityChance', type: 'text', hasPublicCheckbox:true }
    ];

    // 필드 테이블 생성
    const tableHtml = `<table class="info-table" style="width:100%;">
        ${fields.map(f => {
            const value = d[f.key] || (f.type==='number'?0:'');
            const isPublic = d.isPublic[f.key] || false;
            const masked = !isPublic && !isManager;
            const showCheckbox = isManager && isEditMode && f.hasPublicCheckbox;

            return `
            <tr class="${masked?'masked-row':''}">
                <td style="width:30%; font-weight:bold;">
                    ${showCheckbox?`<input type="checkbox" data-key="${f.key}" data-section="${section}-isPublic" ${isPublic?'checked':''} style="margin-right:5px;">`:''}
                    ${f.label}
                </td>
                <td>${masked?'<div class="masked-data"></div>': renderInlineField(f, value, isEditMode, section)}</td>
            </tr>
            `;
        }).join('')}
    </table>`;

    // 최종 HTML
    el.innerHTML = `
        <h3>기본 정보</h3>
        <div style="display:flex; gap:20px;">
            <div style="flex:0 0 200px; max-width:200px;">
                ${isManager && isEditMode ? `<input type="checkbox" data-key="image" data-section="${section}-isPublic" ${d.isPublic.image?'checked':''} style="margin-right:5px; margin-bottom:5px;"> 이미지 공개` : ''}
                ${imgHtml}
            </div>
            <div style="flex:1;">${tableHtml}</div>
        </div>
    `;

    // 이벤트 리스너 부착
    if (isEditMode) {
        el.querySelectorAll('.inline-edit-field').forEach(field => {
            field.onchange = e => {
                handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.value);
                renderBasicInfoSection(el, data, isEditMode, isManager);
            };
        });

        el.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.onchange = e => {
                const key = e.target.dataset.key;
                data.basic.isPublic[key] = e.target.checked;
            };
        });

        const fileInput = document.getElementById('editImageFile');
        fileInput?.addEventListener('change', async e => {
            const file = e.target.files[0];
            if (!file) return;

            showMessage('이미지 업로드 중...', 'info');
            try {
                const storageRef = ref(storage, `abyss_images/${data.id}_${file.name}`);
                const uploadTask = await uploadBytes(storageRef, file);
                const imageUrl = await getDownloadURL(uploadTask.ref);

                handleEditFieldChange(data, section, 'image', imageUrl);
                renderBasicInfoSection(el, data, isEditMode, isManager);
                showMessage('이미지 업로드 및 반영 완료', 'success');
            } catch (err) {
                console.error('이미지 업로드 실패:', err);
                showMessage('이미지 업로드 실패', 'error');
            }
        });
    }
}

function renderStatsSection(el, data, calculatedStats, isEditMode, isManager) {
    const d = data.stats;
    const section = 'stats';
    const statsKeys = ['strength', 'health', 'agility', 'mind'];
    const labels = { strength: '근력', health: '건강', agility: '민첩', mind: '정신력' };

    // 스테이터스 테이블 생성
    const statTable = `<table class="info-table" style="width:100%;">
        ${statsKeys.map(key => {
            const value = d[key] || 0;
            const isPublic = d.isPublic[key] ?? false;
            const masked = !isPublic && !isManager;
            const showCheckbox = isManager && isEditMode;

            return `
            <tr class="${masked?'masked-row':''}">
                <td style="width:50%; font-weight:bold;">
                    ${showCheckbox ? `<input type="checkbox" data-key="${key}" data-section="${section}-isPublic" ${isPublic?'checked':''} style="margin-right:5px;">` : ''}
                    ${labels[key]}
                </td>
                <td>${masked ? '<div class="masked-data"></div>' : renderInlineField({key, type:'number', min:1}, value, isEditMode, section)}</td>
            </tr>
            `;
        }).join('')}
    </table>`;

    // 계산된 능력치 테이블 생성
    const calcTable = `<table class="info-table" style="width:100%;">
        <tr><td style="width:50%;">최대 체력</td><td>${calculatedStats.maxHp}</td></tr>
        <tr><td>최대 정신력</td><td>${calculatedStats.maxMp}</td></tr>
        <tr><td>물리 공격력</td><td>${calculatedStats.physicalAttack}</td></tr>
        <tr><td>정신 공격력</td><td>${calculatedStats.mentalAttack}</td></tr>
    </table>`;

    // 최종 HTML
    el.innerHTML = `
        <h3>심연체 정보</h3>
        <div style="display:flex; gap:20px;">
            <div style="flex:1;">
                <h4>스테이터스</h4>
                ${statTable}
                <canvas id="radarChart-${data.id}" width="200" height="200" style="margin-top:15px;"></canvas>
            </div>
            <div style="flex:1;">
                <h4>계산된 능력치</h4>
                ${calcTable}
            </div>
        </div>
    `;

    // 이벤트 리스너 부착
    if (isEditMode) {
        el.querySelectorAll('.inline-edit-field').forEach(field => {
            field.onchange = e => {
                handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.value);
                renderDexDetail(data.id, true); // 스테이터스 변경 시 전체 상세 화면 갱신
            };
        });

        el.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.onchange = e => {
                const key = e.target.dataset.key;
                d.isPublic[key] = e.target.checked;
            };
        });
    }
}

/**
 * 데이터 객체의 필드를 실시간으로 업데이트
 * @param {Object} data - 전체 심연체 데이터 객체
 * @param {string} section - 수정할 섹션 ('basic', 'stats', 등)
 * @param {string} key - 수정할 키 (배열 포함 가능, e.g. 'basicInfo[1].value')
 * @param {any} value - 새로운 값
 */
function handleEditFieldChange(data, section, key, value) {
    if (key.includes('[')) {
        const match = key.match(/(\w+)\[(\d+)\]\.(\w+)/);
        if (match) {
            const [_, arrKey, indexStr, subKey] = match;
            const index = parseInt(indexStr);
            if (data[section]?.[arrKey]?.[index]) {
                data[section][arrKey][index][subKey] = value;
            }
        }
        return;
    }

    if (section === 'basic' && (key === 'discoverySeq' || key === 'derivedSeq')) {
        data[section][key] = Number(value);
    } 
    else if (section === 'basic' || section === 'stats') {
        data[section][key] = value;
    }

    if (section === 'basic' && ['danger', 'shape', 'discoverySeq', 'derivedSeq'].includes(key)) {
        const d = data.basic;
        data.basic.code = generateAbyssCode(d.danger, d.shape, d.discoverySeq, d.derivedSeq);
    }
}

/**
 * 관리 정보 섹션 렌더링
 * @param {HTMLElement} el - 렌더링할 컨테이너
 * @param {Object} data - 심연체 전체 데이터
 * @param {boolean} isEditMode - 편집 모드 여부
 * @param {boolean} isManager - 관리자 여부
 */
function renderManagementSection(el, data, isEditMode, isManager) {
    const d = data.management;
    const section = 'management';

    const renderArrayInfo = (key, title, labelBase) => {
        const items = d[key] || [];
        let html = `<h4>${title}</h4><table class="info-table" style="width: 100%;">`;
        let hasVisibleRows = false;

        // 안내 문구
        const emptyMessages = {
            otherInfo: '기타 정보가 존재하지 않습니다.',
            collectionInfo: '채취 정보가 존재하지 않습니다.'
        };
        const emptyMessage = emptyMessages[key] || '관리 정보가 존재하지 않습니다.';

        items.forEach((item, index) => {
            const isBasicInfoDefault = key === 'basicInfo' && index === 0;
            
            // 비관리자 + 비공개 + 기본 정보 항목 아니면 스킵
            if (!isManager && !item.isPublic && !isBasicInfoDefault) return;

            hasVisibleRows = true;
            const isPublic = item.isPublic ?? false;
            const masked = !isPublic && !isManager;
            const itemLabel = isBasicInfoDefault ? '기본 정보' : `${labelBase} (${index + 1})`;
            const isProtectedBasicInfo = isBasicInfoDefault && items.length > 1;

            html += `
                <tr class="${masked ? 'masked-row' : ''}">
                    <td style="width: 30%; font-weight: bold; vertical-align: top; padding-top: 8px;">
                        ${isManager && isEditMode ? `<input type="checkbox" data-key="${key}[${index}].isPublic" data-section="${section}" ${isPublic ? 'checked' : ''} style="margin-right: 5px;">` : ''}
                        ${itemLabel}
                        ${isManager && isEditMode && !isProtectedBasicInfo ? 
                            `<button class="btn-xs danger" data-action="delete" data-key="${key}" data-index="${index}" style="margin-left: 5px;">-</button>` : ''}
                    </td>
                    <td>
                        ${masked ? '<div class="masked-data"></div>' : renderInlineField({ key, type: 'textarea' }, item.value, isEditMode, section, index, 'value')}
                    </td>
                </tr>
            `;
        });

        if (!hasVisibleRows) {
            html += `<tr><td colspan="2" class="muted" style="text-align: center;">${emptyMessage}</td></tr>`;
        }

        if (isManager && isEditMode) {
            html += `<tr><td colspan="2"><button class="btn-xs primary" data-action="add" data-key="${key}">+ ${title} 추가</button></td></tr>`;
        }

        html += '</table>';
        return html;
    };

    el.innerHTML = `
        <h3>관리 정보</h3>
        ${renderArrayInfo('basicInfo', '관리 정보', '추가 정보')}
        ${renderArrayInfo('collectionInfo', '채취 정보', '채취 정보')}
        ${renderArrayInfo('otherInfo', '기타 정보', '기타 정보')}
    `;

    if (!isEditMode) return;

    // 인라인 편집 이벤트
    el.querySelectorAll('.inline-edit-field').forEach(field => {
        field.onchange = (e) => handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.value);
    });

    // 공개 체크박스
    el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.onchange = (e) => handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.checked);
    });

    // 추가/삭제 버튼
    el.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const key = btn.dataset.key;
            const index = parseInt(btn.dataset.index);
            const arr = data.management[key];

            if (action === 'add') {
                if (arr.length < 10) arr.push({ label: '새 정보', value: '', isPublic: false });
                else showMessage('더 이상 정보를 추가할 수 없습니다.', 'warning');
            } 
            else if (action === 'delete') {
                if (key === 'basicInfo' && index === 0 && arr.length > 1) {
                    showMessage('기본 관리 정보는 삭제할 수 없습니다. (최소 1개 유지 필요)', 'error');
                    return;
                }
                arr.splice(index, 1);
            }

            renderManagementSection(el, data, isEditMode, isManager);
        });
    });
}

/**
 * 연구 일지 섹션 렌더링
 * @param {HTMLElement} el - 렌더링할 컨테이너
 * @param {Object} data - 심연체 전체 데이터
 * @param {boolean} isEditMode - 편집 모드 여부
 * @param {boolean} isManager - 관리자 여부
 */
function renderLogsSection(el, data, isEditMode, isManager) {
    const logsData = data.logs || [];
    const section = 'logs';

    const renderLogCard = (log, index) => {
        const logLabel = index === 0 ? '기본 일지' : `연구 일지 (${index})`;
        const isPublic = log.isPublic || false;
        const masked = !isPublic && !isManager;
        const canDelete = isManager && isEditMode && logsData.length > 0;

        return `
            <div class="card log-entry ${masked ? 'masked-log' : ''}" style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin: 0;">${logLabel}</h4>
                    <span class="muted" style="font-size: 0.9em;">${log.createdAt ? fmtTime(log.createdAt) : '날짜 없음'}</span>
                </div>
                
                ${canDelete ? `<button class="btn-xs danger" data-action="delete" data-index="${index}" style="float: right;">- 삭제</button>` : ''}

                <p style="margin-top: 10px;">
                    <strong>제목:</strong> 
                    ${masked ? '<div class="masked-data"></div>' : renderInlineField({key: section, type: 'text'}, log.title, isEditMode, section, index, 'title')}
                </p>
                <p>
                    <strong>내용:</strong> 
                    ${masked ? '<div class="masked-data" style="height:50px;"></div>' : renderInlineField({key: section, type: 'textarea'}, log.content, isEditMode, section, index, 'content')}
                </p>

                ${isManager && isEditMode ? `
                    <p>
                        <input type="checkbox" data-key="${section}[${index}].isPublic" data-section="${section}" ${isPublic ? 'checked' : ''} style="margin-right:5px;"> 공개
                    </p>` : ''}
            </div>
        `;
    };

    // 일지가 없으면 안내 및 추가 버튼
    if (logsData.length === 0) {
        el.innerHTML = `
            <h3>연구 일지</h3>
            <div class="card muted" style="text-align:center; padding:20px;">연구 일지가 존재하지 않습니다.</div>
            ${isManager && isEditMode ? `<button class="btn primary" id="addLogBtn" style="margin-top:15px;">+ 연구 일지 추가</button>` : ''}
        `;
    } else {
        el.innerHTML = `
            <h3>연구 일지</h3>
            <div class="log-list">${logsData.map(renderLogCard).join('')}</div>
            ${isManager && isEditMode && logsData.length < 4 ? `<button class="btn primary" id="addLogBtn" style="margin-top:15px;">+ 연구 일지 추가</button>` : ''}
        `;
    }

    if (!isEditMode) return;

    // 인라인 편집 이벤트
    el.querySelectorAll('.inline-edit-field').forEach(field => {
        field.onchange = (e) => handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.value);
    });

    // 공개 체크박스 이벤트
    el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.onchange = (e) => handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.checked);
    });

    // 추가 버튼
    document.getElementById('addLogBtn')?.addEventListener('click', () => {
        if (logsData.length < 4) {
            logsData.push({ title: '새 일지', content: '내용 없음', createdAt: new Date(), isPublic: false });
            renderLogsSection(el, data, isEditMode, isManager);
        }
    });

    // 삭제 버튼
    el.querySelectorAll('button[data-action="delete"]').forEach(btn => {
       btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            logsData.splice(index, 1);
            renderLogsSection(el, data, isEditMode, isManager);
        });
    });
}

/**
 * 섹션 전체 공개 여부 설정
 * @param {Object} data - 심연체 전체 데이터
 * @param {string} sectionKey - 'basic', 'stats', 'management', 'logs'
 * @param {boolean} isPublic - 공개(true)/비공개(false)
 */
function setSectionDisclosure(data, sectionKey, isPublic) {
    switch(sectionKey) {
        case 'basic':
        case 'stats':
            const isPublicObj = data[sectionKey]?.isPublic;
            if (isPublicObj) {
                Object.keys(isPublicObj).forEach(key => isPublicObj[key] = isPublic);
            }
            break;

        case 'management':
            ['basicInfo', 'collectionInfo', 'otherInfo'].forEach(arrayKey => {
                data.management[arrayKey]?.forEach(item => item.isPublic = isPublic);
            });
            break;

        case 'logs':
            data.logs?.forEach(log => log.isPublic = isPublic);
            break;
    }
}

/**
 * 인라인 편집 필드 렌더링
 * @param {Object} f - 필드 설정 { key, type, readOnly, options, min }
 * @param {*} currentValue - 현재 값
 * @param {boolean} isEditMode - 편집 모드 여부
 * @param {string} section - 섹션 이름 (basic, stats, management 등)
 * @param {number|null} index - 배열 필드 인덱스 (없으면 null)
 * @param {string|null} subKey - 배열 내 서브 키 (없으면 null)
 * @returns {string} HTML 문자열
 */
function renderInlineField(f, currentValue, isEditMode, section, index = null, subKey = null) {
    // 배열 필드용 키 생성 (예: 'basicInfo[1].value')
    const key = index !== null ? `${f.key}[${index}].${subKey}` : f.key;

    if (!isEditMode || f.readOnly) return currentValue;

    switch(f.type) {
        case 'select':
            return `
                <select data-key="${key}" data-section="${section}" class="inline-edit-field form-control-inline">
                    ${f.options.map(opt => `<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
            `;
        case 'textarea':
            return `
                <textarea data-key="${key}" data-section="${section}" 
                          class="inline-edit-field form-control-inline" rows="3" style="width:100%;">${currentValue}</textarea>
            `;
        default:
            const type = f.type || 'text';
            return `
                <input type="${type}" data-key="${key}" data-section="${section}" 
                       class="inline-edit-field form-control-inline" value="${currentValue}" 
                       ${f.min !== undefined ? `min="${f.min}"` : ''} style="width:100%;">
            `;
    }
}

/* =========================================================
   내 정보
========================================================= */


// 진짜 내 정보 보여줌
async function renderMe() {
    const isAdmin = await isAdminUser();

    contentEl.innerHTML =
        '<div class="card muted">로딩중...</div>';

    try {
        // 🔴 관리자 전용 화면 (시트 없음)
        if (isAdmin) {
            contentEl.innerHTML = '';
            contentEl.appendChild(
                await renderAdminControlPanel()
            );
            return;
        }

        // 🔵 일반 사용자
        const sheetId = await getCurrentUserSheetId();
        if (!sheetId) {
            contentEl.innerHTML =
                '<div class="card muted">로그인 후 본인의 시트를 확인하세요.</div>';
            return;
        }

        const sheetData = await fetchSheetData(sheetId);

        contentEl.innerHTML = '';

        const sheetContainer = document.createElement('div');
        sheetContainer.className = 'char-sheet-container';

        const nickname =
            sheetData.personnel?.name || sheetId;

        sheetContainer.appendChild(
            renderPersonnelSection(
                sheetData.personnel,
                nickname,
                sheetId,
                false
            )
        );

        sheetContainer.appendChild(
            renderMeStatsSection(sheetData.stats, false, sheetId)
        );

        sheetContainer.appendChild(
            await renderInventorySection(sheetData.inventory, false, sheetId)
        );

        sheetContainer.appendChild(
            renderStatusSection(
                sheetData.status,
                sheetData.stats.spirit,
                false,
                sheetId
            )
        );

        contentEl.appendChild(sheetContainer);

    } catch (e) {
        console.error(e);
        contentEl.innerHTML =
            '<div class="card error">시트 로드 실패</div>';
    }
}

async function writeAdminLog(sheetId, action, detail = {}) {
    const admin = auth.currentUser;
    if (!admin) return;

    await addDoc(collection(db, 'adminLogs'), {
        sheetId,
        adminUid: admin.uid,
        action,
        detail,
        createdAt: serverTimestamp()
    });
}

async function renderAdminControlPanel() {
    const card = document.createElement('div');
    card.className = 'card admin-control-panel';

    card.innerHTML = `
        <h2>관리자 조작 패널</h2>

        <section>
            <h3>대상 선택</h3>
            <select id="adminTargetSheet">
                <option value="">선택 안 함</option>
            </select>
        </section>

        <hr>

        <div id="adminActionArea" class="muted">
            대상 시트를 선택해야 조작할 수 있음
        </div>
    `;

    await loadAdminTargetSheets(card);
    bindAdminTargetChange(card);

    return card;
}

async function loadAdminTargetSheets(root) {
    const sel = root.querySelector('#adminTargetSheet');
    const snap = await getDocs(collection(db, 'sheets'));

    snap.forEach(d => {
        const name = d.data().personnel?.name || d.id;
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${name} (${d.id})`;
        sel.appendChild(opt);
    });
}

function bindAdminTargetChange(root) {
    const sel = root.querySelector('#adminTargetSheet');
    const area = root.querySelector('#adminActionArea');

    sel.onchange = async () => {
        const sheetId = sel.value;

        if (!sheetId) {
            area.className = 'muted';
            area.innerHTML = '대상 시트를 선택해야 조작할 수 있음';
            return;
        }

        const sheetData = await fetchSheetData(sheetId);

        area.className = '';
        area.innerHTML = '';
        area.appendChild(
            await renderAdminActionPanel(sheetData, sheetId)
        );
    };
}

async function renderAdminActionPanel(sheetData, sheetId) {
    const card = document.createElement('div');

    const name = sheetData.personnel?.name || sheetId;

    card.innerHTML = `
        <p class="muted">대상: <strong>${name}</strong> (${sheetId})</p>

        <section>
            <h3>대상 인벤토리</h3>
            <div id="adminTargetInventory" class="muted">
                불러오는 중...
            </div>
        </section>

        <hr>

        <section>
            <h3>아이템 지급 / 제거</h3>
            <select id="adminItemSelect"></select>
            <input type="number" id="adminItemCount" value="1">
            <button id="giveItemBtn">적용</button>
        </section>

        <section>
            <h3>은화 증감</h3>
            <input type="number" id="adminSilverValue" value="0">
            <button id="giveSilverBtn">적용</button>
        </section>

        <section>
            <h3>스탯 증감</h3>
            <select id="adminStatKey"></select>
            <input type="number" id="adminStatDelta" value="1">
            <button id="changeStatBtn">적용</button>
        </section>

        <section>
            <h3>정신력 증감</h3>
            <input type="number" id="adminSpiritDelta" value="-10">
            <button id="changeSpiritBtn">적용</button>
        </section>

        <section>
            <h3>부상도 (랜덤 분배)</h3>

            <label>
                <input type="checkbox" id="injurySelectAll" checked>
                전체 부위 포함
            </label>

            <div id="adminInjuryParts" class="injury-checkboxes"></div>

            <label>
                선택 부위 수
                <input type="number" id="adminInjuryPickCount" value="1" min="1">
            </label>

            <label>
                총 부상도
                <input type="number" id="adminInjuryValue" value="10">
            </label>

            <button id="addInjuryBtn">적용</button>
        </section>

        <section>
            <h3>오염도 (랜덤 분배)</h3>

            <label>
                <input type="checkbox" id="contamSelectAll" checked>
                전체 부위 포함
            </label>

            <div id="adminContamParts" class="injury-checkboxes"></div>

            <label>
                선택 부위 수
                <input type="number" id="adminContamPickCount" value="1" min="1">
            </label>

            <label>
                총 오염도
                <input type="number" id="adminContaminationValue" value="5">
            </label>

            <button id="addContaminationBtn">적용</button>
        </section>

        <section>
            <h3>상태 전환</h3>
            <select id="adminState">
                <option value="normal">정상</option>
                <option value="missing">실종</option>
            </select>
            <button id="changeStateBtn">변경</button>
        </section>

        <hr>

        <section>
            <h3>아이템 DB 관리</h3>
            <input id="newItemName" placeholder="아이템 이름">
            <input id="newItemDesc" placeholder="설명">
            <button id="addItemDbBtn">아이템 추가</button>
            <select id="deleteItemSelect"></select>
            <button class="danger" id="deleteItemDbBtn">아이템 삭제</button>
        </section>
    `;

    const invBox = card.querySelector('#adminTargetInventory');
    invBox.innerHTML = renderAdminTargetStatus(sheetData);

    await loadAdminItems(card);
    fillStatKeys(card, sheetData.stats);
    bindAdminControlEvents(card, sheetId);
    fillInjuryCheckboxes(card);

    card.querySelector('#injurySelectAll').onchange = e => {
        const checked = e.target.checked;
        card.querySelectorAll('#adminInjuryParts input[type=checkbox]')
            .forEach(cb => cb.checked = checked);
    };

    return card;
}

function distributeRandomInjury(parts, pickCount, totalValue) {
    const shuffled = [...parts].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(pickCount, parts.length));

    const base = Math.floor(totalValue / picked.length);
    let remainder = totalValue % picked.length;

    const result = {};
    picked.forEach(p => {
        result[p] = base + (remainder > 0 ? 1 : 0);
        remainder--;
    });

    return result;
}

function renderAdminTargetStatus(data) {
    const inv = data.inventory || {};
    const status = data.status || {};

    const items = inv.items || {};
    const injuries = status.injuries || {};
    const contaminations = status.contaminations || {};
    const prosthetics = status.prosthetics || {};

    const itemList = Object.keys(items).length
        ? Object.entries(items)
            .map(([id, cnt]) => `<li>${id} × ${cnt}</li>`)
            .join('')
        : '<li class="muted">아이템 없음</li>';

    const injuryList = Object.keys(injuries).length
        ? Object.entries(injuries)
            .map(([part, val]) => {
                const prosthetic = prosthetics[part] ? ' (의수)' : '';
                return `<li>${mapKeyToLabel[part] || part}: ${val}${prosthetic}</li>`;
            })
            .join('')
        : '<li class="muted">부상 없음</li>';

    const contaminationList = Object.keys(contaminations).length
        ? Object.entries(contaminations)
            .map(([part, val]) => `<li>${mapKeyToLabel[part] || part}: ${val}</li>`)
            .join('')
        : '<li class="muted">오염 없음</li>';

    return `
        <div class="admin-target-status">
            <p><strong>은화:</strong> ${inv.silver || 0}</p>
            <p><strong>정신력:</strong> ${status.currentSpirit ?? 0}</p>
            <p><strong>HP:</strong> ${status.currentHP ?? 0} / ${status.maxHP ?? 0}</p>
            <p><strong>총 오염도:</strong> ${status.currentContamination ?? 0}</p>
            <p><strong>침식 수준:</strong> ${status.currentErosion ?? 0}</p>

            <hr>

            <p><strong>소지 아이템</strong></p>
            <ul>${itemList}</ul>

            <p><strong>부위별 부상/의수</strong></p>
            <ul>${injuryList}</ul>

            <p><strong>부위별 오염</strong></p>
            <ul>${contaminationList}</ul>
        </div>
    `;
}

function fillInjuryCheckboxes(card) {
    const box = card.querySelector('#adminInjuryParts');
    box.innerHTML = Object.entries(mapKeyToLabel)
        .map(([key, label]) => `
            <label>
                <input type="checkbox" value="${key}" checked>
                ${label}
            </label>
            <label>
                <input type="checkbox" value="${key}" class="prosthetic-checkbox">
                의수 적용
            </label>
        `).join('');
}

async function refreshAdminInventory(root, sheetId) {
    const snap = await getDoc(doc(db, 'sheets', sheetId));
    const box = root.querySelector('#adminTargetInventory');
    if (!box) return;
    box.innerHTML = renderAdminTargetStatus(snap.data());
}

function adminResult(ok, msg) {
    showMessage(ok ? `✔ ${msg}` : `✖ ${msg}`, ok ? 'success' : 'error');
}

function fillInjuryCheckboxes(card) {
    const box = card.querySelector('#adminInjuryParts');
    box.innerHTML = Object.entries(mapKeyToLabel).map(([key, label]) => `
        <label>
            <input type="checkbox" value="${key}" checked>
            ${label}
        </label>
    `).join('');
}


function fillStatKeys(root, stats) {
    const sel = root.querySelector('#adminStatKey');
    sel.innerHTML = '';

    Object.keys(stats).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = mapStatKeyToLabel(key);
        sel.appendChild(opt);
    });
}

async function loadAdminItems(root) {
    const sel = root.querySelector('#adminItemSelect');
    const delSel = root.querySelector('#deleteItemSelect');

    sel.innerHTML = '';
    delSel.innerHTML = '';

    const snap = await getDocs(collection(db, 'items'));

    snap.forEach(d => {
        const name = d.data().name;

        const opt1 = document.createElement('option');
        opt1.value = d.id;
        opt1.textContent = name;
        sel.appendChild(opt1);

        const opt2 = opt1.cloneNode(true);
        delSel.appendChild(opt2);
    });
}

function bindAdminControlEvents(root, sheetId) {
    const $ = sel => root.querySelector(sel);
    const clamp = (val, min) => Math.max(min, val);

    /* 아이템 지급 / 제거 */
    $('#giveItemBtn').onclick = async () => {
        try {
            const itemId = $('#adminItemSelect').value;
            const delta = Number($('#adminItemCount').value);
            if (!itemId || !delta) return;

            await updateDoc(doc(db, 'sheets', sheetId), {
                [`inventory.items.${itemId}`]: increment(delta)
            });

            await writeAdminLog(sheetId, 'item_modify', { itemId, delta });
            await refreshAdminInventory(root, sheetId);
            adminResult(true, '아이템 적용 완료');
        } catch (e) {
            console.error(e);
            adminResult(false, '아이템 적용 실패');
        }
    };

    /* 은화 */
    $('#giveSilverBtn').onclick = async () => {
        try {
            const delta = Number($('#adminSilverValue').value);
            if (!delta) return;

            const ref = doc(db, 'sheets', sheetId);
            const snap = await getDoc(ref);
            const cur = snap.data().inventory?.silver || 0;

            await updateDoc(ref, {
                'inventory.silver': clamp(cur + delta, 0)
            });

            await writeAdminLog(sheetId, 'silver_modify', { delta });
            await refreshAdminInventory(root, sheetId);
            adminResult(true, '은화 적용 완료');
        } catch (e) {
            console.error(e);
            adminResult(false, '은화 적용 실패');
        }
    };

    /* 스탯 */
    $('#changeStatBtn').onclick = async () => {
        try {
            const key = $('#adminStatKey').value;
            const delta = Number($('#adminStatDelta').value);
            if (!key || !delta) return;

            const ref = doc(db, 'sheets', sheetId);
            const snap = await getDoc(ref);
            const cur = snap.data().stats[key] || 1;

            await updateDoc(ref, {
                [`stats.${key}`]: clamp(cur + delta, 1)
            });

            await writeAdminLog(sheetId, 'stat_modify', { key, delta });
            await refreshAdminInventory(root, sheetId);
            adminResult(true, '스탯 적용 완료');
        } catch (e) {
            console.error(e);
            adminResult(false, '스탯 적용 실패');
        }
    };

    /* 정신력 */
    $('#changeSpiritBtn').onclick = async () => {
        try {
            const delta = Number($('#adminSpiritDelta').value);

            const ref = doc(db, 'sheets', sheetId);
            const snap = await getDoc(ref);
            const cur = snap.data().stats.spirit || 0;

            await updateDoc(ref, {
                'stats.spirit': clamp(cur + delta, 0)
            });

            await writeAdminLog(sheetId, 'spirit_modify', { delta });
            await refreshAdminInventory(root, sheetId);
            adminResult(true, '정신력 적용 완료');
        } catch (e) {
            console.error(e);
            adminResult(false, '정신력 적용 실패');
        }
    };

    /* 부상 랜덤 분배 */
    $('#addInjuryBtn').onclick = async () => {
        const parts = [...root.querySelectorAll('#adminInjuryParts input[type=checkbox]:not(.prosthetic-checkbox):checked')]
            .map(cb => cb.value);

        const pickCount = parseInt($('#adminInjuryPickCount').value);
        const total = parseInt($('#adminInjuryValue').value);

        if (!parts.length || pickCount <= 0 || total <= 0) {
            showMessage('부상 설정이 올바르지 않다.', 'error');
            return;
        }

        const distributed = distributeRandomInjury(parts, pickCount, total);
        if (!Object.keys(distributed).length) return;

        // 의수 체크박스
        const prostheticParts = [...root.querySelectorAll('#adminInjuryParts input.prosthetic-checkbox:checked')]
            .map(cb => cb.value);

        try {
            const ref = doc(db, 'sheets', sheetId);
            await runTransaction(db, async tx => {
                const snap = await tx.get(ref);
                const curInjuries = snap.data().status?.injuries || {};
                const curProsthetics = snap.data().status?.prosthetics || {};

                // 부상 반영
                const nextInjuries = { ...curInjuries };
                Object.entries(distributed).forEach(([p, v]) => {
                    nextInjuries[p] = (nextInjuries[p] || 0) + v;
                });

                // 의수 반영
                const nextProsthetics = { ...curProsthetics };
                prostheticParts.forEach(p => { nextProsthetics[p] = true; });

                tx.update(ref, {
                    'status.injuries': nextInjuries,
                    'status.prosthetics': nextProsthetics
                });
            });

            await writeAdminLog(sheetId, 'injury_random', distributed);
            await refreshAdminInventory(root, sheetId);
            adminResult(true, '부상/의수 적용 완료');
        } catch (e) {
            console.error(e);
            adminResult(false, '부상/의수 적용 실패');
        }
    };

    /* 오염도 */
    $('#addContaminationBtn').onclick = async () => {
        const parts = [...root.querySelectorAll('#adminContamParts input:checked')]
            .map(cb => cb.value);

        const pickCount = parseInt($('#adminContamPickCount').value);
        const total = parseInt($('#adminContaminationValue').value);

        if (!parts.length || pickCount <= 0 || total <= 0) {
            showMessage('오염 설정이 올바르지 않다.', 'error');
            return;
        }

        const distributed = distributeRandomInjury(parts, pickCount, total);

        try {
            const ref = doc(db, 'sheets', sheetId);
            await runTransaction(db, async tx => {
                const snap = await tx.get(ref);
                const curContam = snap.data().status?.contaminations || {};
                const nextContam = { ...curContam };

                Object.entries(distributed).forEach(([p, v]) => {
                    nextContam[p] = (nextContam[p] || 0) + v;
                });

                tx.update(ref, { 'status.contaminations': nextContam });
            });

            await writeAdminLog(sheetId, 'contamination_random', distributed);
            await refreshAdminInventory(root, sheetId);
            adminResult(true, '오염도 적용 완료');
        } catch (e) {
            console.error(e);
            adminResult(false, '오염도 적용 실패');
        }
    };

    /* 상태 */
    $('#changeStateBtn').onclick = async () => {
        try {
            const state = $('#adminState').value;

            await updateDoc(doc(db, 'sheets', sheetId), {
                'status.state': state,
                ...(state === 'missing'
                    ? { disappearedAt: serverTimestamp() }
                    : { disappearedAt: deleteField() })
            });

            await writeAdminLog(sheetId, 'state_change', { state });
            await refreshAdminInventory(root, sheetId);
            adminResult(true, '상태 변경 완료');
        } catch (e) {
            console.error(e);
            adminResult(false, '상태 변경 실패');
        }
    };
}


// 인적사항
function renderPersonnelSection(p, nickname, sheetId, isAdmin) {
    const section = document.createElement('div');
    section.className = 'card map-card';
    section.id = `personnel-section-${sheetId}`; // 편집 모드 참조용

    section.innerHTML = `
        <h2 style="margin-top:0;">${nickname}님의 시트</h2>
        <div class="personnel-grid">
            <div class="photo-area">
                <img src="${p.photoUrl}" alt="프로필 사진" style="width:100%; aspect-ratio: 3/4; object-fit: cover;">
            </div>
            <div class="details-area">
                ${renderHorizontalTable('표 1: 기본 정보', [
                    { label: '이름', value: p.name },
                    { label: '성별', value: p.gender },
                    { label: '나이', value: p.age },
                    { label: '키/체중', value: `${p.height}cm / ${p.weight}kg` },
                    { label: '국적', value: p.nationality }
                ], isAdmin)}

                ${renderHorizontalTable('표 2: 상세 정보', [
                    { label: '학력', value: p.education },
                    { label: '경력', value: p.career },
                    { label: '가족관계', value: p.family },
                    { label: '연락처', value: p.contact },
                    { label: '결혼 여부', value: p.marriage },
                    { label: '병력', value: p.medical },
                    { label: '범죄 전과', value: p.criminal },
                    { label: '비고', value: p.etc, isLong: true }
                ], isAdmin)}
            </div>
        </div>
    `;
    
    (async () => {
        const mySheetId = await getCurrentUserSheetId();
        if (mySheetId === sheetId) {
            const editBtn = document.createElement('button');
            editBtn.className = 'btn link admin-edit-btn';
            editBtn.textContent = '인적사항 편집';
            editBtn.addEventListener('click', () => openPersonnelEdit(sheetId, p));
            section.appendChild(editBtn);
        }
    })();

    return section;
}

function openPersonnelEdit(sheetId, p) {
    const container = document.getElementById(`personnel-section-${sheetId}`);
    if (!container) return;

    container.innerHTML = `
        <h2>${p.name}님의 인적사항 편집</h2>
        <div class="edit-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <label>이름: <input type="text" id="edit-name" value="${p.name}"></label>
            <label>성별: <input type="text" id="edit-gender" value="${p.gender}"></label>
            <label>나이: <input type="number" id="edit-age" value="${p.age}"></label>
            <label>키(cm): <input type="number" id="edit-height" value="${p.height}"></label>
            <label>체중(kg): <input type="number" id="edit-weight" value="${p.weight}"></label>
            <label>국적: <input type="text" id="edit-nationality" value="${p.nationality}"></label>
            <label>학력: <input type="text" id="edit-education" value="${p.education}"></label>
            <label>경력: <input type="text" id="edit-career" value="${p.career}"></label>
            <label>가족관계: <input type="text" id="edit-family" value="${p.family}"></label>
            <label>연락처: <input type="text" id="edit-contact" value="${p.contact}"></label>
            <label>결혼 여부: <input type="text" id="edit-marriage" value="${p.marriage}"></label>
            <label>병력: <input type="text" id="edit-medical" value="${p.medical}"></label>
            <label>범죄 전과: <input type="text" id="edit-criminal" value="${p.criminal}"></label>
            <label>비고: <textarea id="edit-etc">${p.etc}</textarea></label>
        </div>
        <button class="btn primary" id="save-personnel">저장</button>
        <button class="btn link" id="cancel-personnel">취소</button>
    `;

    container.querySelector('#cancel-personnel').onclick = () => {
        container.replaceWith(
            renderPersonnelSection(p, p.name, sheetId, false)
        );
    };

    container.querySelector('#save-personnel').onclick = async () => {
        const updated = {
            ...p,
            name: editValue('edit-name'),
            gender: editValue('edit-gender'),
            age: Number(editValue('edit-age')),
            height: Number(editValue('edit-height')),
            weight: Number(editValue('edit-weight')),
            nationality: editValue('edit-nationality'),
            education: editValue('edit-education'),
            career: editValue('edit-career'),
            family: editValue('edit-family'),
            contact: editValue('edit-contact'),
            marriage: editValue('edit-marriage'),
            medical: editValue('edit-medical'),
            criminal: editValue('edit-criminal'),
            etc: editValue('edit-etc')
        };

        try {
            await saveSheetData(sheetId, { personnel: updated });
            container.replaceWith(
                renderPersonnelSection(updated, updated.name, sheetId, false)
            );
            showMessage('인적사항이 저장되었습니다.', 'success');
        } catch (e) {
            console.error(e);
            showMessage('저장 실패', 'error');
        }
    };
}

function editValue(id) {
    return document.getElementById(id)?.value ?? '';
}

// 스텟
function renderMeStatsSection(s, isAdmin, sheetId) {
    const section = document.createElement('div');
    section.className = 'card map-card';
    section.id = `stats-section-${sheetId}`;

    const style = `
        .stats-grid-2x2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .stats-grid-2x2 > div {
            display: flex;
            flex-direction: column;
        }
        .stats-table-container {
            height: 100%; 
            display: flex;
            flex-direction: column;
        }
        .stats-table-container > div:first-child { 
            flex-grow: 1; 
        }
        .stats-row {
            display: flex;
            gap: 20px;
            flex-wrap: nowrap;
        }
        .stats-row > div {
            flex: 1;
            min-width: 0;
        }
    `;

    section.innerHTML = `
        <style>${style}</style>
        <h2>스테이터스</h2>
        <div class="stats-row">
            <div class="stats-table-container">
                ${renderHorizontalTable('표 1: 신체 스테이터스', [
                    { label: '근력', value: s.muscle },
                    { label: '민첩', value: s.agility },
                    { label: '지구력', value: s.endurance },
                    { label: '유연성', value: s.flexibility },
                    { label: '시각', value: s.visual },
                    { label: '청각', value: s.auditory },
                    { label: '상황 인지 능력', value: s.situation },
                    { label: '반응속도', value: s.reaction },
                ], isAdmin, true)}
            </div>
            <div class="chart-container-1" style="min-height:300px;"></div>
            <div class="chart-container-2" style="min-height:300px;"></div>
            <div class="stats-table-container">
                ${renderHorizontalTable('표 2: 정신 스테이터스', [
                    { label: '지능', value: s.intellect },
                    { label: '판단력', value: s.judgment },
                    { label: '기억력', value: s.memory },
                    { label: '정신력', value: s.spirit },
                    { label: '의사 결정 능력', value: s.decision },
                    { label: '스트레스 내성', value: s.stress },
                ], isAdmin, true)}
            </div>
        </div>
    `;

    (async () => {
        const mySheetId = await getCurrentUserSheetId();
        if (mySheetId === sheetId) {
            const editBtn = document.createElement('button');
            editBtn.className = 'btn link admin-edit-btn';
            editBtn.textContent = '스테이터스 편집';
            editBtn.addEventListener('click', () => openStatsEdit(sheetId, s));
            section.appendChild(editBtn);
        }
    })();

    // DOM에 삽입 후 차트 초기화
    setTimeout(() => initStatsRadarCharts(s), 0);

    return section;
}
function openStatsEdit(sheetId, s) {
    const container = document.getElementById(`stats-section-${sheetId}`);
    if (!container) return;

    container.innerHTML = `
        <h2>스탯 편집</h2>
        <div class="stats-edit-grid" style="display:grid; grid-template-columns:1fr; gap:12px;">
            ${Object.keys(s).map(key => `
                <div class="stat-slider-row">
                    <label>
                        ${key}
                        <span id="value-${key}" style="margin-left:8px;">${s[key]}</span>
                    </label>
                    <input 
                        type="range"
                        id="edit-${key}"
                        min="0"
                        max="100"
                        step="1"
                        value="${s[key]}"
                    />
                </div>
            `).join('')}
        </div>
        <div style="margin-top:16px;">
            <button class="btn primary" id="save-stats">저장</button>
            <button class="btn link" id="cancel-stats">취소</button>
        </div>
    `;

    // 슬라이더 값 실시간 표시
    Object.keys(s).forEach(key => {
        const slider = document.getElementById(`edit-${key}`);
        const valueSpan = document.getElementById(`value-${key}`);
        slider.oninput = () => {
            valueSpan.textContent = slider.value;
        };
    });

    // 취소 → 즉시 닫기
    container.querySelector('#cancel-stats').onclick = () => {
        renderMeStatsSection(s, true, sheetId);
    };

    // 저장 → 저장 후 닫기
    container.querySelector('#save-stats').onclick = async () => {
        const updated = {};
        Object.keys(s).forEach(key => {
            updated[key] = parseInt(
                document.getElementById(`edit-${key}`).value
            );
        });

        try {
            await saveSheetData(sheetId, { stats: updated });
            container.replaceWith(
                renderMeStatsSection(updated, true, sheetId)
            );
            
            showMessage('스탯이 저장되었습니다.', 'success');
        } catch (e) {
            console.error(e);
            showMessage('저장 실패', 'error');
        }
    };
}

async function saveSheetData(sheetId, updateData) {
    if (!sheetId) {
        throw new Error('sheetId is required');
    }

    const ref = doc(db, 'sheets', sheetId);

    await updateDoc(ref, updateData);
}

async function renderInventorySection(inv, isAdmin, sheetId) {
    const section = document.createElement('div');
    section.className = 'card map-card';
    section.id = `inventory-section-${sheetId}`;

    // 각 아이템 설명을 병렬로 가져오기 (desc가 있으면 바로 사용)
    const itemPromises = inv.items.map(item => item.desc ? Promise.resolve(item.desc) : fetchItemDescription(item.name));
    const descriptions = await Promise.all(itemPromises);

    let itemRows = '';
    if (inv.items.length === 0) {
        itemRows = `<tr><td colspan="4" style="text-align:center; color:#aaa;">소지한 물건이 없습니다.</td></tr>`;
    } else {
        inv.items.forEach((item, index) => {
            const desc = item.desc || descriptions[index];
            itemRows += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.name}</td>
                    <td>${desc}</td>
                    <td>${item.count}</td>
                </tr>
            `;
        });
    }

    section.innerHTML = `
        <h2>인벤토리</h2>
        <div style="margin-bottom:15px; font-weight:bold; padding:5px; background: rgba(255,255,255,0.05);">
            소지한 은화: <span style="color: gold;">${inv.silver}</span> 개
        </div>

        <table class="data-table" style="width:100%; border-collapse:collapse;">
            <thead>
                <tr>
                    <th>번호</th>
                    <th>이름</th>
                    <th>설명</th>
                    <th>수량</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
            </tbody>
        </table>
    `;

    if (isAdmin) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn link admin-edit-btn';
        editBtn.textContent = '인벤토리 편집';
        editBtn.addEventListener('click', () => openInventoryEdit(sheetId, inv));
        section.appendChild(editBtn);
    }

    return section;
}

function openInventoryEdit(sheetId, inv) {
    const container = document.getElementById(`inventory-section-${sheetId}`);
    if (!container) return;

    let itemInputs = inv.items.map((item, idx) => `
        <div style="display:flex; gap:10px; margin-bottom:5px;">
            <input type="text" value="${item.name}" placeholder="이름" id="inv-name-${idx}" style="flex:2;">
            <input type="text" value="${item.desc || ''}" placeholder="설명" id="inv-desc-${idx}" style="flex:3;">
            <input type="number" value="${item.count}" placeholder="수량" id="inv-count-${idx}" style="flex:1;">
        </div>
    `).join('');

    container.innerHTML = `
        <h2>인벤토리 편집</h2>
        <div style="margin-bottom:10px; font-weight:bold;">
            소지한 은화: <input type="number" value="${inv.silver}" id="inv-silver" style="width:80px;">
        </div>
        <div>${itemInputs}</div>
        <button class="btn primary" id="save-inventory">저장</button>
        <button class="btn link" id="cancel-inventory">취소</button>
    `;

    container.querySelector('#cancel-inventory').onclick = () => renderInventorySection(inv, true, sheetId);

    container.querySelector('#save-inventory').onclick = async () => {
        const updatedItems = inv.items.map((item, idx) => ({
            name: document.getElementById(`inv-name-${idx}`).value,
            desc: document.getElementById(`inv-desc-${idx}`).value,
            count: parseInt(document.getElementById(`inv-count-${idx}`).value)
        }));
        const updatedSilver = parseInt(document.getElementById('inv-silver').value);

        try {
            await saveSheetData(sheetId, { inventory: { items: updatedItems, silver: updatedSilver } });
            renderInventorySection({ items: updatedItems, silver: updatedSilver }, true, sheetId);
            showMessage('인벤토리가 저장되었습니다.', 'success');
        } catch(e) {
            console.error(e);
            showMessage('저장 실패', 'error');
        }
    };
}

// 부위랑 통계
function renderStatusSection(s, spiritStat, isAdmin, sheetId) {
    const section = document.createElement('div');
    section.className = 'card map-card';
    section.id = `status-section-${sheetId}`;

    // --- 체력 상태 계산 ---
    const physicalStatusText = calculatePhysicalStatus(
        s.injuries,
        s.level
    );

    // --- 오염 상태 계산 ---
    const contaminationText = calculateContaminationStatus(
        s.contaminations,
        s.level
    );

    // --- 정신력 구간 ---
    const spiritPercent = (s.currentSpirit / s.maxSpirit) * 100;
    const spiritStatusText = calculateSpiritStatus(spiritPercent);

    const humanIconHtml = renderHumanIcon(s.injuries, s.contaminations);

    const statusGridStyle = `
        .injury-status-grid-revised { display: flex; gap: 20px; align-items: stretch; }
        .injury-status-grid-revised > div { flex-grow: 1; flex-basis: 0; min-height: 400px; border: 1px solid rgba(255,255,255,0.1); padding: 10px; }
        .human-icon-container { display:flex; justify-content:center; align-items:center; background: rgba(255,255,255,0.05); }
    `;

    const mapKeyToLabelWithProsthetics = {};
    injuryParts.forEach(key => {
        const prosthetic = s.status?.prosthetics?.[key] ? ' (의수)' : '';
        mapKeyToLabelWithProsthetics[key] = mapKeyToLabel[key] + prosthetic;
    });

    section.innerHTML = `
        <style>${statusGridStyle}</style>
        <h2>현재 상태</h2>

        <div style="display:flex; align-items:center; gap:20px; margin-bottom:20px;">
            <div style="flex-grow:1;">
                <div style="font-weight:bold; margin-bottom:5px;">
                    정신력: ${s.currentSpirit} / ${s.maxSpirit} (${spiritStatusText})
                </div>
                <div style="background: rgba(255,255,255,0.1); height:15px; border-radius:4px; overflow:hidden;">
                    <div style="width:${spiritPercent}%; background:${spiritPercent>30?'green':'red'}; height:100%; transition:width 0.3s;"></div>
                </div>
            </div>
            <div style="min-width:200px; text-align:right;">
                <div style="color:${physicalStatusText==='문제 없음'?'lime':'yellow'}; font-weight:bold;">
                    현재 신체 상태: '${physicalStatusText}'
                </div>
                <div>현재 오염도: ${contaminationText}</div>
                <div>현재 침식도: ${s.currentErosion}%</div>
            </div>
        </div>

        <div class="injury-status-grid-revised">
            <div class="injury-list left-side">
                ${renderInjuryBlock(['head','neck','leftEye','rightEye'], s, mapKeyToLabelWithProsthetics)}
                ${renderInjuryBlock(['leftArm','leftHand'], s, mapKeyToLabelWithProsthetics)}
                ${renderInjuryBlock(['leftLeg','leftFoot'], s, mapKeyToLabelWithProsthetics)}
            </div>

            <div class="human-icon-container">
                ${humanIconHtml}
            </div>

            <div class="injury-list right-side">
                ${renderInjuryBlock(['torso'], s, mapKeyToLabelWithProsthetics)}
                ${renderInjuryBlock(['rightArm','rightHand'], s, mapKeyToLabelWithProsthetics)}
                ${renderInjuryBlock(['rightLeg','rightFoot'], s, mapKeyToLabelWithProsthetics)}
            </div>
        </div>

        <h3 style="margin-top:30px;">현재 통계</h3>
        ${renderHorizontalTable('현재 통계', [
            { label:'죽은 횟수', value: s.stats.deaths },
            { label:'탐사를 나간 횟수', value: s.stats.explorations },
            { label:'면담을 진행한 횟수', value: s.stats.interviews },
            { label:'소지하고 있는 소지품 수', value: s.stats.itemsCarried },
            { label:'심연체를 제압한 횟수', value: s.stats.abyssDefeated },
            { label:'소지 은화', value: s.stats.silverCarried },
        ], isAdmin, true)}
    `;

    if (isAdmin) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn link admin-edit-btn';
        editBtn.textContent = '상태 및 통계 편집';
        editBtn.addEventListener('click', () => openStatusEdit(sheetId, s));
        section.appendChild(editBtn);
    }

    return section;
}

function openStatusEdit(sheetId, s) {
    const container = document.getElementById(`status-section-${sheetId}`);
    if (!container) return;

    const editableStats = {
        currentHP: s.currentHP,
        currentSpirit: s.currentSpirit,
        currentContamination: s.currentContamination,
        currentErosion: s.currentErosion,
        ...s.stats
    };

    const statsInputs = Object.keys(editableStats).map(key => `
        <label style="display:flex; justify-content:space-between; margin-bottom:5px;">
            ${key}: <input type="number" value="${editableStats[key]}" id="status-${key}" style="width:100px;">
        </label>
    `).join('');

    container.innerHTML = `
        <h2>상태 및 통계 편집</h2>
        ${statsInputs}
        <button class="btn primary" id="save-status">저장</button>
        <button class="btn link" id="cancel-status">취소</button>
    `;

    container.querySelector('#cancel-status').onclick = () => renderStatusSection(s, s.spiritStat, true, sheetId);

    container.querySelector('#save-status').onclick = async () => {
        const updatedStats = {};
        Object.keys(editableStats).forEach(key => {
            updatedStats[key] = parseInt(document.getElementById(`status-${key}`).value);
        });

        try {
            const updatedS = { ...s, ...updatedStats };
            await saveSheetData(sheetId, { stats: updatedS.stats, currentHP: updatedS.currentHP, currentSpirit: updatedS.currentSpirit, currentContamination: updatedS.currentContamination, currentErosion: updatedS.currentErosion });
            renderStatusSection(updatedS, updatedS.spiritStat, true, sheetId);
            showMessage('상태 및 통계가 저장되었습니다.', 'success');
        } catch(e) {
            console.error(e);
            showMessage('저장 실패', 'error');
        }
    };
}

// 사람 모양을 만들어 주다
function renderHumanIcon(injuries, contaminations) {
    // 부위별 색상 계산
    const colors = {
        head: calculatePartColor(injuries.head, contaminations.head),
        torso: calculatePartColor(injuries.torso, contaminations.torso),
        leftArm: calculatePartColor(injuries.leftArm, contaminations.leftArm),
        rightArm: calculatePartColor(injuries.rightArm, contaminations.rightArm),
        leftLeg: calculatePartColor(injuries.leftLeg, contaminations.leftLeg),
        rightLeg: calculatePartColor(injuries.rightLeg, contaminations.rightLeg),
    };

    // 간단화된 사람 SVG 아이콘
    return `
        <svg viewBox="0 0 100 170" style="width:100%; max-width:250px; height:400px;">
            <!-- 머리 -->
            <path d="M50 5 A1 1 0 0 0 50 31 A1 1 0 0 0 50 5 Z"
                  fill="${colors.head}" stroke="#888" stroke-width="1"/>
            
            <!-- 상체 -->
            <path d="M35 35 L65 35 L65 90 L35 90 Z"
                  fill="${colors.torso}" stroke="#888" stroke-width="1"/>
            
            <!-- 왼팔 -->
            <path d="M35 35 L28 35 C24 35 20 39 20 43 L20 90 C20 99 32 99 32 90 L32 56 C32 55 34 53 35 53 Z"
                  fill="${colors.leftArm}" stroke="#888" stroke-width="1"/>
            
            <!-- 오른팔 -->
            <path d="M65 35 L72 35 C76 35 79 39 79 43 L80 90 C80 99 68 99 68 90 L68 56 C68 54 67 53 65 53 Z"
                  fill="${colors.rightArm}" stroke="#888" stroke-width="1"/>
            
            <!-- 왼다리 -->
            <path d="M35 90 L35 153 C35 162 48 162 48 153 L48 97 C48 96 49 95 50 95 L50 90 Z"
                  fill="${colors.leftLeg}" stroke="#888" stroke-width="1"/>
            
            <!-- 오른다리 -->
            <path d="M50 90 L50 95 C51 95 52 96 52 97 L52 153 C52 162 65 162 65 153 L65 90 Z"
                  fill="${colors.rightLeg}" stroke="#888" stroke-width="1"/>
        </svg>
    `;
}

function renderInjuryBlock(parts, status, mapKeyToLabel) {
    let detailRows = '';

    parts.forEach(key => {
        const isMainPart = mapKeyToLabel[key].startsWith('<'); // 대표 부위인지 확인
        const injury = status.injuries[key];
        const contamination = status.contaminations[key];

        const [injuryText, contaminationText] = getStatusText(injury, contamination);
        const color = calculatePartColor(injury, contamination);

        if (isMainPart) {
            // 대표 부위: 강조 표시, 부상/오염 텍스트 포함
            detailRows += `
                <div class="injury-row main-part" style="border: 1px solid ${color};">
                    <div class="part-label" style="font-weight: bold;">
                        ${mapKeyToLabel[key].replace(/[<>]/g, '')} (${injury}%, ${contamination}%)
                    </div>
                    <div class="part-content">
                        <p style="color: #ff9999; margin: 0;">부상: ${injuryText}</p>
                        <p style="color: #ccccff; margin: 0;">오염: ${contaminationText}</p>
                    </div>
                </div>
            `;
        } else {
            // 서브 부위: 왼쪽 라벨, 오른쪽 내용
            detailRows += `
                <div class="injury-row sub-part">
                    <div class="sub-label">
                        ${mapKeyToLabel[key]} (${injury}%, ${contamination}%)
                    </div>
                    <div class="sub-content" style="border-left: 1px solid rgba(255,255,255,0.1);">
                        <p style="color: #ff9999; margin: 0;">부상: ${injuryText}</p>
                        <p style="color: #ccccff; margin: 0;">오염: ${contaminationText}</p>
                    </div>
                </div>
            `;
        }
    });

    return `<div class="injury-block">${detailRows}</div>`;
}

function getStatusText(injuryPercent, contaminationPercent) {
    // 부상 텍스트
    let injuryText = injuryPercent === 0 ? "부상 없음."
                    : injuryPercent <= 10 ? "경미한 찰과상."
                    : injuryPercent <= 30 ? "타박상 및 출혈."
                    : injuryPercent <= 60 ? "깊은 상처 및 골절 가능성."
                    : "심각한 부상, 활동 불가 수준.";

    // 오염 텍스트
    let contaminationText = contaminationPercent === 0 ? "오염 없음."
                          : contaminationPercent <= 10 ? "경미한 오염, 즉시 제거 가능."
                          : contaminationPercent <= 30 ? "중간 오염, 징후 발현."
                          : contaminationPercent <= 60 ? "심각한 오염, 신체 능력 저하."
                          : "치명적인 오염, 변이 진행 중.";

    return [injuryText, contaminationText];
}

// 아이템 가져오기
async function fetchItemDescription(itemName) {
    try {
        const q = query(collection(db, 'items'), where('name', '==', itemName));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            return snap.docs[0].data().description || "설명 없음";
        }
    } catch(e) {
        console.error("Failed to fetch item description:", e);
    }
    return "설명 없음 (DB 로드 실패)";
}

// 전체 체력 상태 계산 (부위별 부상도 기반)
function calculatePhysicalStatus(injuries, healthStat) {
    // healthStat은 1~5 같은 값
    const maxHPArr = [60, 70, 80, 90, 100];
    const maxHP = maxHPArr[healthStat - 1] || 100;

    // 치명적 부위: 머리, 목
    const crit = injuries.head + injuries.neck;

    // 나머지 부위 가중치
    const minor = Math.round(
        injuries.leftEye*0.4 + injuries.rightEye*0.1 +
        injuries.leftArm*0.1 + injuries.leftHand*0.1 +
        injuries.rightArm*0.1 + injuries.rightHand*0.15 +
        injuries.torso*0.15 + injuries.leftLeg*0.15 + injuries.leftFoot*0.15 +
        injuries.rightLeg*0.15 + injuries.rightFoot*0.15
    );

    const v = crit + minor;

    const thrDeath = maxHP;
    const thrCritical = maxHP * 0.9;
    const thrMoreSerious = maxHP * 0.7;
    const thrSerious = maxHP * 0.5;
    const thrInjury = maxHP * 0.3;

    let status = '';
    if (v >= thrDeath) status = '사망';
    else if (v >= thrCritical) status = '사망 직전';
    else if (v >= thrMoreSerious) status = '심각한 중상';
    else if (v >= thrSerious) status = '중상';
    else if (v >= thrInjury) status = '부상';
    else if (v > 0) status = '사소한 부상';
    else status = '문제 없음';

    return status;
}

// 전체 오염 상태 계산 (부위별 오염도 기반)
function calculateContaminationStatus(contaminations, healthStat) {
    const maxHPArr = [60, 70, 80, 90, 100];
    const maxHP = maxHPArr[healthStat - 1] || 100;

    const v = Math.round(
        contaminations.head +
        contaminations.leftEye*0.8 +
        contaminations.rightEye*0.1 +
        contaminations.leftArm*0.1 +
        contaminations.neck +
        contaminations.rightArm*0.2 +
        contaminations.rightHand*0.1 +
        contaminations.leftHand*0.2 +
        contaminations.torso*0.1 +
        contaminations.leftLeg*0.2 +
        contaminations.leftFoot*0.1 +
        contaminations.rightLeg*0.2 +
        contaminations.rightFoot*0.1
    );

    const thrFull = maxHP;
    const thrSevere = maxHP * 0.9;
    const thrDeep = maxHP * 0.7;
    const thrPolluted = maxHP * 0.5;

    let status = '';
    if (v >= thrFull) status = '완전한 오염';
    else if (v >= thrSevere) status = '심각한 오염';
    else if (v >= thrDeep) status = '심화된 오염';
    else if (v >= thrPolluted) status = '오염';
    else if (v > 0) status = '사소한 오염';
    else status = '문제 없음';

    return status;
}

// 정신력 상태 (6개 구간)
function calculateSpiritStatus(spirit) {
    if (spirit >= 90) return '완전한 정신력';
    if (spirit >= 75) return '양호한 정신력';
    if (spirit >= 60) return '보통 수준';
    if (spirit >= 40) return '주의 필요';
    if (spirit >= 20) return '위험';
    return '정신 붕괴 직전';
}


/* =========================================================
    새 시트 만들기
========================================================= */

function createDefaultSheet(uid, nickname) {
    const injuryKeys = [
        'head','neck','leftEye','rightEye',
        'leftArm','leftHand','leftLeg','leftFoot',
        'torso','rightArm','rightHand','rightLeg','rightFoot'
    ];
    const initialInjuryState = injuryKeys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});

    // 머리 제외한 부위 의수 여부 초기화
    const prostheticsState = injuryKeys
        .filter(k => k !== 'head')
        .reduce((acc, key) => ({ ...acc, [key]: false }), {});

    const maxSpirit = (10 * (baseStats.spirit || 1)) + 50;
    const maxHP = (10 * (baseStats.spirit || 1)) + 50;

    return {
        personnel: {
            name: nickname || '인턴 사원',
            gender: '미상',
            age: 0,
            height: 0,
            weight: 0,
            nationality: '미상',
            education: '미상',
            career: '미상',
            family: '없음',
            contact: '없음',
            marriage: '미상',
            medical: '없음',
            criminal: '없음',
            etc: '특이사항 없음',
            photoUrl: ''
        },
        stats: baseStats,
        inventory: {
            silver: 0,
            items: []
        },
        status: {
            currentSpirit: maxSpirit,
            maxSpirit: maxSpirit,
            currentHP: maxHP,
            maxHP: maxHP,
            injuries: { ...initialInjuryState },
            contaminations: { ...initialInjuryState },
            prosthetics: { ...prostheticsState },
            currentContamination: 0,
            currentErosion: 0,
            stats: { deaths: 0, explorations: 0, interviews: 0, itemsCarried: 0, abyssDefeated: 0, silverCarried: 0 }
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
}

/* =========================================================
    시트 관련
========================================================= */

async function fetchSheetData(sheetId, isAdmin = false) {
    const docRef = doc(db, 'sheets', sheetId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
        if (isAdmin) {
            return null; // ← 핵심
        }
        throw new Error(`Sheet data not found for ID: ${sheetId}`);
    }

    return snap.data();
}

