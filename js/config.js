// =====================================================================
//  사이트 설정 — 나중에 바꿀 것들은 전부 여기 모아뒀어요.
// =====================================================================
window.PNC_CONFIG = {
  // 제작자 표기 (저장 이미지 오른쪽 아래)
  author: "@BPT2xNoa",
  copyright: "© Sunborn Network Technology Co., Ltd. / MICA Team",

  // 처음 들어왔을 때 테마: "black" | "gray" | "white"
  defaultTheme: "gray",

  // 공지 팝업 번호 — 공지 내용을 바꿨을 때 숫자를 1 올리면
  // '다음부터 보지 않기'를 누른 사람에게도 한 번 다시 떠요.
  noticeVersion: 3,

  // 그림 버전 — 그림 파일을 같은 이름으로 바꿔 넣었으면 숫자를 1 올려 주세요.
  // (안 올리면 예전에 들어온 사람 브라우저에 옛날 그림이 남아 있을 수 있어요)
  assetVersion: 2,

  // 빈칸 그림(missing.png) 크기 — 칸 높이 대비 비율. 0.55 = 55%. 크면 숫자를 줄이세요.
  blankScale: 0.55,


  // ---------------------------------------------------------------
  //  여제 해금 안내 문구 — 아직 미정. 정해지면 여기만 바꾸면 돼요.
  // ---------------------------------------------------------------
  unlockMessage: {
    ko: "云图计划", en: "云图计划", zh: "云图计划", ja: "云图计划"
  },
  // 복호화 연출이 끝날 때 윗줄에 남는 16진수 (云图计划 의 UTF-8)
  unlockHex: "E4 BA 91 E5 9B BE E8 AE A1 E5 88 92",

  // 스에요이 일러스트: 지금은 늘 대표(b, 사복)만 나와요.
  // random 을 true 로 바꾸면 들어올 때마다 a/b/c 중 랜덤이 돼요.
  sueyoi: { variants: ["sueyoi_a", "sueyoi_b", "sueyoi_c"], representative: "sueyoi_b", random: false },   // 랜덤용 (d, e는 스에노아 전용)

  // ---------------------------------------------------------------
  //  스킨 해금 키워드 — 닉네임 칸에 words 중 하나를 치고 Enter 하면
  //  chars 에 적힌 캐릭터의 스킨이 전부 열려요. (영어는 대소문자 상관없음)
  //  message 는 해금 연출 마지막에 나오는 글자 (중국어 이름, 16진수는 자동)
  //  스킨 파일 목록은 data.js 의 각 캐릭터 "variants" 에 들어가요.
  // ---------------------------------------------------------------
  triggers: [
    { words: ["스에노아", "렘넌트", "Remnant"],                  chars: ["sueyoi"],                    message: "末宵" },
    { words: ["카페", "cafe", "레조넌스", "resonance"],           chars: ["persicaria", "persicaria2"], message: "帕斯卡" },
    { words: ["쿠루나나"],                                         chars: ["nanaka"],                    message: "七花" },
    { words: ["백색죽음"],                                         chars: ["simo"],                      message: "席摩" },
    { words: ["플카"],                                             chars: ["florence"],                  message: "芙洛伦" },
    { words: ["사일안나"],                                         chars: ["antonina"],                  message: "安冬妮娜" }
  ]
};
