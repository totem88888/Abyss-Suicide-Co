import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const { db } = window._firebase;

const auth = getAuth();

const content = document.getElementById("content");

const loginBox = document.getElementById("loginBox");
const signupBox = document.getElementById("signupBox");

const loginBtn = document.getElementById("loginBtn");
const goSignupBtn = document.getElementById("showSignupBtn");
const signupSubmitBtn = document.getElementById("signupSubmitBtn");
const goLoginBtn = document.getElementById("goLoginBtn");

const loginMsg = document.getElementById("loginMsg");
const signupMsg = document.getElementById("signupMsg");

// 랜덤 HEX 색상
function randomHex() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

// 페이지들
const pages = {
  main: `
    <h2>메인</h2>
    <p>· 직원 생존·실종·사망 현황</p>
    <p>· 심연의 기류</p>
    <p>· 일정 및 공지</p>
    <p>· 이벤트 현황</p>
    <p>· 직원 순위</p>
  `,
  staff: `
    <h2>직원</h2>
    <p>· 직원 목록</p>
    <p>· 타 직원 프로필</p>
  `,
  me: `
    <h2>내 상태</h2>
    <p>· 부상 · 침식 · 오염도</p>
    <p>· 소지 은화</p>
    <p>· 소지품</p>
    <p>· 개인 통계</p>
  `,
  map: `
    <h2>맵</h2>
    <p>· 장소 소개</p>
    <p>· 탐사 기록</p>
    <p>· 댓글</p>
  `,
  dex: `
    <h2>도감</h2>
    <p>· 심연체 도감</p>
    <p>· 도감 달성률</p>
    <p>· 댓글</p>
  `,
  etc: `
    <h2>기타</h2>
    <p>· 현재 시간</p>
    <p>· 스티커</p>
  `
};

function loadPage(key) {
  content.innerHTML = pages[key] || "오류 발생";
  if (key === "main") fetchEmployeeCount();
}

// 직원 현황
async function fetchEmployeeCount() {
  const docRef = doc(db, "system", "employeeStatus");
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const data = snap.data();
    const elem = document.createElement("div");
    elem.style.marginTop = "20px";
    elem.innerHTML = `
      <h3>직원 현황 (실시간)</h3>
      <p>생존: ${data.alive}</p>
      <p>실종: ${data.missing}</p>
      <p>사망: ${data.dead}</p>
    `;
    content.appendChild(elem);
  }
}

// 네비 버튼
document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => loadPage(btn.dataset.tab));
});

// 로그인 버튼
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value;
  const pw = document.getElementById("pwInput").value;

  try {
    await signInWithEmailAndPassword(auth, email, pw);
  } catch (e) {
    loginMsg.textContent = "로그인 실패";
  }
});

// 회원가입 화면으로 이동
goSignupBtn.addEventListener("click", () => {
  loginBox.style.display = "none";
  signupBox.style.display = "block";
});

// 회원가입 제출
signupSubmitBtn.addEventListener("click", async () => {
  const email = document.getElementById("signupEmail").value;
  const pw = document.getElementById("signupPw").value;
  const nickname = document.getElementById("signupNick").value;

  if (!nickname) {
    signupMsg.textContent = "닉네임을 입력하세요";
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, pw);
    const uid = userCred.user.uid;

    await setDoc(doc(db, "users", uid), {
      uid,
      email,
      nickname,
      profileColor: randomHex(),
      decorations: []
    });

    signupMsg.textContent = "회원가입 완료";
  } catch (e) {
    signupMsg.textContent = "회원가입 실패";
  }
});

// 회원가입 → 로그인으로 돌아가기
goLoginBtn.addEventListener("click", () => {
  signupBox.style.display = "none";
  loginBox.style.display = "block";
});

// 로그인 상태 변화 감지
onAuthStateChanged(auth, async user => {
  if (user) {
    loginBox.style.display = "none";
    signupBox.style.display = "none";

    // DB 정보 없으면 생성
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        nickname: "",
        profileColor: randomHex(),
        decorations: []
      });
    }

    loadPage("main");
  } else {
    // 로그아웃 상태
    loginBox.style.display = "block";
    signupBox.style.display = "none";
  }
});
