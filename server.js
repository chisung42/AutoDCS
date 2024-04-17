const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer-core');
const app = express();
const PORT = 4170;

const ID = "DCS_ID";
const PW = "DCS_PW";

var result;

(async () => { 
  const browser = await puppeteer.launch({ // Puppeteer용 브라우저 실행
    executablePath: 'web_browser_path' 
    ,defaultViewport : {
      width: 1920,
      height: 1080
    }
    //,headless : false
    });

    const page = await browser.newPage(); // 신규 탭(페이지) 생성

    await page.goto('https://dcs-lcms.cnu.ac.kr/login?redirectUrl=https://dcs-learning.cnu.ac.kr/'); // 해당 URL로 이동
 
  
    await page.waitForSelector('.inputbox .id_insert');
    await page.type('.inputbox .id_insert',ID)
    await page.type('.inputbox .pw_insert',PW)
  
    await page.waitForSelector('#wrapper > div.main_top > div > div > div.main_loginbox > div > form > div.pg_login.before > div.univ_select_box > a')
    await page.click('#wrapper > div.main_top > div > div > div.main_loginbox > div > form > div.pg_login.before > div.univ_select_box > a')
    await page.waitForSelector('#drawUniv_list > li:nth-child(4) > a > span.univ_name')
    await page.click('#drawUniv_list > li:nth-child(4) > a > span.univ_name')
    await page.click('.inputbox .btn_login_normal');
  

    await page.waitForSelector('#wrapper > div.main_top > div > div > div.main_loginbox > div > div.func_area.drawFunc > ul > li > button');
    for (i = 0; i < 2; i++){
      await page.screenshot({ path: `screenshot.png` })
  
  
    }
  
    await page.goto('https://dcs-learning.cnu.ac.kr/std/todo')
  
    for (i = 0; i < 5; i++){
      await page.screenshot({ path: `screenshot.png` })
    }
  
    await page.waitForFunction(() => window.todoList && typeof window.todoList.setLearningTab === 'function');
  
    await page.evaluate(() => {
        todoList.setLearningTab('P');
    });
  
  
    for (i = 0; i < 5; i++){
      await page.screenshot({ path: `screenshot.png` })
  
    }
  
    await page.waitForSelector('#learningList tr')
  

    const extractedData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#learningList tr'));
      return rows.map(row => {
          // '자료실' 같은 텍스트 추출
          const category = row.querySelector('.badge').textContent;
          // 강의명과 세부 정보 추출
          const lectureDetail = row.querySelector('td:nth-child(2) a').textContent;
          // 강의명만 추출
          const courseName = row.querySelector('td:nth-child(2) a').getAttribute('data-coursenm');
          // 날짜와 시간 추출
          const dueDate = row.querySelector('.text-end').textContent;

          return { category, courseName, lectureDetail, dueDate };
      });
  });

  result = extractedData
  console.log(result)
    for (i = 0; i < 1; i++){
      await page.screenshot({ path: `screenshot.png` })
  
  
    }
  
    await browser.close(); // 브라우저 종료
  })();

app.get('/data', (req, res) => {
    console.log(result)

    res.json(result);
  });
  
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });