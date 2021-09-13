const Context = new AudioContext();

//AudioBufferSourceNode 각 객체에 'startTime'라는 값을 임의로 추가했다. 시작했는지 여부 판단 위해
AudioApi={
    analyser:Context.createAnalyser(),
    gainNode:Context.createGain(),
    frequencies:[
        50, 100, 200, 400, 800, 1600, 3200, 6400, 12800
    ],
    intervarFreq:null,
    intervarWave:null,
    view:{
        ch_시각화_정지:()=>{
            if(AudioApi.intervarFreq || AudioApi.intervarWave){
                clearInterval(AudioApi.intervarFreq)
                clearInterval(AudioApi.intervarWave)
                AudioApi.intervarFreq = AudioApi.intervarWave = null
                AudioApi.dom.파형.innerHTML = AudioApi.dom.주파수.innerHTML = ''
            }
            else{
                AudioApi.intervarFreq = setInterval(AudioApi.drowFreq, 50);
                AudioApi.intervarWave = setInterval(AudioApi.drowWave, 90);
            }
        }
    },
    dom:{},
    setup:()=>{
        AudioApi.dom.시각화_정지 = document.getElementById('시각화_정지')
        AudioApi.dom.시각화_정지.addEventListener('click',AudioApi.view.ch_시각화_정지)
        AudioApi.dom.파형 = document.getElementById('파형')
        AudioApi.dom.주파수 = document.getElementById('주파수')


        AudioApi.analyser.fftSize = 1024;
        AudioApi.get_eq_filter();

        //AudioApi.view.ch_시각화_정지();
        
        
        [...document.getElementsByClassName('eq_input')].forEach((k,i)=>{
            k.previousSibling.innerHTML=AudioApi.frequencies[i]+'Hz'
            k.previousSibling.addEventListener('click',((ind)=>{return e=>{e.target.nextElementSibling.nextElementSibling.innerHTML = e.target.nextElementSibling.value = AudioApi.BiquadFilterNode[ind].gain.value = 0; }})(i))
            k.addEventListener('input',
                ((ind)=>{return e=>{
                    e.target.nextElementSibling.innerHTML  = parseFloat( 
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
        const data = await fetch('./data/'+id)
        const arrayBuffer = await data.arrayBuffer()
        const decodedAudio = await Context.decodeAudioData(arrayBuffer)
        return decodedAudio;
    },
    new_source:()=>{
        const source = Context.createBufferSource(); 
        
        source.addEventListener('ended',(e)=>{
            const flag1 = Queue.get_pre_audio() && e.target == Queue.get_pre_audio().source
            const flag2 = Queue.get_pst_audio() && e.target == Queue.get_pst_audio().source
            
            console.timeLog('music','ended', flag1, flag2);
            if(flag1 || flag2) Player.change_audio() // 다른경우 -> 바뀐 경우..
        }) 
        const filters = AudioApi.BiquadFilterNode;

        source.connect(AudioApi.gainNode)
        .connect(filters[0])
        
        return source;
    },
    drowWave:()=>{
        
        let dataArray = new Uint8Array(AudioApi.analyser.frequencyBinCount); 
        AudioApi.analyser.getByteTimeDomainData(dataArray); //파장형태, getByteFrequencyData: 주파수영역
        const g = AudioApi.dom.파형
        g.innerHTML = ''
        const d = `M0 ${-dataArray[0]*2}`+[...dataArray].map((v,i)=>`L${i} ${-v*2}`).join('');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttributeNS(null, 'd', d);
        path.setAttributeNS(null, 'stroke', "red");
        path.setAttributeNS(null, 'fill', "none");
        path.setAttributeNS(null, 'stroke-width', "3px");
        g.appendChild(path)
    },
    drowFreq:()=>{
        
        let dataArray = new Uint8Array(AudioApi.analyser.frequencyBinCount); 
        
        AudioApi.analyser.getByteFrequencyData(dataArray); //파장형태, getByteFrequencyData: 주파수영역
        let g = AudioApi.dom.주파수
        g.innerHTML = ''
        //var d = `M0 ${dataArray[0]}`+[...dataArray].map((v,i)=>`L${i} ${v}`).join('');
        let d = 'M0 0'+[...dataArray].map((v,i)=>`L${i} ${-v*2}`).join('') + 'L512 0';
        let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttributeNS(null, 'd', d);
        path.setAttributeNS(null, 'stroke', "gray");
        path.setAttributeNS(null, 'fill', "black");
        path.setAttributeNS(null, 'opacity', "0.5");
        path.setAttributeNS(null, 'stroke-width', "1px");
        g.appendChild(path)
    },
    stop_source:(pre_source)=>{
        if(!pre_source.startTime) return pre_source;
        
        const new_source = AudioApi.new_source();
        pre_source.stop();
        new_source.buffer = pre_source.buffer;
        delete pre_source;
        return new_source;
    },
}




//2
console.time('music')
function sec2txt(x) {
    if (isNaN(x)) return '-';
    const 부호 = x>0?'':'-'
    x=x>0?x:-x
    let 시 = Math.floor(x / 3600);
    let 분 = Math.floor((Math.floor(x / 60)) % 60);
    let 초 = Math.floor(x % 60);
    
    if (초 < 10) 초 = `0${초}`;
    if (분 < 10) 분 = `0${분}`;
    if (시) return 부호+`${시}:${분}:${초}`;
    else return 부호+`${분}:${초}`;
}


Player = {
    view:{
        시간표기:2,
        ch_시간표기:()=>{Player.view.시간표기++},
        ch_끝으로:()=>{
            Player.change_audio()
        },
        ch_재생정지:()=>{
            
            console.log('[ch_재생정지] source')
            if(Context.state=="running") Context.suspend()
            else if(Context.state=="suspended") Context.resume()
            
        },
        
        ch_재생바:(비율)=>{
            //console.log('[ch_재생바]',비율)
            if(isNaN(비율)) 비율=0;
            const 가로 = Player.dom.재생바.clientWidth
            Player.dom.재생바안.style.width = 가로*비율+'px'
        },
        ch_신재생바:(비율)=>{
            //console.log('[ch_재생바]',비율)
            if(isNaN(비율)) 비율=0;
            Player.dom.신재생바.value = 비율
        },
        // ch_신재생바_클릭:(e)=>{
        //     const 위치 = e.offsetX;
        //     const 가로 = e.target.clientWidth
        //     console.log('신)재생바',위치, 가로)
        //     Player.view.재생위치변경(위치/가로)
        // },
        ch_재생바_클릭:(e)=>{
            const 위치 = e.offsetX;
            const 가로 = Player.dom.재생바.clientWidth
            Player.view.재생위치변경(위치/가로)
        },
        재생위치변경:(비율)=>{
            //console.log(e,e.offsetX)
            
            
            const pre_audio = Queue.get_pre_audio()
            let pre_source = pre_audio?pre_audio.source:undefined
            const next_audio = Queue.get_next_audio()
            const next_source = next_audio?next_audio.source:undefined
            
            if (!pre_audio || !pre_source.buffer) return undefined;

            const ct = pre_source.buffer.duration*비율;
            console.log('[ch_재생바_클릭]',비율, '[ct]',ct)
            try{
                //재생중임. 멈춰도 오류 x인것을 보면.
                pre_source.stop();
                console.log('[ch_재생바_클릭] try')
                const nextsource = AudioApi.new_source()
                nextsource.startTime = Context.currentTime - ct
                nextsource.buffer = pre_source.buffer
                pre_audio.source = nextsource;
                nextsource.start(Context.currentTime, ct, nextsource.buffer.duration-ct-pre_audio.e)
                // 재생->정지->재생
                
            }catch{
                console.log('[ch_재생바_클릭] catch')
                const nextsource = AudioApi.new_source()  
                nextsource.currentTime = ct;
                nextsource.buffer = pre_source.buffer
                pre_audio.source = nextsource;
            }

            pre_source = pre_audio.source
            // 다음곡이다.
            if (!next_source || !next_source.buffer ) return;
            
            try{
                next_source.stop()
                const new_source = AudioApi.new_source()
                new_source.buffer = next_source.buffer
                next_audio.source = new_source;

                next_source.start(
                    pre_source.startTime + pre_source.buffer.duration - pre_audio.e,
                    next_audio.s,
                    next_source.buffer.duration - next_audio.e - next_audio.s
                );
                next_source.startTime = Math.max(
                    pre_source.startTime + pre_source.buffer.duration - pre_audio.e - next_audio.s,
                    Context.currentTime - next_audio.s
                )
            }catch{console.log('[ch_재생바_클릭] catch 다음곡 멈춰있었음.')}

        },
        ch_볼륨:()=>{
            Player.dom.볼륨.nextElementSibling.innerHTML = parseFloat(AudioApi.gainNode.gain.value= Math.tan(0.72973*Player.dom.볼륨.value)/Math.tan(0.72973)).toFixed(3)
        },
        zero_볼륨:()=>{
            Player.dom.볼륨.nextElementSibling.innerHTML=Player.dom.볼륨.value='1.000'
        }
    },

    dom:{},
    setup:()=>{
        Player.dom.hide_title = document.getElementById('hide_title');
        Player.dom.hide_albumart = document.getElementById('hide_albumart');

        Player.dom.상태시간 = document.getElementById('상태시간');
        Player.dom.상태시간.addEventListener('click',Player.view.ch_시간표기);
        Player.dom.재생정지 = document.getElementById('재생정지');
        Player.dom.재생정지.addEventListener('click',Player.view.ch_재생정지);
        Player.dom.곡제목 = document.getElementById('곡제목');
        Player.dom.bar_곡제목 = document.getElementById('bar_곡제목_in_in');
        Player.dom.끝으로 = document.getElementById('끝으로');
        Player.dom.끝으로.addEventListener('click',Player.view.ch_끝으로);
        Player.dom.볼륨 = document.getElementById('볼륨');
        Player.dom.볼륨.addEventListener('input',Player.view.ch_볼륨);
        Player.dom.볼륨.nextElementSibling.addEventListener('click',Player.view.zero_볼륨);
        Player.view.ch_볼륨(); //기록이 있는상태로 새로고침했을때, inut과 output의 값이 다른 것 방지.
        Player.dom.엘범아트 = [document.getElementById('엘범아트'), document.getElementById('d_albumart_smail_in')]
        Player.dom.가사 = document.getElementById('가사');
        Player.dom.장르 = document.getElementById('장르');
        Player.dom.연도 = document.getElementById('연도');
        Player.dom.가수 = document.getElementById('가수');
        Player.dom.엘범 = document.getElementById('엘범');
        //Player.dom.신재생바 = document.getElementById('신재생바')
        Player.dom.재생바 = document.getElementById('재생바')
        Player.dom.재생바밖 = document.getElementById('재생바밖')
        Player.dom.재생바안 = document.getElementById('재생바안')
        Player.dom.재생바.addEventListener('click',Player.view.ch_재생바_클릭)
        //Player.dom.신재생바.addEventListener('click',Player.view.ch_신재생바_클릭)
        //Player.dom.재생바안.addEventListener('click',Player.view.ch_재생바_클릭)
        //Player.dom.재생바밖.addEventListener('click',Player.view.ch_재생바_클릭)
        //Player.dom.재생바밖 = document.getElementById('재생바밖')

        Player.intervar = setInterval(()=>{
            // 엘범 이미지 숨김 관련 처리
            Player.dom.hide_title.checked && document.title && (document.title='');
            [...document.getElementsByTagName('img')].forEach(v=>
                (!v.style.opacity || v.style.opacity!=Number(!Player.dom.hide_albumart.checked))&&(v.style.opacity=Number(!Player.dom.hide_albumart.checked)))

            //현재 음악 가져오기
            const pre_audio = Queue.get_pre_audio()
            const pre_source = pre_audio?pre_audio.source:undefined
            const next_audio = Queue.get_next_audio()
            

            if(!pre_audio || !pre_source.buffer) return;
            if (pre_source.buffer && !pre_source.startTime) return; // 단지 멈춰있는 경우니까. 취급x

            // 재생바 변경하기
            const 현재시간 = Context.currentTime - pre_source.startTime;
            const 총시간 = pre_source.buffer.duration;
            Player.view.ch_재생바(현재시간/총시간)
            //Player.view.ch_신재생바(현재시간/총시간)
            Player.dom.상태시간.innerHTML =  Player.view.시간표기%3==0? sec2txt(현재시간): (Player.view.시간표기%3==1?sec2txt(현재시간-총시간):`${sec2txt(현재시간)}/${sec2txt(총시간)}`)
            
            //다음곡 미리 준비하기
            if ((총시간 - 현재시간 - pre_audio.e) < 30 && next_audio && (!next_audio.source ||  !next_audio.source.startTime) ){
                console.log('[playmusic] before interver')
                Player.playmusic()
            }


            //안넘어가면 강제 넘김
            if ((총시간 - 현재시간 - pre_audio.e) < -0.2 ){ 
                console.log('[playmusic] 어떤 이유로 넘어가지 않음... 강제넘김. before change_audio')
                Player.change_audio()
            }

            
        },300)
    },
    playmusic(){  
        const pre_audio = Queue.get_pre_audio()
        if(!pre_audio) return;
        const pre_source = pre_audio.source
        const next_audio = Queue.get_next_audio()
        const next_source = next_audio?next_audio.source:undefined;
        
         if (!pre_source.startTime ){
            if(!pre_source.buffer && !pre_source.buffer_load) {
                console.log('[Player] [playmusic] 현재-오디오 before Queue.list_add_buffer')
                Queue.list_add_buffer(); Player.change_view(); Player.playmusic(); return;
            } // 아직 버퍼 준비가 안 되어있음.
            else if(!pre_source.buffer && pre_source.buffer_load) {
                console.log('[playmusic] 버퍼 로딩중',pre_source.buffer_load)
                pre_source.buffer_load.then(()=>{
                    if(pre_source.startTime) return;
                    console.log('[platmusic] 버퍼 로딩 프로미스 끝',pre_source.buffer_load); 
                    Player.change_view();
                    Player.playmusic();
            });
                return;
            } // 아직 버퍼 준비가 안 되어있음.

            console.log('[Player] [playmusic] if문 > 비워져 있음')
            pre_source.start(Context.currentTime,pre_audio.s, pre_source.buffer.duration-pre_audio.e-pre_audio.s); 
            pre_source.startTime = Context.currentTime - pre_audio.s; 

            

            console.log('[Player] [playmusic] if (Player.is_no_music() ){ -> change_view, Queue.top++ =>',Queue.top)
            Player.change_view()  
        }
        else{ // 다음 오디오 설정함.
            if(!next_audio) {Player.change_view(); return;} // 다음 곡 없음.
            if(!next_source.buffer) {
                console.log('[Player] [playmusic] before 다음오디오 Queue.list_add_buffer')
                if(!next_source.buffer_load){
                    Queue.list_add_buffer(); Player.change_view(); Player.playmusic(); 
                }else{
                    next_source.buffer_load.then(()=>{
                        console.log('[plamusic] nextsource 버퍼 로딩 프로미스 끝');
                        Player.change_view(); Player.playmusic();
                    })
                }
                return;  
            } // 아직 버퍼 준비가 안 되어있음.

            console.log('[Player] [playmusic] if문 > 안비워져 있음')
            
            if(pre_source.startTime && !next_source.startTime){  //현재 오디오 재생중임.
                next_source.start(
                        (pre_source.startTime + pre_source.buffer.duration - pre_audio.e)||Context.currentTime,
                        next_audio.s,
                        next_source.buffer.duration-next_audio.e-next_audio.e
                    );
                    next_source.startTime =  Math.max(
                        pre_source.startTime + pre_source.buffer.duration - pre_audio.e - next_audio.s,
                        Context.currentTime - next_audio.s
                    )||Context.currentTime - next_audio.s;

                    console.log('[playmusic] 다음 오디오 시작시각',next_source.startTime, '현재',Context.currentTime)
                }
        }
    },
    change_audio(){ //무조건 다음 곡으로 넘어감.
        const pre_audio = Queue.get_pre_audio()
        const pre_source = pre_audio?pre_audio.source:undefined
        const next_audio = Queue.get_next_audio()
        const next_source = next_audio?next_audio.source:undefined

        if(!pre_audio) { console.log('[change_audio] 곡 없음,',pre_audio); Player.change_view(); return;} //곡 없음
        else if(!pre_source || !pre_source.buffer) { console.log('[change_audio] 소스 없음,',pre_audio); Player.change_view(); Player.playmusic(); return;} //곡 없음

        if(!pre_source.startTime) {console.log('[change_audio] 시작 안함',pre_audio.file_name); Player.playmusic(); Player.change_view(); return;} // 버퍼는 있는데, 시작 x



        //지금 재생 멈추기
        if(pre_audio){
            console.log('[Player] [change_audio]')
            try{pre_source.stop()}catch{console.log('[change_audio] catch 이미 멈춰 있음.')}
            if(pre_audio) Player.log(pre_audio.music_id);
            Queue.list[Queue.top].source = undefined;
        }
        
        
        Queue.top++;
        console.log('[Player] [change_audio] before Queue.list_add_buffer')
        Queue.list_add_buffer()

        if(next_audio && !next_source.buffer) Player.playmusic()  // 다음 곡이 없는경우...
        
        if(next_audio && next_source.buffer){
            //멈춰였다면, 시작시키기.
            try{
                next_source.start(Context.currentTime, next_audio.s, next_source.buffer.duration-next_audio.e-next_audio.s); 
                next_source.startTime = Context.currentTime - next_audio.s; // 현재 시각 정보가 없음 ㅠㅠ
            }catch{
                console.log('[change_audio] catch 이미 시작되어 있음!', next_source.startTime, Context.currentTime)
            }
            
            //미래에서 움직인다면, 현재로 당기기.
            if (next_source.startTime > Context.currentTime){ // 미래에 시작예정. 지금 당장 시작함.
                console.log('[playmusic] 미래에 시작예정 - > 재조절')
                try{
                    next_source.stop()

                    const new_source = AudioApi.new_source()
                    new_source.buffer = next_source.buffer
                    new_source.start(
                        Context.currentTime,
                        next_audio.s,
                        new_source.buffer.duration-next_audio.e-next_audio.s
                    );
                    new_source.startTime =  Context.currentTime - next_audio.s

                    next_audio.source = new_source;
    
                }catch{console.log('근데, 시작된 것도 아니었다.')}
    
            }
        }
        
        
        console.log('[playmusic] before to change_view')
        Player.change_view();
        
    },
    change_view(){ // 가사, 엘범아트 등 변경.
        Queue.show()
        const pre_audio = Queue.get_pre_audio()
        console.log('[Play - change_view]', '[pre_audio]',pre_audio);
        
        document.title = Player.dom.곡제목.innerHTML = pre_audio?pre_audio.file_name:'곡을 다 재생했습니다.'
        Player.dom.bar_곡제목.innerHTML = pre_audio?(pre_audio.name?`<b>${pre_audio.name}</b><br>${pre_audio.singer}`:pre_audio.file_name):'곡을 다 재생했습니다.'
        
        if(!pre_audio){
                Player.dom.엘범아트.forEach(v=>v.src = './album_img/')
                Player.dom.가사.innerText = ''
                Player.dom.장르.innerText = ''
                Player.dom.연도.innerText = ''
                Player.dom.가수.innerText = ''
                Player.dom.엘범.innerText = ''
                Player.dom.상태시간.innerHTML = ''
        }else{
            if(pre_audio.album_id) Player.dom.엘범아트.forEach(v=>v.src = `./album_img/${pre_audio.album_id}`)//'data:image;base64,'+pre_music.info.albumart
            else Player.dom.엘범아트.forEach(v=>v.src = './album_img/');

            Player.dom.가사.innerText = pre_audio.lyric ? pre_audio.lyric.replace(/\n{2}/g,'\n').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/<(\/)?([a-zA-Z]*)(\s[a-zA-Z]*=[^>]*)?(\s)*(\/)?>/g,"") : '';
            Player.dom.장르.innerText = pre_audio.genre
            Player.dom.연도.innerText = pre_audio.year
            Player.dom.가수.innerText = pre_audio.singer;
            Player.dom.엘범.innerText = pre_audio.aname || pre_audio.album_name; // <-이거 변수 중복문제 고쳐야...
        }
            
    },is_not_played(){
        console.log('[Player] [is_not_played]')
        return (
            ( !Player.Audios[0].buffer && !Player.Audios[1].buffer ) ||
            ( !Player.Audios[0].startTime && !Player.Audios[1].startTime )     
        )
        // 주소가 없거나, 정지중이거나 x거나,
            
    },is_no_music(){
        const pre_source = Queue.list[Queue.top].source
        return ( !pre_source.buffer )  // 주소가 없음. 
    }
    ,log(id){
        console.log('[player] [log] id:',id)
        fetch('./log/'+id);
    },

    // ready(){ //큐의 각 값들을 알맞게 조절하기.

    // }
}



/////////////////////// 재생 단축키 관련 ///////////////////

document.addEventListener('keydown',e=>{
    console.log(e.key, e.keycode, e.target.tagName); 
    if(e.target.tagName=='INPUT')  return;

    switch(e.key){
        case ' ': 
            Player.dom.재생정지.click(); return;
    }
})