const Context = new AudioContext();
Player={set_audio_events:()=>{}};

AudioApi={
    analyser:Context.createAnalyser(),
    gainNode:Context.createGain(),
    frequencies:[
        50, 100, 200, 400, 800, 1600, 3200, 6400, 12800
    ],
    setup:()=>{
        
        [...document.getElementsByClassName('eq_input')].forEach((k,i)=>{
            k.previousSibling.innerHTML=AudioApi.frequencies[i]+'Hz'
            k.previousSibling.addEventListener('click',((ind)=>{return e=>{e.target.nextSibling.nextSibling.innerHTML = e.target.nextSibling.value = AudioApi.BiquadFilterNode[ind].gain.value = 0; }})(i))
            k.addEventListener('input',
                ((ind)=>{return e=>{
                    e.target.nextSibling.innerHTML  = parseFloat( 
                        AudioApi.BiquadFilterNode[ind].gain.value = e.target.value )
                        .toFixed(3); 
                }})(i))  
            
            })
    },
    get_eq_filter:()=>{
        //https://evan-moon.github.io/2019/08/21/javascript-audio-effectors-practice/#delay-구현해보기
        if(AudioApi.BiquadFilterNode)  return;

        const frequencies = AudioApi.frequencies

        
        const filters = frequencies.map((frequency, index, array) => {
            const filterNode = Context.createBiquadFilter();
            filterNode.gain.value = 0;
            filterNode.frequency.value = frequency;
            
            if (!index) filterNode.type = 'lowshelf';
            else if (index == array.length - 1) filterNode.type = 'highshelf';
            else filterNode.type = 'peaking';
            
            return filterNode;
        });

        filters.reduce((prev, current) => {
            prev.connect(current);
            return current;
        });


        AudioApi.BiquadFilterNode = filters
        
        filters[filters.length-1].
        connect(AudioApi.analyser).
        connect(Context.destination);
        

        return filters;
    },
    get_audio_buffer_by_fetch: async (id)=>{
        if(isNaN(id)) return false;
        //async-async 관련 문법
        //https://www.daleseo.com/js-async-async-await/
        var data = await fetch('./data/'+id)
        var arrayBuffer = await data.arrayBuffer()
        var decodedAudio = await Context.decodeAudioData(arrayBuffer)
        return decodedAudio;
    },
    new_source:()=>{
        var source = Context.createBufferSource(); 
        Player.set_audio_events(source);
        var filters = AudioApi.BiquadFilterNode;

        source.connect(AudioApi.gainNode)
        .connect(filters[0])
        

        return source;
    },
    drowWave:()=>{
        
        var dataArray = new Uint8Array(AudioApi.analyser.frequencyBinCount); 
        AudioApi.analyser.getByteTimeDomainData(dataArray); //파장형태, getByteFrequencyData: 주파수영역
        var g = document.getElementById('파형')
        g.innerHTML = ''
        var d = `M0 ${dataArray[0]}`+[...dataArray].map((v,i)=>`L${i} ${v}`).join('');
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttributeNS(null, 'd', d);
        path.setAttributeNS(null, 'stroke', "red");
        path.setAttributeNS(null, 'fill', "none");
        path.setAttributeNS(null, 'stroke-width', "0.5px");
        g.appendChild(path)
    },
    drowFreq:()=>{
        
        var dataArray = new Uint8Array(AudioApi.analyser.frequencyBinCount); 
        
        AudioApi.analyser.getByteFrequencyData(dataArray); //파장형태, getByteFrequencyData: 주파수영역
        var g = document.getElementById('주파수')
        g.innerHTML = ''
        var d = `M0 ${dataArray[0]}`+[...dataArray].map((v,i)=>`L${i} ${v}`).join('');
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttributeNS(null, 'd', d);
        path.setAttributeNS(null, 'stroke', "green");
        path.setAttributeNS(null, 'fill', "none");
        path.setAttributeNS(null, 'stroke-width', "0.5px");
        g.appendChild(path)
    }
}

AudioApi.analyser.fftSize = 1024;
AudioApi.get_eq_filter();
AudioApi.intervarFreq = setInterval(AudioApi.drowFreq, 30);
AudioApi.intervarWave = setInterval(AudioApi.drowWave, 80);


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
            
            console.log('[ch_재생정지] source')
            if(Context.state=="running") Context.suspend()
            else if(Context.state=="suspended") Context.resume()

            // 아래의 코드와, 위 두줄의 코드가 동일함...

            /*
            function play_paused (source, music, select){
                
                try{
                    var ct = source.currentTime
                    if(!ct) ct=0;
                    source.start(Context.currentTime, ct, source.buffer.duration-ct-music.e) //한번만 재생된다는 특징 이용. 오류나면, 재생중인거임
                    source.startTime = Context.currentTime - ct;
                    console.log('[ch_재생정지] try (정지->재생), ct', ct)

                    return true;
                }catch{
                    var ct = Context.currentTime - source.startTime;
                    console.log('[ch_재생정지] catch (재생->정지), ct',ct)
                    source.stop()
                    var nextsource = AudioApi.new_source()
                    nextsource.currentTime = ct; //
                    nextsource.paused = true; //
                    nextsource.buffer = source.buffer
                    Player.Audios[select] = nextsource;

                    return false;
                }
            }

            var source = Player.Audios[Player.Audios_select]
            var pre_music = Player.musics[Player.Audios_select]
            if (!source || !source.buffer ) return;
            
            var flag = play_paused(source, pre_music, Player.Audios_select)
            Player.nextsource_reset(flag);
            
            */
            
            /*
            if(source.buffer && pre_audio.src){
                if (pre_audio.paused) pre_audio.play()
                else pre_audio.pause()
            }*/
            
        },
        
        ch_재생바:(비율)=>{
            //console.log('[ch_재생바]',비율)
            if(isNaN(비율)) 비율=0;
            var 가로 = Player.dom.재생바.clientWidth
            Player.dom.재생바안.style.width = 가로*비율+'px'
        },
        ch_재생바_클릭:(e)=>{
            //console.log(e,e.offsetX)
            var 위치 = e.offsetX;
            var 가로 = Player.dom.재생바.clientWidth
            var source = Player.Audios[Player.Audios_select]
            var pre_music = Player.musics[Player.Audios_select];
            
            if (!pre_music || !source.buffer) return;

            var ct = source.buffer.duration*위치/가로;
            console.log('[ch_재생바_클릭]',e.target.id, 위치, 가로, '[ct]',ct)
            var flag;
            try{
                //재생중임. 멈춰도 오류 x인것을 보면.

                source.stop();
                console.log('[ch_재생바_클릭] try')
                var nextsource = AudioApi.new_source()
                nextsource.startTime = Context.currentTime - ct
                nextsource.buffer = source.buffer
                Player.Audios[Player.Audios_select] = nextsource;
                nextsource.start(Context.currentTime, ct, source.buffer.duration-ct-pre_music.e)
                // 재생->정지->재생
                flag = true;
                
            }catch{
                console.log('[ch_재생바_클릭] catch')
                var nextsource = AudioApi.new_source()  
                nextsource.currentTime = ct;
                nextsource.buffer = source.buffer
                Player.Audios[Player.Audios_select] = nextsource;
                flag = false;
            }

            Player.nextsource_reset(!flag);
            Player.nextsource_reset(flag);

        },
        ch_볼륨:()=>{
            
            Player.dom.볼륨.nextSibling.innerHTML = parseFloat(AudioApi.gainNode.gain.value= Math.tan(0.72973*Player.dom.볼륨.value)/Math.tan(0.72973)).toFixed(3)
        }
    },

    dom:{},
    set_audio_events:(audio)=>{
        //loadend
        audio.addEventListener('ended',(e)=>{
            console.timeLog('music','ended', e.target == Player.Audios[Player.Audios_select]);
            if(e.target == Player.Audios[Player.Audios_select]) Player.change_audio() // 다른경우 -> 바뀐 경우..
        }) 
        /*
        audio.addEventListener('loadend',()=>{console.timeLog('music','loadend');})
        audio.addEventListener('load',()=>{console.timeLog('music','load');})
        audio.addEventListener('loadstart',()=>{console.timeLog('music','loadstart');})
        audio.addEventListener('play',()=>{console.timeLog('music','play');})
        audio.addEventListener('playing',()=>{console.timeLog('music','playing');})
        audio.addEventListener('pause',()=>{console.timeLog('music','pause');})
        audio.addEventListener('canplay',()=>{console.timeLog('music','canplay');})
        audio.addEventListener('loadedmetadata',()=>{console.timeLog('music','loadedmetadata');})
        audio.addEventListener('loadeddata',()=>{console.timeLog('music','loadeddata');})
        audio.addEventListener('audioprocess',()=>{console.timeLog('music','audioprocess');})*/
    },
    setup:()=>{

        Player.dom.상태시간 = document.getElementById('상태시간')
        Player.dom.상태시간.addEventListener('click',Player.view.ch_시간표기)
        Player.dom.재생정지 = document.getElementById('재생정지')
        Player.dom.재생정지.addEventListener('click',Player.view.ch_재생정지)
        Player.dom.곡제목 = document.getElementById('곡제목')
        Player.dom.끝으로 = document.getElementById('끝으로')
        Player.dom.끝으로.addEventListener('click',Player.view.ch_끝으로)
        Player.dom.볼륨 = document.getElementById('볼륨')
        Player.dom.볼륨.addEventListener('input',Player.view.ch_볼륨)
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


        Player.intervar = setInterval(()=>{
            

            var pre_audio = Player.Audios[Player.Audios_select]
            var pre_music = Player.musics[Player.Audios_select]
            var next_music = Player.musics[Number(!Player.Audios_select)]
            if(!pre_music || !pre_audio.buffer) return;
            
            if (pre_audio.buffer && !pre_audio.startTime) return; // 단지 멈춰있는 경우니까. 취급x

            var 현재시간 = Context.currentTime - pre_audio.startTime;
            var 총시간 = pre_audio.buffer.duration;
            Player.view.ch_재생바(현재시간/총시간)
            Player.dom.상태시간.innerHTML =  Player.view.시간표기%3==0? sec2txt(현재시간): (Player.view.시간표기%3==1?sec2txt(현재시간-총시간):`${sec2txt(현재시간)}/${sec2txt(총시간)}`)
            
            //if(pre_audio.paused) return;
            if ((총시간 - 현재시간 - pre_music.e) < 30 && !next_music){
                //console.log('play ',pre_audio.duration - 현재시간 - pre_music.e)
                console.log('[playmusic] before interver')
                Player.playmusic()
            }

            else if ((총시간 - 현재시간 - pre_music.e) < -1 ){ 
                console.log('[playmusic] 어떤 이유로 넘어가지 않음... 강제넘김. before change_audio')
                Player.change_audio()
            }
            /*
            if ((  (pre_music.l||총시간) - 현재시간 - pre_music.e) <= 0.00001 ){
                console.timeLog('music','play 함수 실행 간격 보정 - 미리 시작. 0.06 s',총시간 - 현재시간 - pre_music.e, 총시간, pre_music.l, !next_music)
                Player.Audios[Number(!Player.Audios_select)].play()
            }*/

        },100)
    },
    speed:0,
    volume:0,
    Audios: [AudioApi.new_source(), AudioApi.new_source()],
    musics: [undefined, undefined],
    Audios_select:0,
    volume_master:()=>{},

    playmusic(){ //다음 곡으로 넘어감.
        if(!Queue.list.length || Queue.top>=Queue.list.length ) {Player.change_view(); return;} // 재생할 곡이 없음

        if (Player.musics[0]&&Player.musics[1]) return; // 이미 다음 곡들로 차 있음.

        console.log('[Player] [playmusic], Player.Audios_select:',Player.Audios_select)
        music = Queue.list[Queue.top++]
        if (isNaN(music.blank_start)) music.blank_start = 0
        if (isNaN(music.frequency)) music.frequency = 0
        if (isNaN(music.blank_end)) music.blank_end = 0
        music.s = music.frequency? 144*music.blank_start/music.frequency*8 : 0
        music.e = music.frequency? 144*music.blank_end/music.frequency*8 : 0
        music.l = music.frequency? 144*music.duration/music.frequency*8 : 0
        console.log('[Player] [playmusic], music',music)


        // 멈춰있다가, 시작..
        // 비워져 있을 때.
        if (Player.is_no_music() ){
            console.log('[Player] [playmusic] if문 > 비워져 있음')
            Player.musics[Player.Audios_select] = music;

            AudioApi.get_audio_buffer_by_fetch(music.music_id).then(audio=>{
                var source = Player.Audios[Player.Audios_select]
                source.buffer = audio; // 버퍼에 추가한 오디오를 최종 output인 destination에 연결한다.
                source.start(Context.currentTime,music.s, audio.duration-music.e-music.s); 
                source.startTime = Context.currentTime - music.s; // 현재 시각 정보가 없음 ㅠㅠ
                console.log('[Player] [playmusic] if (Player.is_no_music() ){ -> change_view')
                Player.change_view()
            })
        }
        else{ // 다음 오디오 설정함.
            console.log('[Player] [playmusic] if문 > 안비워져 있음')


            var next = Number(!Player.Audios_select)
            var pre_music = Player.musics[Player.Audios_select]
            var pre_audio = Player.Audios[Player.Audios_select]

            if(Player.musics[next]) return;
            Player.musics[next] = music

            AudioApi.get_audio_buffer_by_fetch(music.music_id).then(audio=>{
                var source = Player.Audios[next]
                source.buffer = audio; 

                if(pre_audio.startTime){ 
                    source.start(
                        (pre_audio.startTime + pre_audio.buffer.duration - pre_music.e)||Context.currentTime,
                        music.s,
                        source.buffer.duration-music.e-music.e
                    );
                    source.startTime =  Math.max(
                        pre_audio.startTime + pre_audio.buffer.duration - pre_music.e - music.s,
                        Context.currentTime - music.s
                    )||Context.currentTime - music.s;

                    console.log('[playmusic] 다음 오디오 시작시각',source.startTime, '현재',Context.currentTime)
                }

            })


            //Player.Audios[next].src = './data/'+music.music_id
            //Player.Audios[next].currentTime = music.s
        }
        
        if(!music.info) {
            music.info = true;
            console.log('[playmusic] fetch to music info')
            fetch('./info/'+music.music_id).then(data=>data.text()).then(data=>{
                if(data) {music.info = JSON.parse(data); Player.change_view();}
                else music.info={}
            })
        }
        

    },
    change_audio(){
        //지금 재생 멈추기
        console.log('[Player] [change_audio]')
        try{Player.Audios[Player.Audios_select].stop()}catch{console.log('[change_audio] catch 이미 멈춰 있음.')}
        //delete Player.Audios[Player.Audios_select]
        Player.Audios[Player.Audios_select] = AudioApi.new_source()
        if(Player.musics[Player.Audios_select]) Player.log(Player.musics[Player.Audios_select].music_id) ;
        Player.musics[Player.Audios_select] = undefined;

        var next = Number(!Player.Audios_select)
        Player.Audios_select = next;


        if(!Player.Audios[next].buffer){ // 다음 곡이 없는경우...
            if(Player.is_no_music()){ // 처음 재생한 경우.
                console.log('[change_audio] before change_audio with no_music')
                Player.playmusic()
                return;
            }else{ // 있는 경우
                console.log('[change_audio] before change_audio with exist_music')
                Player.playmusic()
            }
            
            
        }
        
        source = Player.Audios[next]
        music = Player.musics[next]
        if(source.buffer){
            //멈춰였다면, 시작시키기.
            try{
                source.start(Context.currentTime,music.s, source.buffer.duration-music.e-music.s); 
                source.startTime = Context.currentTime - music.s; // 현재 시각 정보가 없음 ㅠㅠ
            }catch{
                console.log('[change_audio] catch 이미 시작되어 있음!', source.startTime, Context.currentTime)
            }
            
            //미래에서 움직인다면, 현재로 당기기.
            if (source.startTime > Context.currentTime){ // 미래에 시작예정. 지금 당장 시작함.
                console.log('[playmusic] 미래에 시작예정 - > 재조절')
                try{
                    source.stop()
                    var new_source = AudioApi.new_source()
                    new_source.buffer = source.buffer
                    new_source.start(
                        Context.currentTime,
                        music.s,
                        new_source.buffer.duration-music.e-music.s
                    );
                    new_source.startTime =  Context.currentTime - music.s
                    Player.Audios[next] = new_source;
    
                }catch{console.log('근데, 시작된 것도 아니었다.')}
    
            }
        }
        
        
        console.log('[playmusic] before to change_view')
        Player.change_view();
        
        
    },
    change_view(){ // 가사, 엘범아트 등 변경.
        Queue.show()
        var pre_music = Player.musics[Player.Audios_select]
        //console.log('[Player] [change_view], pre_music 있음여부', !!pre_music, !pre_music||pre_music.info.file_name)
        
        if (pre_music && pre_music.info==true) return
        
        Player.dom.곡제목.innerHTML = pre_music?pre_music.file_name:'곡을 다 재생했습니다.'
        

        if(pre_music && !pre_music.info){
            console.log('[change_view] fetch to music info')
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
            Player.dom.가사.innerText = pre_music.info.lyric ? pre_music.info.lyric.replace(/\n{2}/g,'\n') : ''
            Player.dom.장르 = pre_music.info.genre
            Player.dom.연도 = pre_music.info.year
            Player.dom.가수 = pre_music.info.singer
            Player.dom.엘범 = pre_music.info.album_name
        }
            
    },is_not_played(){
        console.log('[Player] [is_not_played]')
        return (
            ( !Player.Audios[0].buffer && !Player.Audios[1].buffer ) ||
            ( !Player.Audios[0].startTime && !Player.Audios[1].startTime )     
        )
        // 주소가 없거나, 정지중이거나 x거나,
            
    },is_no_music(){
        return ( !Player.Audios[0].buffer && !Player.Audios[1].buffer )  // 주소가 없음. 
    }
    ,log(id){
        console.log('[player] [log] id:',id)
        fetch('./log/'+id);
    },
    nextsource_reset:(flag)=>{
        console.log('[plater nextsource_reset], flag:',flag)

        var next = Number(!Player.Audios_select)
        var source = Player.Audios[Player.Audios_select]
        var next_source = Player.Audios[next]
        
        var pre_music = Player.musics[Player.Audios_select]
        var next_music = Player.musics[next]
        
        // 다음 곡이 없다면 처리해줘야 한다.
        if (!next_source || !next_source.buffer ) return;
        
        if(flag===true){ //이전 고려해서 정지->재생으로 바꿔야.
            next_source.start(
                source.startTime + source.buffer.duration - pre_music.e,
                next_music.s,
                next_source.buffer.duration-next_music.e-next_music.s
            );
            next_source.startTime =  Math.max(
                source.startTime + source.buffer.duration - pre_music.e - next_music.s,
                Context.currentTime - next_music.s
            )
        }else if(flag===false){ //이전 고려해서 재생->장지로 바꿔야
            next_source.stop()
            var new_source = AudioApi.new_source()
            new_source.buffer = next_source.buffer
            Player.Audios[next] = new_source;
        }/*else if (flag===1){ // 당장 시작
            next_source.start(
                Context.currentTime,
                next_music.s,
                next_source.buffer.duration-next_music.e-next_music.s
            );
            next_source.startTime =  Context.currentTime-next_music.s
        }*/
    }
}


