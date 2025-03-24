const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 0000; // 내부 포트 9316 사용

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// 데이터를 저장할 디렉토리 (todo_list 데이터 파일들이 저장됨)
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// user id와 학번의 매핑 정보를 저장할 파일 경로
const mappingFilePath = path.join(__dirname, 'mapping.json');
// 매핑 파일이 없으면 초기화
if (!fs.existsSync(mappingFilePath)) {
  fs.writeFileSync(mappingFilePath, JSON.stringify({}));
}

// 헬퍼 함수: 매핑 파일 읽기
function loadMapping() {
  try {
    const data = fs.readFileSync(mappingFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Mapping file 읽기 오류:", err);
    return {};
  }
}

// 헬퍼 함수: 매핑 파일 저장
function saveMapping(mapping) {
  fs.writeFileSync(mappingFilePath, JSON.stringify(mapping, null, 2));
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

/**
 * [등록/수정 엔드포인트] POST /mapping
 * 클라이언트는 json_payload를 전송하며, payload.userRequest.utterance를 학번으로 간주합니다.
 * 서버는 payload.userRequest.user.id를 사용하여 기존 매핑을 확인한 후,
 * - 기존의 매핑이 없으면 등록하고,
 * - 기존 매핑이 존재하지만 해시된 학번 값이 다르면 업데이트합니다.
 */
app.post('/mapping', (req, res) => {
  const payload = req.body;
  const userId = payload.userRequest && payload.userRequest.user && payload.userRequest.user.id;
  if (!userId) {
    return res.status(400).json({ error: 'User id가 payload에 존재하지 않습니다.' });
  }
  // 여기서는 utterance 값을 학번으로 간주
  const studentNo = payload.userRequest && payload.userRequest.utterance;
  if (!studentNo) {
    return res.status(400).json({ error: 'Utterance(학번)이 payload에 존재하지 않습니다.' });
  }
  // 학번을 SHA-256 해시 처리
  const hashedStudentNo = crypto.createHash('sha256').update(studentNo).digest('hex');
  const mapping = loadMapping();
  if (mapping[userId] && mapping[userId] === hashedStudentNo) {
    return res.json({ message: '학번이 동일합니다. 업데이트가 필요하지 않습니다.', userId, studentNo, hashed: hashedStudentNo });
  } else {
    mapping[userId] = hashedStudentNo;
    saveMapping(mapping);
    return res.json({ message: '학번 등록/업데이트 성공', userId, studentNo, hashed: hashedStudentNo });
  }
});

/**
 * [정보 저장 엔드포인트] POST /store
 * 클라이언트는 해시 처리된 user_no(매핑 후 값)와 todo_list, update_time 등을 포함한 JSON 데이터를 전송합니다.
 * 서버는 해당 데이터를 fileName: user_no.json 으로 저장합니다.
 */
app.post('/store', (req, res) => {
  const data = req.body;
  if (!data.user_no) {
    return res.status(400).json({ error: 'user_no 값이 필요합니다.' });
  }
  
  const fileName = data.user_no + '.json';
  const filePath = path.join(dataDir, fileName);
  
  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error("파일 저장 오류:", err);
      return res.status(500).json({ error: '파일 저장 오류' });
    }
    console.log(`저장 완료: ${fileName}`);
    res.json({ message: '데이터 저장 성공', user_no: data.user_no });
  });
});

/**
 * [데이터 조회 엔드포인트] GET /fetch
 * 클라이언트는 평문 학번을 "studentno" 헤더에 담아 요청합니다.
 * 서버는 이를 해시 처리한 후, 해당 파일을 읽어 JSON 데이터를 반환합니다.
 */
app.get('/fetch', (req, res) => {
  const studentNo = req.headers['studentno'];
  if (!studentNo) {
    return res.status(400).json({ error: 'studentno 헤더가 필요합니다.' });
  }
  
  const hashedStudentNo = crypto.createHash('sha256').update(studentNo).digest('hex');
  const fileName = hashedStudentNo + '.json';
  const filePath = path.join(dataDir, fileName);
  
  fs.readFile(filePath, 'utf8', (err, fileData) => {
    if (err) {
      console.error("파일 읽기 오류:", err);
      return res.status(404).json({ error: `학번 ${studentNo}에 해당하는 데이터가 없습니다.` });
    }
    try {
      const jsonData = JSON.parse(fileData);
      res.json(jsonData);
    } catch (error) {
      console.error("JSON 파싱 오류:", error);
      res.status(500).json({ error: '저장된 데이터 파싱 오류' });
    }
  });
});

/**
 * [Kakao 챗봇 스킬 엔드포인트] POST /skill
 * 클라이언트(혹은 Kakao 챗봇)는 json_payload를 전송하며, payload.userRequest.user.id를 통해 매핑된 학번을 조회합니다.
 * 저장된 todo_list 데이터를 그룹화하여 지정된 형식의 텍스트로 변환 후, Kakao 스킬 응답(JSON 2.0 포맷)으로 반환합니다.
 */
app.post('/skill', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const payload = req.body;
  const userId = payload.userRequest && payload.userRequest.user && payload.userRequest.user.id;
  if (!userId) {
    return res.send(JSON.stringify({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "User id가 제공되지 않았습니다." } }]
      }
    }));
  }
  const mapping = loadMapping();
  const studentNo = mapping[userId];
  if (!studentNo) {
    return res.send(JSON.stringify({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "등록된 학번 정보가 없습니다. 학번을 등록해 주세요." } }]
      }
    }));
  }
  const fileName = studentNo + '.json';
  const filePath = path.join(dataDir, fileName);
  
  fs.readFile(filePath, 'utf8', (err, fileData) => {
    let responseText = "";
    if (err) {
      console.error("파일 읽기 오류:", err);
      responseText = "저장된 데이터가 없습니다.";
      return res.send(JSON.stringify({
        version: "2.0",
        template: { outputs: [{ simpleText: { text: responseText } }] }
      }));
    }
    try {
      const jsonData = JSON.parse(fileData);
      if (jsonData.todo_list && Array.isArray(jsonData.todo_list) && jsonData.todo_list.length > 0) {
        // 그룹화: 같은 course_nm은 한 번만 출력하고, 그 아래 항목 나열
        const grouped = {};
        jsonData.todo_list.forEach(item => {
          // module_type은 미리 정의된 매핑에 따라 변환되어 "type"으로 저장되어 있다고 가정
          const course = item.course_nm;
          if (!grouped[course]) {
            grouped[course] = [];
          }
          grouped[course].push(item);
        });
        for (const course in grouped) {
          responseText += course + "\n";
          grouped[course].forEach(item => {
            responseText += `${item.type}: ${item.item_title_temp}\n`;
            responseText += `기한: ${formatDueDate(item.due_date)}\n`;
          });
        }
      } else {
        responseText = "저장된 데이터가 없습니다.";
      }
      return res.send(JSON.stringify({
        version: "2.0",
        template: { outputs: [{ simpleText: { text: responseText } }] }
      }));
    } catch (error) {
      console.error("JSON 파싱 오류:", error);
      return res.send(JSON.stringify({
        version: "2.0",
        template: { outputs: [{ simpleText: { text: "저장된 데이터 파싱 오류" } }] }
      }));
    }
  });
});

app.listen(port, () => {
  console.log(`서버가 내부 포트 ${port}에서 실행 중입니다.`);
});
