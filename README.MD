# 자바스크립트 음악 재생기 2

## 목적

- 음악 듣기

## 사용법

### 인자 소개

- **w**: 웹 브라우저 열기
- **h**: 힌트 표시하기
- **l**: db 관련 로그 표시하기

## [이전작](https://github.com/esctabcapslock/Js_Music_Player)과의 차이점

- mp3 파일을 직접 뜯어봄
- 데이터베이스를 사용해 정보를 저장해 둠.
- 가수별, 엘범별, 제목별 모음 기능.
- 소리 없는 앞, 뒷부분 자르기
- Web Audio Api 이용함.
- 음악 스트리밍하기
- 통계 보기
- my_hls 모듈: [FFmpeg](https://ffmpeg.org/)를 이용해 곡을 나누고, 보내는 모듈이나, 다른 방법([mp3_split.ts](https://github.com/esctabcapslock/Js_Music_Player_2/blob/main/modules/mp3_split.ts))을 찾았기에 사용하지 않음 (참고: my_hls 폴더에 ffmpeg.exe가 있어야 작동함)

## 사용한 외부 코드

- mp3 디코딩 관련: [js-mp3](https://github.com/soundbus-technologies/js-mp3), 정상작동하지 않아 약간 수정했음. C언어는 아직 나에게 너무 어렵다.
- 데이터베이스 관련: [node.js SQLite3 모듈](https://www.npmjs.com/package/sqlite3)
- HTML 파싱 관련: [node.js cheerio 모듈](https://www.npmjs.com/package/cheerio)
- MD5 해싱 관련: [js-md5](https://github.com/airingursb/js-md5)
- EQ 관련: [WebAudioApi 관련 블로그](https://evan-moon.github.io/2019/08/21/javascript-audio-effectors-practice/#delay-구현해보기md5)
- 군데군데 타입스크립트를 활용함!
- ~~음악 스트리밍 관련: [FFmpeg](https://ffmpeg.org/)~~ 직접 파일을 잘라 스트리밍함

## 보완점

- 디자인

## 참고문헌

### MP3 파일 관련

- [MP3 문서 | 한국어 위키백과](https://ko.wikipedia.org/wiki/MP3)
- [The Theory Behind Mp3 | Rassol RaissiDecember 2002](http://www.mp3-tech.org/programmer/docs/mp3_theory.pdf)

### 데이터베이스 관련

### 공부

- [생활코딩 DATABASE2 - MySQL | 오픈튜토리얼스](https://opentutorials.org/course/3161)
- [생활코딩 관계형 데이터 모델링 | 오픈튜토리얼스](https://opentutorials.org/course/3883)
- [중복넣기](https://stackoverflow.com/questions/19337029/insert-if-not-exists-statement-in-sqlite)
- [SQL 자료형 목록](https://stackoverflow.com/questions/19337029/insert-if-not-exists-statement-in-sqlite)
- [$ 사용 관련 에러](https://zepeh.tistory.com/396)
- [정규 표현식 관련 | MDN Web Docs](https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Regular_Expressions)
- [자바스크립트 배열 관련 함수들](https://velog.io/@kjhoon0330/JS-배열-관련-함수-정리)
- [진작에 읽었으면 좋았을 글 - 음악 스트리밍 관련](https://minisp.tistory.com/9)
- [위의 글 코드에서 생기는 오류 해결 (Content-Length 헤더 관련)](https://stackoverflow.com/questions/53226595/streaming-audio-in-node-js-with-content-range)
- [타입스크립트 tsc 설정 관련](https://merrily-code.tistory.com/69)
