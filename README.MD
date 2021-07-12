# 자바스크립트 음악 재생기 2

## 목적

- 음악 듣기

## 차이점

- mp3 파일을 직접 뜯어봄
- 데이터베이스를 사용해 정보를 저장해 둠.
- 가수별, 엘범별, 제목별 모음 기능.
- 소리 없는 앞, 뒷부분 자르기

## 사용한 외부 코드

- mp3 디코딩 관련: [js-mp3](https://github.com/soundbus-technologies/js-mp3), 정상작동하지 않아 약간 수정했음. C언어는 아직 나에게 너무 어렵다.
- 데이터베이스 관련: [node.js SQLite3 모듈](https://www.npmjs.com/package/sqlite3)

## 참고문헌

### MP3 파일 관련

#### 이론

- [MP3 문서 | 한국어 위키백과](https://ko.wikipedia.org/wiki/MP3)
- [The Theory Behind Mp3 | Rassol RaissiDecember 2002](http://www.mp3-tech.org/programmer/docs/mp3_theory.pdf)

### 데이터베이스 관련

- [생활코딩 DATABASE2 - MySQL | 오픈튜토리얼스](https://opentutorials.org/course/3161)
- [생활코딩 관계형 데이터 모델링 | 오픈튜토리얼스](https://opentutorials.org/course/3883)
