
const Context = new AudioContext();
//AudioBufferSourceNode 각 객체에 'startTime'라는 값을 임의로 추가했다. 시작했는지 여부 판단 위해

/**
 * @type {{
 *  analyser: AnalyserNode;
 *  gainNode: GainNode;
 *  intervarWave: null| NodeJS.Timer;
 *  intervarFreq: null| NodeJS.Timer;
 *  frequencies: number[];
 * }}
 */
const AudioApi={
    analyser:Context.createAnalyser(),
    gainNode:Context.createGain(),
    frequencies:[
        50, 100, 200, 400, 800, 1600, 3200, 6400, 12800
    ],
    /**
     * type
     */
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
            // 오류
            if (k.previousSibling==null) throw("k.previousSibling is null")
            if (!(k.previousElementSibling instanceof Element)) throw("k.previousSibling is not Element")
            k.previousSibling.innerHTML=AudioApi.frequencies[i]+'Hz'
            k.previousSibling.addEventListener('click',((ind)=>{
                return e=>{
                    if (e.target==null) throw("e.target is null")
                    e.target.nextElementSibling.nextElementSibling.innerHTML = e.target.nextElementSibling.value = AudioApi.BiquadFilterNode[ind].gain.value = 0;
                 }})(i))
            k.addEventListener('input',
                ((ind)=>{return e=>{
                if (e.target==null) throw("e.target is null")
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
    get_audio_buffer_by_file: async (file)=>{
        //console.log('[get_audio_buffer_by_file]',file)
        if(!file) return false;
        file = file.slice()
        const arrayBuffer = await file.arrayBuffer()
        const decodedAudio = await Context.decodeAudioData(arrayBuffer)
        return decodedAudio;
    },
    new_source:()=>{
        const source = Context.createBufferSource(); 
        
        source.addEventListener('ended',(e)=>{
            
            const flag1 = Queue.get_pre_audio() && e.target == Queue.get_pre_audio().source
            const flag2 = Queue.get_pst_audio() && e.target == Queue.get_pst_audio().source
            
            if(flag1 || flag2) console.timeLog('music','ended', flag1, flag2);
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

const Player = {
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
        play: ()=>{
            if(Context.state=="running") Context.suspend()
        },
        pause: ()=>{
            if(Context.state=="suspended") Context.resume()
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
            const pre_source = pre_audio?pre_audio.music_instance:undefined
            const next_audio = Queue.get_next_audio()
            const next_source = next_audio?next_audio.music_instance:undefined
            
            if (!pre_audio || !pre_source.loaded) return undefined;
            
            pre_source.reload(null, (pre_source.l-pre_source.s-pre_source.e)*비율).then(()=>{
            })
            
            if(next_audio && next_source.loaded)
                next_source.reload(pre_source.get_endTime(), 0)
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

        Player.intervar = setInterval(async ()=>{
            // 엘범 이미지 숨김 관련 처리
            Player.dom.hide_title.checked && document.title && (document.title='');
            [...document.getElementsByTagName('img')].forEach(v=>
                (!v.style.opacity || v.style.opacity!=Number(!Player.dom.hide_albumart.checked))&&(v.style.opacity=Number(!Player.dom.hide_albumart.checked)))

            //현재 음악 가져오기
            const pre_audio = Queue.get_pre_audio()
            const pre_source = pre_audio?pre_audio.music_instance:undefined
            const next_audio = Queue.get_next_audio()

            if(!pre_audio || !pre_source) return;
            //if (pre_source.buffer && !pre_source.startTime) return; // 단지 멈춰있는 경우니까. 취급x

            //업데이트 (스트리밍을 위함?)
            //if(typeof pre_source.update == "function") 
            pre_source.update()

            // 재생바 변경하기
            const 현재시간 = Context.currentTime - pre_source.startTime;
            const 총시간 = pre_source.l - pre_source.s - pre_source.e
            // console.log('재생시각', {현재시간,총시간}, Context.currentTime, pre_source, pre_source.startTime, pre_source.l,  pre_source.s)
            Player.view.ch_재생바(현재시간/총시간)
            //Player.view.ch_신재생바(현재시간/총시간)
            Player.dom.상태시간.innerHTML =  Player.view.시간표기%3==0? sec2txt(현재시간): (Player.view.시간표기%3==1?sec2txt(현재시간-총시간):`${sec2txt(현재시간)}/${sec2txt(총시간)}`)
            
            //다음곡 미리 준비하기
            if ((총시간 - 현재시간) < 30 && next_audio && (!next_audio.music_instance ||  !next_audio.music_instance.loaded) ){
                console.log('[playmusic] before interver')
                await Player.playmusic()
            }
            //안넘어가면 강제 넘김
            //console.log('[안넘어가면 강제 넘김]', 총시간, 현재시간, 총시간 - 현재시간)
            if (총시간>0 && (총시간 - 현재시간) < -0.2 ){ 
                console.log('[playmusic] 다음으로 넘김. before change_audio', pre_audio.music_id)
                if(pre_audio.music_id) Player.log(pre_audio.music_id); //끝까지 다 들었다고 판단, 로그 기록!
                await Player.change_audio()
            }
        },300)
    },
    async playmusic(){  
        const pre_audio = Queue.get_pre_audio()
        if(!pre_audio) return;
        const pre_source = pre_audio.music_instance
        const next_audio = Queue.get_next_audio()
        /** d */
        const next_source = next_audio?next_audio.music_instance:undefined;
        
        if(!pre_source.loaded){//로딩되지 않음.
            //music_id, startTime, s,e, duraction
            await pre_source.load(pre_audio.music_id,  null, pre_audio.s, pre_audio.e, pre_audio.l)
            console.log('[platmusic] 오디오 로딩 프로미스 끝',pre_source.buffer_load); 
                //Player.change_view();
            await Player.playmusic();//다음 곡 설정하기
                //곡 정보 받아온 되 로딩
            await Queue.list_add_data()
            Player.change_view()
        }
        else if(!next_audio) {Player.change_view(); return;} // 다음 곡 없음.
        else if(!next_source.loaded){
            //music_id, startTime, s,e, l
            await next_source.load(
                next_audio.music_id, 
                pre_source.startTime + pre_source.l - pre_source.e,
                next_audio.s,
                next_audio.e,
                next_audio.l,
            )     
        }
    },
    async change_audio(){ //무조건 다음 곡으로 넘어감.
        const pre_audio = Queue.get_pre_audio()
        const pre_source = pre_audio?pre_audio.music_instance:undefined
        const next_audio = Queue.get_next_audio()
        const next_source = next_audio?next_audio.music_instance:undefined
        if(!pre_audio) { console.log('[change_audio] 곡 없음,',pre_audio); Player.change_view(); return;} //곡 없음
        else if(!pre_source || !pre_source.loaded) { console.log('[change_audio] 소스 없음,',pre_audio); Player.change_view(); await Player.playmusic(); return;} //곡 있는데 시작 안 함.
        //if(!pre_source.startTime) {console.log('[change_audio] 시작 안함',pre_audio.file_name); Player.playmusic(); Player.change_view(); return;} // 버퍼는 있는데, 시작 x
        //지금 재생 멈추기
        console.log('[Player] [change_audio]')
        pre_source.remove();

        //if(pre_audio) Player.log(pre_audio.music_id);// -> 강제로 넘긴 건 기록 X
        //try{pre_source.stop()}catch{console.log('[change_audio] catch 이미 멈춰 있음.')}
        //Queue.list[Queue.top].source = undefined;
        
        Queue.top++;
        Queue.show();
        console.log('[Player] [change_audio] before Queue.list_add_buffer')
        Queue.list_add_data().then(()=>Player.change_view())
        if(!next_audio) await Player.playmusic()  // 다음 곡이 없는경우...
        else if(next_source.loaded == false){
            //다음 곡이 시작되어 있지 않다면,
            //load(music_id, startTime, s,e, l)
            next_source.load(next_audio.music_id, null, next_audio.s, next_audio.e, next_audio.l)
            .then(()=>{
                console.log('[playmusic] before to change_view')
                Player.change_view();
            })
        }
        else if(Math.abs(next_source.startTime - Context.currentTime)>0.5){
            //다음 곡이 한참 뒤에 시작되어 있었음.
            console.log('[Player] [change_audio] before next_source.reload',next_source.loaded)
            next_source.reload(null, 0)
            .then(()=>{
                console.log('[playmusic] before to change_view')
                Player.change_view();
            })
        }else{
            console.log('[playmusic] before to change_view')
            Player.change_view();
        }
        
    },
    change_view(){ // 가사, 엘범아트 등 변경.
        Queue.show()
        const pre_audio = Queue.get_pre_audio()
        // console.log('[Play - change_view]', '[pre_audio]',pre_audio);

        if(pre_audio){ navigator.mediaSession.metadata = new MediaMetadata({
            title: pre_audio.name?pre_audio.name:pre_audio.file_name,
            artist: pre_audio.singer,
            album: pre_audio.aname || pre_audio.album_name,
            // artwork: [{ src: 'album-art.jpg', sizes: '512x512', type: 'image/jpeg' }]
        });navigator.mediaSession.playbackState = "playing";}
        else {delete navigator.mediaSession.metadata; navigator.mediaSession.playbackState = "paused"; }
        
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
            
            Player.dom.가사.innerText = pre_audio.lyric ? pre_audio.lyric.replace(/\n{2}/g,'\n').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/<(\/)?([a-zA-Z]*)(\s[a-zA-Z]*=[^>]*)?(\s)*(\/)?>/g,"") : '';
            Player.dom.장르.innerText = pre_audio.genre
            Player.dom.연도.innerText = pre_audio.year
            Player.dom.가수.innerText = pre_audio.singer;
            Player.dom.엘범.innerText = pre_audio.aname || pre_audio.album_name; // <-이거 변수 중복문제 고쳐야...
            if(pre_audio.album_id){
                (async ()=>{
                    const data = await fetch(`./album_img/${pre_audio.album_id}`)
                    const imgdata = await data.blob()
                    const objectURL = URL.createObjectURL(imgdata)
                    //console.log('[dataurl]',data, objectURL)
                    Player.dom.엘범아트.forEach(v=>v.src = objectURL)//'data:image;base64,'+pre_music.info.albumart
                })();   
                //Player.dom.엘범아트.forEach(v=>v.src = `./album_img/${pre_audio.album_id}`)//'data:image;base64,'+pre_music.info.albumart
            } 
            else Player.dom.엘범아트.forEach(v=>v.src = './album_img/');

        }
    },is_not_played(){
        console.log('[Player] [is_not_played]')
        return (
            ( !Player.Audios[0].buffer && !Player.Audios[1].buffer ) ||
            ( !Player.Audios[0].startTime && !Player.Audios[1].startTime )     
        )
        // 주소가 없거나, 정지중이거나 x거나,
    },is_no_music(){
        const pre_source = Queue.list[Queue.top].music_instance
        return ( !pre_source.loaded )  // 주소가 없음. 
    }
    ,log(id){
        console.log('[player] [log] id:',id)
        fetch('./log/'+id);
    },
    // ready(){ //큐의 각 값들을 알맞게 조절하기.
    // }
}
class Music_instance{
    constructor(){
        this.loaded = false;
        
    }
    load(music_id, startTime, s,e, l){
        if(this.loaded) return;
        console.log('[load/Music_instance]',music_id, startTime, s,e, l);

        this.music_id = music_id
        this.loaded = true;
        this.startTime = startTime; //source.start에 들어가는 값이다.
        this.s = s;
        this.e = e;
        this.l = l;
        return new Promise(async (resolve, rejects)=>{
            this.source = await AudioApi.new_source()
            this.source.buffer = await AudioApi.get_audio_buffer_by_fetch(music_id)
            if(!startTime) this.startTime = Context.currentTime - this.s
            if(this.source.buffer.duration) this.l = this.source.buffer.duration; //좋게 업데이트
            console.log('[playmusic > Music_instance > load], music_id:',music_id,'this.startTime:',this.startTime, 's,e,l:',this.s, this.e, this.l)
            await this.source.start(Math.max(0,this.startTime), this.s, this.l-this.e-this.s); 
			// max는 ios를 위함. start의 첫 인자가 음수가 되면 안된데
			// 근데 ios에서 Web Audio Api 백그라운드 재생이 막힌듯??
            resolve()
        })
    }
    reload(startTime, currentTime){  //currentTime: 사용자 기준 현재시간
        return new Promise(async (resolve, rejects)=>{
            if(!this.loaded) rejects('load 되지 않았음...');

            console.log('[playmusic > Music_instance > reload], startTime:',startTime,'currentTime', currentTime)
            
            try{this.source.stop()}
            catch(err){console.log('[playmusic > Music_instance > reload] err시작된 적 없었음',err)}
            const nextsource = AudioApi.new_source()
            nextsource.buffer = this.source.buffer
            if(!startTime) this.startTime = Context.currentTime - currentTime - this.s;
            else this.startTime = startTime
            await nextsource.start(this.startTime+currentTime, currentTime + this.s, this.l-currentTime-this.e)
            this.source = nextsource;
            resolve();
        })
    }
    update(){//넘어가기
    }
    remove(){
        if(this.source){
            this.source.stop()
            delete this.source
        }
        //this.loaded = false;
    }
    get_endTime(){
        return this.startTime + this.l - this.e
    }
    is_started(){ //시작되었는지 확인한다.
        return (this.startTime - Context.currentTime)<=0;
    }
}
/**
 * A class representing a streaming music instance.
 * @extends Music_instance
 */
class Music_instance_stream extends Music_instance{
    constructor(){
        super()
        /** @type {(AudioBufferSourceNode|boolean)[]} */
        this.sources = []; //소스 목록들
        /**
         * @type {{[key:number]:boolean}} 
         */
        this.loaded_list = {}
        this.updating = false;
        /**
         * mp3 파일 조각 정보 저장.
         * @property {number[]} m3u8 - An array representing M3U8 information.
         * @property {boolean} ended - The state of M3U8 data.
         * @property {boolean} nowLoading - Indicates if the M3U8 is loaded.
         */
        this.m3u8 = {nowLoading: false, ended:false, data:[]}  //this.m3u8.nowLoading 
    }
    //super.reload(music_id, startTime, s,e, l) > 이거 가능함
    load(music_id, startTime, s,e, l){
        console.log('[load/Music_instance_stream]',music_id, startTime, s,e, l);
        // console.log('[playmusic > Music_instance_stream > load]', {startTime})
        this.music_id = music_id
        this.loaded = true;
        this.startTime = startTime?startTime:Context.currentTime; //source.start에 들어가는 값이다. 이 곡이 시작한 절대시간값.
        this.s = s;
        this.e = e;
        this.l = l;
        // console.log('[this.l]',this.l)
        return new Promise(async (resolve, reject)=>{
            const res = await fetch('./stream/create',{
                method:'POST',
                body:JSON.stringify({
                    type:'create',
                    music_id
                })
            })
            if(res.status!=200){
                console.error('[playmusic > Music_instance_stream > load > fetch false]')
                reject(res.text());
            }else{
                const {m3u8, ended} = await  res.json()
                this.m3u8.data = m3u8; this.m3u8.ended = ended
                if(ended){
                    console.log('ended', ended)
                    this.l = m3u8[m3u8.length-1][2]+m3u8[m3u8.length-1][3]
                }
                await this.update()
                resolve(this.m3u8);
                
            }
        })
    }

    async loadSource(music_index){
        const res = await fetch('./stream/get_ts',{
            method:'POST',
            body:JSON.stringify({
                type:'get_ts',
                music_id:this.music_id,
                index:music_index
        })})
        if(res.status != 200) {this.sol_404(); return false;}
        const source = await AudioApi.new_source()
        source.buffer = await AudioApi.get_audio_buffer_by_file(await res.blob())
        return source
    }
    async update(){
        if (this.updating == true) return
        if(!this.m3u8 ) return
        if(this.startTime==undefined){console.error('this.startTime == undefined',this.startTime); return;}
        const 현재시간 =  Context.currentTime - this.startTime + this.s // 원본 mp3파일 내부에서의 시각.
        this.updating = true
        let load_flag = 0
        if(this.m3u8.ended == false) await this.update_m3u8() // m3u8데이터가 부족하면 더 요청하기.
        const 미리요청시간 = 20 // 20초 이내의 스트림만 받아올 것.

        // console.log('[this.m3u8.data 업뎃시작]', this.m3u8.data, this.m3u8.data.length)

        const new_m3u8 = []
        // currentTime: 가상 mp3파일로부터 몇초째인가.
        // offset: 해당 m3u8 조각의 어디를 실행해야 하는가
        // dur: 가상 m3u8조각의 길이.
        for (let i=0; i<this.m3u8.data.length-1; i++){
            let endTime = (this.m3u8.data[i][2] + this.m3u8.data[i][3] + this.m3u8.data[i+1][2])/2
            if (i==0){ new_m3u8.push({offset: this.s, dur: endTime, currentTime:0}); continue}
            let lastChunkDataEnd = (this.m3u8.data[i-1][2] + this.m3u8.data[i-1][3] + this.m3u8.data[i][2])/2
            let startTimeOffset = lastChunkDataEnd - this.m3u8.data[i][2]
            new_m3u8.push({offset: startTimeOffset, dur: endTime-lastChunkDataEnd, currentTime: lastChunkDataEnd-this.s});
        }
        if (this.m3u8.ended){
            let i = this.m3u8.data.length-1
            let lastChunkDataEnd = (this.m3u8.data[i-1][2] + this.m3u8.data[i-1][3] + this.m3u8.data[i][2])/2
            let startTimeOffset = lastChunkDataEnd - this.m3u8.data[i][2]
            new_m3u8.push({offset: startTimeOffset, dur:  this.m3u8.data[i][2]-startTimeOffset, currentTime:lastChunkDataEnd-this.s});
        }
        // console.log('old',this.m3u8.data,'new_m3u8',new_m3u8)
        
        for (const i in new_m3u8){
            // 1. 현재 곡을 업데이트합니다.
            // 2. 미래 곡을 업데이트 생각합니다.

            
            // 현재 곡 업뎃.
            if (this.sources[i] instanceof Promise || this.sources[i] instanceof AudioBufferSourceNode ) continue; // 만약 현재곡이 재생중이라면? 아무것도 안하기.
            const {currentTime, dur, offset} = new_m3u8[i] //역시 절대적

            if ((this.startTime + currentTime - Context.currentTime) > 미리요청시간) continue; // 미리요청시각 이내의 시간만 업데이트할 것. 미리요청시간 이후 요청은 블락.
            const offert_중간에실행 = Context.currentTime - this.startTime - currentTime // 현재 가상block에서 몇초 부분을 실행해야 하는가.
            if (offert_중간에실행 > dur) continue //// 과거에 이미 실행되고 종료되었어야 하는 값이다.
            // console.log(`this.m3u8.data of ${i}th - 실행체크.`, ((this.startTime + (time_sum-this.s)) - Context.currentTime), 미리요청시간)
            // console.log(`this.m3u8.data of ${i}th - 실행체크.`, {offert_중간에실행, mp3_len})
            // console.log(`this.m3u8.data of ${i}th - 실행체크.`, `- this.s:${this.s}, time_sum:${time_sum}, this.startTime:${this.startTime}`)


            this.sources[i] = new Promise(async (resolve)=>{
                const source = await this.loadSource(i)
                if ( Context.currentTime > (this.startTime + currentTime)){ // 만일 네트워크 지연으로, 예정시각보다 늦게 로딩되었다면. 
                    console.log('만일 네트워크 지연으로, 예정시각보다 늦게 로딩되었다면. ')
                    // console.log('startTime:',this.startTime, 'Context.currentTime', Context.currentTime, 'time_sum', time_sum, )
                    // console.log('startTime update:', Context.currentTime - time_sum )

                    if (offert_중간에실행<0) throw("offert_중간에실행 < 0, v:"+offert_중간에실행, source)
                    source.start(0, offert_중간에실행+offset , dur-offert_중간에실행) // end_offset은 걍 무시해보도록하자.
                    console.log(`<b>audio start with ${i}th now</b>`, Context.currentTime, `and will be ended at ${Context.currentTime+mp3_len-offert_중간에실행}, duraction:${source.buffer.duration}`)
                    // console.log({Context_currentTim:Context.currentTime,mp3_len,offert_중간에실행})
                    this.startTime = Context.currentTime - time_sum - offert_중간에실행 + this.s; // 실행체크. 9.192 20 -> 행체크. 9.242 20 // 실행체크. 9.192
                    // console.log(this.startTime)
                }else{ // 지연 없이 정각에 실행될 예정임
                    console.log('지연 없이 정각에 실행될 예정임', this.startTime + currentTime)
                    // console.log({time_sum, this_s:this.s,  this_startTime: this.startTime })
                    source.start(this.startTime + currentTime, offset, dur)
                    console.log(`<b>audio start with ${i}th</b>`, Context.currentTime, `and will started at ${this.startTime + currentTime} and duar:${dur}`)
                }
                this.sources[i] = source
                resolve()
            })

        }

        /*
        for (const i in this.m3u8.data){
            // 1. 현재 곡을 업데이트합니다.
            // 2. 미래 곡을 업데이트 생각합니다.

            
            // 현재 곡 업뎃.
            if (this.sources[i] == true || this.sources[i] instanceof AudioBufferSourceNode ) continue; // 만약 현재곡이 재생중이라면? 아무것도 안하기.
            const [_, __, time_sum, mp3_len] = this.m3u8.data[i] //역시 절대적

            if (((this.startTime + (time_sum-this.s)) - Context.currentTime) > 미리요청시간) continue; // 미리요청시각 이내의 시간만 업데이트할 것. 미리요청시간 이후 요청은 블락.
            const offert_중간에실행 = Context.currentTime - this.startTime + this.s - time_sum // 현재 block에서 몇초 부분을 실행해야 하는가.
            if (offert_중간에실행 > mp3_len) continue //// 과거에 이미 실행되고 종료되었어야 하는 값이다.
            // console.log(`this.m3u8.data of ${i}th - 실행체크.`, ((this.startTime + (time_sum-this.s)) - Context.currentTime), 미리요청시간)
            // console.log(`this.m3u8.data of ${i}th - 실행체크.`, {offert_중간에실행, mp3_len})
            // console.log(`this.m3u8.data of ${i}th - 실행체크.`, `- this.s:${this.s}, time_sum:${time_sum}, this.startTime:${this.startTime}`)


            this.sources[i] = new Promise(async (resolve)=>{
                const source = await this.loadSource(i)
                if ( Context.currentTime > (this.startTime + (time_sum-this.s))){ // 만일 네트워크 지연으로, 예정시각보다 늦게 로딩되었다면. 
                    console.log('만일 네트워크 지연으로, 예정시각보다 늦게 로딩되었다면. ')
                    // console.log('startTime:',this.startTime, 'Context.currentTime', Context.currentTime, 'time_sum', time_sum, )
                    // console.log('startTime update:', Context.currentTime - time_sum )

                    if (offert_중간에실행<0) throw("offert_중간에실행 < 0, v:"+offert_중간에실행, source)
                    source.start(0, offert_중간에실행 , mp3_len-(i==0)*this.s) // end_offset은 걍 무시해보도록하자.
                    console.log(`<b>audio start with ${i}th now</b>`, Context.currentTime, `and will be ended at ${Context.currentTime+mp3_len-offert_중간에실행}, duraction:${source.buffer.duration}`)
                    // console.log({Context_currentTim:Context.currentTime,mp3_len,offert_중간에실행})
                    this.startTime = Context.currentTime - time_sum - offert_중간에실행 + this.s; // 실행체크. 9.192 20 -> 행체크. 9.242 20 // 실행체크. 9.192
                    // console.log(this.startTime)
                }else{ // 지연 없이 정각에 실행될 예정임
                    console.log('지연 없이 정각에 실행될 예정임', this.startTime + time_sum - this.s)
                    // console.log({time_sum, this_s:this.s,  this_startTime: this.startTime })
                    source.start(this.startTime + time_sum - this.s, (i==0)*this.s, mp3_len-(i==0)*this.s)
                    console.log(`<b>audio start with ${i}th</b>`, Context.currentTime, `and will started at ${this.startTime + time_sum - this.s} and duar:${source.buffer.duration}`)
                }
                this.sources[i] = source
                resolve()
            })

        }*/
        1;

        /*

         지연 없이 정각에 실행될 예정임 9.24 play2.js:629:25
03:38:36.813
Object { time_sum: 10.008000000000001, this_s: 0.768, this_startTime: 0 }


        for(let i in this.m3u8.data){
            i = Number(i);
            const [_, __, time_sum, mp3_len] = this.m3u8.data[i] //역시 절대적
            //console.log('[for]',i, time_sum, 현재시간, this.startTime)

            if(time_sum < 현재시간) continue;
        
            //바로 직전 것 생각하기
            if(i>=1 && !this.loaded_list[i-1]){
                const [_, __, pre_time_sum, pre_mp3_len] = this.m3u8.data[i-1]
                const pre_start_offet = i==1?this.s:0 //시작하는 거면
                //이전 소스 시작 절대시작시각 < 지금절대시각
                if(this.startTime+pre_time_sum-this.s+pre_start_offet <= Context.currentTime){ //이미 시작했어야 했는데, 안 함. reload와 관련있는 부분이다.
                    let 시작지점 = (현재시간 - pre_time_sum) //버퍼 내 절대적 입장에서,, 지금 내 부분
                    const ct_tmp = Context.currentTime
                    //10 중 만약 6에 시작했어. 6인거지. 시작한 시간도 6에 맞춰져 있는거야. -> 6이여야 함.

                    const res = await fetch('./stream/get_ts',{
                        method:'POST',
                        body:JSON.stringify({
                            type:'get_ts',
                            music_id:this.music_id,
                            index:i-1
                    })})
                    if(res.status != 200) {this.sol_404(); return false;}
                    const source = await AudioApi.new_source()
                    source.buffer = await AudioApi.get_audio_buffer_by_file(await res.blob())
                    console.log('source [시작지점, pre_mp3_len,pre_start_offet]',i-1,시작지점, pre_mp3_len,pre_start_offet)
                    //시작지점 = (Context.currentTime - this.startTime-pre_time_sum+this.s)//시작지점 재설정!
                    const δ = ct_tmp-Context.currentTime
                    if(!this.loaded_list[i-1] && pre_mp3_len>시작지점+δ){//재확인!!
                        console.log('source 아직X [ct_tmp, 시작지점, pre_mp3_len-시작지점]',i-1,ct_tmp, 시작지점, pre_mp3_len-시작지점)
                        source.start(ct_tmp, 시작지점+δ, pre_mp3_len-시작지점-δ)//당장 시작..
                        //this.startTime = Context.currentTime - 시작지점 - pre_time_sum +this.s
                        this.sources.push(source)
                        this.loaded_list[i-1] = true
                    }  else if(pre_mp3_len<시작지점){
                        console.error('[pre_mp3_len<시작지점],',pre_mp3_len, 시작지점)
                    }
                    
                }else{
                    console.log('이건 뭔 상황 제보좀')
                }
            }

            load_flag++;

            if(load_flag>3) break; //너무 많은 것을 받아오지 않기
            if(this.loaded_list[i]) continue; //이미 재생중이라면, 사절

            const res = await fetch('./stream/get_ts',{
                method:'POST',
                body:JSON.stringify({
                    type:'get_ts',
                    music_id:this.music_id,
                    index:i
            })})
            if(res.status != 200) {this.sol_404(); return false;}
            const source = await AudioApi.new_source()
            source.buffer = await AudioApi.get_audio_buffer_by_file(await res.blob())
            const start_offet = i==0?this.s:0 //시작하는 거면
            const end_offset = (this.m3u8.ended && i==this.m3u8.data.length-1)?this.e:0;
            if(this.loaded_list[i]) continue;
            source.start(this.startTime+time_sum+start_offet-this.s, start_offet, mp3_len-start_offet-end_offset)
            //console.log('[source]',i,source, Context.currentTime, this.startTime+time_sum-i*0.03, start_offet, mp3_len-start_offet-end_offset)
            this.sources.push(source)
            this.loaded_list[i] = true
            //this.source.start(this.startTime, this.s, this.l-this.e-this.s); 
        }
        */

        this.updating = false
        
    }

    sol_404(){
        console.log('[sol_404 refresh]')
        fetch('./stream/create',{
        method:'POST',
        body:JSON.stringify({
            type:'create',
            music_id:this.music_id
        })})
    }
    

    async update_m3u8(){
        // console.log('[update_m3u8]', this.m3u8.nowLoading, this.m3u8, this.music_id)
        if (this.m3u8.nowLoading == true) return // 로딩중이라면 또 요청하지 않기.
        if (this.music_id == undefined) return // this.music_id가 없다면 안 가져오기
        if(this.m3u8.ended == true) return; //모두 가져왔다면, 더 가져오지 않기.
        this.m3u8.nowLoading = true; // 중복접근방지.
        const res = await fetch('./stream/get_m3u8',{
            method:'POST',
            body:JSON.stringify({
                type:'get_m3u8',
                music_id:this.music_id
            })
        });

        if(res.status!=200) { this.m3u8.nowLoading = false; return false;}
        const {m3u8, ended} = await res.json()
        this.m3u8.data = m3u8
        this.m3u8.ended = ended
        this.m3u8.nowLoading = false
        if(this.m3u8.ended){
            this.l = m3u8[m3u8.length-1][2]+m3u8[m3u8.length-1][3]
        }
    }

    reload(startTime, currentTime){//currentTime:사용지 입장 위치
        console.log('[reload]', {startTime, currentTime})
        return new Promise( async( resolve)=>{
            await this.remove();
            if(!startTime) this.startTime = Context.currentTime - currentTime;// - this.s; //지금 당장 시작하기를 바라는 것
            else this.startTime = startTime //나중에 해당 시각에 시작하길 바람
            await this.update()
            resolve()
        })
        
    }
    remove(){
        if(!this.loaded) return;
        console.log('[remove]')
        const sources = this.sources
        this.sources = []; //소스 목록들
        this.loaded_list = {} //목록도 정지.
        sources.forEach(async (v,i)=>{
            if (v instanceof AudioBufferSourceNode) v.stop();
            if (v instanceof Promise){
                await v
                v = sources[i]
                if (v instanceof AudioBufferSourceNode) v.stop();
                else throw("remove(){ -> error")
            }
        
        }) //모두 정지
        //this.loaded = false;
    }

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

/////// Media Session API /////


navigator.mediaSession.setActionHandler("play", () => {
    /* Code excerpted. */
    Player.view.play()
});
navigator.mediaSession.setActionHandler("pause", () => {
    /* Code excerpted. */
    Player.view.pause()
});
navigator.mediaSession.setActionHandler("stop", () => {
    /* Code excerpted. */
    Player.view.pause()
});
// navigator.mediaSession.setActionHandler("seekbackward", () => {
//     /* Code excerpted. */
// });
// navigator.mediaSession.setActionHandler("seekforward", () => {
//     /* Code excerpted. */
// });
// navigator.mediaSession.setActionHandler("seekto", () => {
//     /* Code excerpted. */
// });
// navigator.mediaSession.setActionHandler("previoustrack", () => {
//     /* Code excerpted. */
// });
// navigator.mediaSession.setActionHandler("nexttrack", () => {
//     /* Code excerpted. */
// });
// navigator.mediaSession.setActionHandler("skipad", () => {
//     /* Code excerpted. */
// });

/*

ado = document.getElementsByTagName('audio')[0]
navigator.mediaSession.setActionHandler("nexttrack", () => {
    next_song()
});
async function next_song(){
    ado.src="data/"+parseInt(Math.random()*music_len+1)
    set_media();
}
async function set_media() {
    data = await (await fetch('/info/' + ado.src.split('/')[4])).json()
    document.title = data.name ? `${data.name} - ${data.singer}` : data.file_name
    albumart = data.album_id ? [{ src: `/album_img/${data.album_id}`, sizes: '512x512', type: 'image/jpeg' }] : undefined
    navigator.mediaSession.metadata = new MediaMetadata({
        title: data.name ? data.name : data.file_name,
        artist: data.singer,
        album: data.aname || data.album_name,
        artwork: albumart
    })
}
set_media()

 */

