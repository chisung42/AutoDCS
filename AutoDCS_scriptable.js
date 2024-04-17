// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: magic;
const url = "YOUR_SERVER_URL/data";
const request = new Request(url);
const response = await request.loadJSON();
console.log(response);
Script.complete();
const data = response;
const displayCategory = '자료실';

let widget = new ListWidget();
let lastCategory = "";
let lastCourseName = "";

data.forEach(item => {
    if (item.category !== displayCategory) {
        if (item.category !== lastCategory || item.courseName !== lastCourseName) {
            let headerText = widget.addText(`${item.category}: ${item.courseName}`);
            headerText.textColor = Color.blue();
            headerText.font = new Font("Helvetica", 14); // 카테고리 및 과목명 폰트 크기 설정
            lastCategory = item.category;
            lastCourseName = item.courseName;
        }
        
        // 대괄호와 그 안의 내용 제거
        let cleanedLectureDetail = item.lectureDetail.replace(/\[.*?\]\s*/g, '');

        let detailText = widget.addText(`내용: ${cleanedLectureDetail}`);
        detailText.textColor = Color.gray();
        detailText.font = new Font("Helvetica", 12); // 세부 정보 폰트 크기 설정

        let dueDateText = widget.addText(`기한: ${item.dueDate.slice(6)}`);
        dueDateText.textColor = Color.red();
        dueDateText.font = new Font("Helvetica", 10); // 기한 폰트 크기 설정
    
        widget.addSpacer(5);
    }
});

// 위젯 설정
Script.setWidget(widget);
Script.complete();

// 개발 환경이 아닌 경우 위젯으로 표시
if (!config.runsInWidget) {
    widget.presentSmall();
}