import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const content = document.getElementById("content");

// 페이지 기본 텍스트들
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

  // 예시: Firebase에서 직원 수를 불러와 메인 페이지에 표시
  if (key === "main") fetchEmployeeCount();
}

// Firestore에서 직원 수 예시로 가져오기
async function fetchEmployeeCount() {
  const { db } = window._firebase;
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

document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => loadPage(btn.dataset.tab));
});

loadPage("main");
