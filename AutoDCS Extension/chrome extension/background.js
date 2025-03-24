// user_no를 SHA-256 해시하는 함수 (Web Crypto API 사용)
function hashUserNo(userNo) {
  const encoder = new TextEncoder();
  const data = encoder.encode(userNo);
  return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  });
}

// due_date 문자열 (YYYYMMDDHHMMSS 형식)을 Date 객체로 변환하는 함수
function parseDueDate(dateStr) {
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1; // 월은 0부터 시작
  const day = parseInt(dateStr.substring(6, 8));
  const hour = parseInt(dateStr.substring(8, 10));
  const minute = parseInt(dateStr.substring(10, 12));
  const second = parseInt(dateStr.substring(12, 14));
  return new Date(year, month, day, hour, minute, second);
}

// due_date ("YYYYMMDDHHMMSS")를 "MM-DD HH:MM" 형식으로 변환하는 함수
function formatDueDate(due) {
  if (due && due.length >= 12) {
    return due.substring(4,6) + "-" + due.substring(6,8) + " " + due.substring(8,10) + ":" + due.substring(10,12);
  }
  return due;
}

// module_type 변환 매핑
const moduleTypeMapping = {
  LV: "콘텐츠",
  LD: "토론",
  LS: "자료실",
  LR: "과제",
  LT: "팀프로젝트",
  LQ: "퀴즈",
  LE: "시험"
};

const targetPage = "https://dcs-learning.cnu.ac.kr/home";

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.url === targetPage) {
    console.log("홈 페이지 접속 감지:", details.url);
    const tabId = details.tabId;

    // 첫번째 fetch: getStdTodoList
    const fetchTodo = fetch("https://dcs-learning.cnu.ac.kr/api/v1/week/getStdTodoList", {
      headers: {
        "accept": "*/*",
        "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "sec-ch-ua": "\"Chromium\";v=\"132\", \"Whale\";v=\"4\", \"Not.A/Brand\";v=\"99\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        "cookie": "WMONID=Dn_NuZLpNAC; _ga_V52N5WRN2W=GS1.3.1739764933.1.0.1739764933.0.0.0; _ga_SPWZWGS6BP=GS1.1.1739988937.1.1.1739989320.13.0.0; _ga=GA1.3.442620718.1739764932; _ga_6EQK37DZTH=GS1.3.1741247061.2.0.1741247061.0.0.0; RESTORE-USERMODE=Y; CMS-LOGIN=N; JSESSIONID=N01J1GbKx1kDPk4EwQEslzIpa6XpHvnwqVjrnC5hNeaRtwz1vJFryfaSGzigqfCG.Y251bG1zL0xNU19XQVMy; pop_TB_L_BOARDITEM380392=done; LMS-LOGIN=Y; AUTH-TOKEN=...; pop_TB_L_BOARDITEM527724=done; pop_TB_L_BOARDITEM528537=done; pop_TB_L_BOARDITEM532314=done; pop_TB_L_BOARDITEM532318=done",
        "Referer": "https://dcs-learning.cnu.ac.kr/std/todo",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      },
      body: "e=KFvMQEoHCB52Y6z06Y6FePBasnitf8TakHBW53IKlbyZ0toDJoY0eF71MrhIDKApN9vopx9gTqDrX7r1dn4Zag%3D%3D",
      method: "POST"
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("getStdTodoList 네트워크 응답에 문제가 있습니다: " + response.statusText);
      }
      return response.json();
    })
    .then(data => {
      // 사용자가 설정한 기간(일수)을 chrome.storage.local에서 가져옴 (없으면 기본 7일)
      return new Promise((resolve, reject) => {
        chrome.storage.local.get("filterDays", function(result) {
          const filterDays = result.filterDays ? parseInt(result.filterDays) : 7;
          const now = new Date();
          const endDate = new Date(now.getTime() + filterDays * 24 * 60 * 60 * 1000);
          let transformed = {};
          if (data.body && data.body.todo_list) {
            transformed.todo_list = data.body.todo_list
              .map(item => ({
                course_nm: item.course_nm,
                due_date: item.edate_temp, // edate_temp를 due_date로 변경
                item_title_temp: item.item_title_temp,
                type: moduleTypeMapping[item.module_type] || item.module_type
              }))
              .filter(item => {
                const dueDate = parseDueDate(item.due_date);
                return dueDate >= now && dueDate <= endDate;
              });
          }
          resolve(transformed);
        });
      });
    });

    // 두번째 fetch: getUserInfo (user_no 추출)
    const fetchUser = fetch("https://dcs-learning.cnu.ac.kr/api/v1/user/getUserInfo", {
      headers: {
        "accept": "*/*",
        "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "sec-ch-ua": "\"Chromium\";v=\"132\", \"Whale\";v=\"4\", \"Not.A/Brand\";v=\"99\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest"
      },
      referrer: "https://dcs-learning.cnu.ac.kr/home",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "POST",
      mode: "cors",
      credentials: "include"
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("getUserInfo 네트워크 응답에 문제가 있습니다: " + response.statusText);
      }
      return response.json();
    })
    .then(data => {
      let userNo = (data.body && data.body.user_no) ? data.body.user_no : "user_no 없음";
      return userNo;
    });

    // 두 fetch 요청 결과 통합
    Promise.all([fetchTodo, fetchUser])
      .then(([todoData, userNo]) => {
        return hashUserNo(userNo).then(hashedUserNo => {
          return { todoData, hashedUserNo };
        });
      })
      .then(({ todoData, hashedUserNo }) => {
        const combinedResult = {
          todo_list: todoData.todo_list,
          user_no: hashedUserNo,
          update_time: new Date().toISOString()
        };

        // 로컬에 저장된 이전 데이터와 비교 (todo_list만)
        chrome.storage.local.get("combinedResult", function(result) {
          const storedData = result.combinedResult;
          if (storedData && JSON.stringify(storedData.todo_list) === JSON.stringify(combinedResult.todo_list)) {
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              function: (msg) => {
                console.log(msg);
              },
              args: ["todo_list 변경 없음. 서버 전송 생략."]
            });
          } else {
            // 변경 사항이 있으면 서버에 전송
            fet", {
              method: "POST",
              mode: "cors",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(combinedResult)
            })
            .then(response => {
              if (!response.ok) {
                throw new Error("서버 응답 오류: " + response.statusText);
              }
              return response.json();
            })
            .then(serverResponse => {
              // 서버 저장 응답을 받은 후 로컬에 저장
              chrome.storage.local.set({ combinedResult: combinedResult }, function() {
                chrome.scripting.executeScript({
                  target: { tabId: tabId },
                  function: (resultData) => {
                    console.log("서버 저장 응답:", resultData);
                  },
                  args: [serverResponse]
                });
              });
            })
            .catch(err => {
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: (errorMsg) => {
                  console.error("서버 전송 오류:", errorMsg);
                },
                args: [err.toString()]
              });
            });
          }
        });
      })
      .catch(err => {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: (errorMsg) => {
            console.error("통합 fetch 오류:", errorMsg);
          },
          args: [err.toString()]
        });
      });
  }
}, { url: [{ urlMatches: "^https://dcs-learning\\.cnu\\.ac\\.kr/home" }] });
