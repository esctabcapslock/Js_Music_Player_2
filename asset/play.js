//2
console.time('music')
function sec2txt(x) {
    if (isNaN(x)) return '-';
    var 부호 = x>0?'':'-'
    x=x>0?x:-x
    var 시 = Math.floor(x / 3600);
    var 분 = Math.floor((Math.floor(x / 60)) % 60);
    var 초 = Math.floor(x % 60);
    
    if (초 < 10) 초 = `0${초}`;
    if (분 < 10) 분 = `0${분}`;
    if (시) return 부호+`${시}:${분}:${초}`;
    else return 부호+`${분}:${초}`;
}


Player = {
    view:{
        시간표기:0,
        ch_시간표기:()=>{Player.view.시간표기++},
        ch_끝으로:()=>{
            Player.change_audio()
        },
        ch_재생정지:()=>{
            //if(Player.is_not_played()) return;
            var pre_audio = Player.Audios[Player.Audios_select]
            if (pre_audio.paused) pre_audio.play()
            else pre_audio.pause()
        },
        ch_재생바:(비율)=>{
            var 가로 = Player.dom.재생바.clientWidth
            Player.dom.재생바안.style.width = 가로*비율+'px'
        },
        ch_재생바_클릭:(e)=>{
            //console.log(e,e.offsetX)
            var 위치 = e.offsetX;
            var 가로 = Player.dom.재생바.clientWidth
            var pre_audio = Player.Audios[Player.Audios_select]
            var pre_music = Player.musics[Player.Audios_select];
            if (pre_music){
                console.log('[ch_재생바_클릭]',e.target.id, 위치, 가로)
                pre_audio.currentTime = pre_audio.duration*위치/가로;
            }


        }
    },
    dom:{},
    set_audio_events:(audio)=>{
        //loadend
        audio.addEventListener('ended',()=>{console.timeLog('music','ended'); Player.change_audio()}) 
        audio.addEventListener('loadend',()=>{console.timeLog('music','loadend');})
        audio.addEventListener('load',()=>{console.timeLog('music','load');})
        audio.addEventListener('loadstart',()=>{console.timeLog('music','loadstart');})
        audio.addEventListener('play',()=>{console.timeLog('music','play');})
        audio.addEventListener('playing',()=>{console.timeLog('music','playing');})
        audio.addEventListener('pause',()=>{console.timeLog('music','pause');})
        audio.addEventListener('canplay',()=>{console.timeLog('music','canplay');})
        audio.addEventListener('loadedmetadata',()=>{console.timeLog('music','loadedmetadata');})
        audio.addEventListener('loadeddata',()=>{console.timeLog('music','loadeddata');})
        audio.addEventListener('audioprocess',()=>{console.timeLog('music','audioprocess');})
    },
    setup:()=>{

        Player.dom.상태시간 = document.getElementById('상태시간')
        Player.dom.상태시간.addEventListener('click',Player.view.ch_시간표기)
        Player.dom.재생정지 = document.getElementById('재생정지')
        Player.dom.재생정지.addEventListener('click',Player.view.ch_재생정지)
        Player.dom.곡제목 = document.getElementById('곡제목')
        Player.dom.끝으로 = document.getElementById('끝으로')
        Player.dom.끝으로.addEventListener('click',Player.view.ch_끝으로)
        Player.dom.엘범아트 = document.getElementById('엘범아트')
        Player.dom.가사 = document.getElementById('가사')
        Player.dom.장르 = document.getElementById('장르')
        Player.dom.연도 = document.getElementById('연도')
        Player.dom.가수 = document.getElementById('가수')
        Player.dom.엘범 = document.getElementById('엘범')
        Player.dom.재생바 = document.getElementById('재생바')
        Player.dom.재생바밖 = document.getElementById('재생바밖')
        Player.dom.재생바안 = document.getElementById('재생바안')
        Player.dom.재생바.addEventListener('click',Player.view.ch_재생바_클릭)
        //Player.dom.재생바안.addEventListener('click',Player.view.ch_재생바_클릭)
        //Player.dom.재생바밖.addEventListener('click',Player.view.ch_재생바_클릭)
        //Player.dom.재생바밖 = document.getElementById('재생바밖')


        Player.set_audio_events(Player.Audios[0])//.addEventListener('ended',)
        Player.set_audio_events(Player.Audios[1])//.addEventListener('ended',Player.ended)

        Player.intervar = setInterval(()=>{
            var pre_audio = Player.Audios[Player.Audios_select]
            var pre_music = Player.musics[Player.Audios_select]
            var next_music = Player.musics[Number(!Player.Audios_select)]
            if(!pre_music) return;
            
            
            var 현재시간 = pre_audio.currentTime;
            var 총시간 = pre_audio.duration;
            Player.view.ch_재생바(현재시간/총시간)
            Player.dom.상태시간.innerHTML =  Player.view.시간표기%3==0? sec2txt(현재시간): (Player.view.시간표기%3==1?sec2txt(현재시간-총시간):`${sec2txt(현재시간)}/${sec2txt(총시간)}`)
            
            //if(pre_audio.paused) return;
            if ((pre_audio.duration - pre_audio.currentTime - pre_music.e) < 30 && !next_music){
                console.log('[playmusic] before interver')
                Player.playmusic()
            }
            if ((pre_audio.duration - pre_audio.currentTime - pre_music.e) < 0.4 ){
                console.timeLog('music','play 함수 실행 간격 보정 - 미리 시작. 0.4 s')
                Player.Audios[Number(!Player.Audios_select)].play()
            }

        },100)
    },
    speed:0,
    volume:0,
    Audios: [new Audio, new Audio],
    musics: [undefined, undefined],
    Audios_select:0,
    volume_master:()=>{},

    playmusic(){ //다음 곡으로 넘어감.
        if(!Queue.list.length || Queue.top>=Queue.list.length ) return; // 재생할 곡이 없음

        if (Player.musics[0]&&Player.musics[1]) return; // 이미 다음 곡들로 차 있음.

        console.log('[Player] [playmusic]')
        music = Queue.list[Queue.top++]
        if (isNaN(music.blank_start)) music.blank_start = 0
        if (isNaN(music.frequency)) music.frequency = 0
        if (isNaN(music.blank_end)) music.blank_end = 0
        music.s = music.frequency? 144*music.blank_start/music.frequency*8 : 0
        music.e = music.frequency? 144*music.blank_end/music.frequency*8 : 0
        console.log('playmusic], music',music)


        // 멈춰있다가, 시작..
        // 비워져 있을 때.
        if (Player.is_no_music() ){
            Player.Audios[Player.Audios_select].src = './data/'+music.music_id
            Player.Audios[Player.Audios_select].play()
            Player.Audios[Player.Audios_select].currentTime = music.s
            Player.musics[Player.Audios_select] = music
            Player.change_view()

            //Player.Audios_select = Number(!Player.Audios_select)
        }
        else{ // 다음 오디오 설정함.
            var next = Number(!Player.Audios_select)
            if(Player.musics[next]) return;
            Player.Audios[next].src = './data/'+music.music_id
            Player.Audios[next].currentTime = music.s
            Player.musics[next] = music
        }
        
        if(!music.info) {
            music.info = true;
            fetch('./info/'+music.music_id).then(data=>data.text()).then(data=>{
                if(data) music.info = JSON.parse(data)
                else music.info={}
            })
        }
        

    },
    change_audio(){
        console.log('[Player] [change_audio]')
        Player.Audios[Player.Audios_select].pause()
        delete Player.Audios[Player.Audios_select]
        Player.Audios[Player.Audios_select] = new Audio()
        Player.set_audio_events(Player.Audios[Player.Audios_select])//.addEventListener('ended',Player.ended)
        Player.musics[Player.Audios_select] = undefined;
        //console.log('Player] [change_audio => src' ,Player.Audios[Player.Audios_select].src)

        Player.Audios_select = Number(!Player.Audios_select)
        if(Player.Audios[Player.Audios_select].src){
            Player.Audios[Player.Audios_select].play()
            Player.change_view()
        } 
        else{
            console.log('[playmusic] before change_audio')
            Player.playmusic()
            Player.change_view()
        } 

    },
    change_view(){ // 가사, 엘범아트 등 변경.
        Queue.show()
        console.log('[Player] [change_view]')
        var pre_music = Player.musics[Player.Audios_select]

        Player.dom.곡제목.innerHTML = pre_music?pre_music.file_name:'곡을 다 재생했습니다.'

        if(pre_music && !pre_music.info){
            fetch('./info/'+pre_music.music_id).then(data=>data.text()).then(data=>{
                pre_music.info = data?JSON.parse(data):{}
                Player.change_view()
            })
        } 
        else if(!pre_music){
                Player.dom.곡제목.innerHTML = '곡을 다 재생했습니다.'
                Player.dom.엘범아트.src = ''
                Player.dom.가사.innerText = ''
                Player.dom.장르 = ''
                Player.dom.연도 = ''
                Player.dom.가수 = ''
                Player.dom.엘범 = ''
                Player.dom.상태시간.innerHTML = ''
        }else{
            if(pre_music.info.album_id) Player.dom.엘범아트.src = `./album_img/${pre_music.info.album_id}`//'data:image;base64,'+pre_music.info.albumart
            else Player.dom.엘범아트.src = ''
            Player.dom.가사.innerText = pre_music.info.lyric.replace(/\n{2}/g,'\n')
            Player.dom.장르 = pre_music.info.genre
            Player.dom.연도 = pre_music.info.year
            Player.dom.가수 = pre_music.info.singer
            Player.dom.엘범 = pre_music.info.album_name
        }
            
    },is_not_played(){
        console.log('[Player] [is_not_played]')
        return (
            ( !Player.Audios[0].src && !Player.Audios[1].src ) ||
            ( Player.Audios[0].paused && Player.Audios[1].paused )     
        )
        // 주소가 없거나, 정지중이거나 x거나,
            
    },is_no_music(){
        return ( !Player.Audios[0].src && !Player.Audios[1].src )  // 주소가 없음. 
    }
    ,play(){
        console.log('[Player] [play]')
        var pre_audio = Player.Audios[Player.Audios_select]
        if(!pre_audio.src) return;

        else if(pre_audio.paused) pre_audio.play()
        else pre_audio.paused()
    },
}


