document.addEventListener('DOMContentLoaded', function () {
  const slider = document.getElementById('filterSlider');
  const textInput = document.getElementById('filterValue');
  const saveButton = document.getElementById('saveButton');
  const checkMark = document.getElementById('checkMark');

  // 저장된 filterDays 값 로드 (없으면 기본값 7)
  chrome.storage.local.get("filterDays", function(result) {
    let filterDays = result.filterDays;
    if (filterDays === undefined) {
      filterDays = 7;
    }
    slider.value = filterDays;
    textInput.value = filterDays;
  });

  // 슬라이더 값 변경 시 텍스트 업데이트
  slider.addEventListener('input', function () {
    textInput.value = slider.value;
  });

  // 텍스트 입력 칸 변경 시 슬라이더 업데이트
  textInput.addEventListener('input', function () {
    const num = parseInt(textInput.value, 10);
    if (!isNaN(num)) {
      slider.value = num;
    }
  });

  // 저장 버튼 클릭 시 chrome.storage.local에 filterDays 저장하고 체크 이모티콘 표시 후 팝업 닫기
  saveButton.addEventListener('click', function () {
    const value = parseInt(slider.value, 10);
    chrome.storage.local.set({ filterDays: value }, function () {
      console.log("설정이 저장되었습니다:", value);
      // 체크 이모티콘 표시
      checkMark.style.display = 'inline';
      // 1초 후 체크 이모티콘 숨기고 팝업 닫기
      setTimeout(() => {
        checkMark.style.display = 'none';
        window.close();
      }, 1000);
    });
  });
});
