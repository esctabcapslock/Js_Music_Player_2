Search={
    setting:()=>{
        Search.part = 0; // 검색결과 부분..
        Search.dom.input = document.getElementById('search_quray')
        Search.dom.show = document.getElementById('search_result') 
        Search.dom.show.addEventListener('scroll',Search.show_scroll)
        Search.dom.search_mode = document.getElementById('search_mode') 
        Search.dom.search_btn = document.getElementById('search_btn')
        Search.dom.search_btn_reset = document.getElementById('search_btn_reset')
        Search.dom.search_btn.addEventListener('click',Search.first_search)
        Search.dom.search_btn_reset.addEventListener('click',(e)=>{Search.dom.input.value='';Search.first_search()})
        Search.dom.input.addEventListener('keyup',Search.first_search)
        Search.dom.search_mode.addEventListener('click',Search.first_search)
    },
    dom:{

    },
    check_end:()=>{
        const dh = Search.dom.show.scrollHeight-Search.dom.show.scrollTop-Search.dom.show.clientHeight;
        return (dh<=0)
    },
    show_scroll:(e)=>{ //어느 정도 내리면 다음 요청함.
        if(!Search.check_end()) return;
        Search.search();
    },
    first_search:()=>{
        Search.part = 0;
        Search.search();
    },
    search:()=>{
        const value = Search.dom.input.value.trim()
        console.log('[search search], value:',value)
        const mode = Search.mode = document.querySelector('#search_mode > label > input:checked').value
        // Search.ff={
        //     mode,
        //     body: value.split(' ')
        // }

        fetch("./search", {
            method: "POST",
            body: JSON.stringify({
                mode:mode,
                body: value.split(' '),
                part: Search.part
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then(d=>d.text()).then(data=>{
            Search.data = data = JSON.parse(data)
            console.log(data)
            Search.show(mode)
            
            //뒷부분 요청하게...
            Search.part+=1;
        })
    },
    get_img_opacity:()=>{
        return `style="opacity: ${Number(!Player.dom.hide_albumart.checked)};"`;
    },
    music_html:(music)=>{

        return `<div class='search_music' onclick = "Search.click(${music.search_tmp_id})">
                    <img src="./album_img/${music.album_id}" ${Search.get_img_opacity()}>
                    <div class='search_music_info'>
                        <div><b>${music.name?music.name:music.file_name}</b></div>
                        <div>${music.singer?music.singer:''}</div>
                        <div>${music.aname?music.aname:''}</div>
                    </div>
                    <div class='search_music_duration'>
                        <span>${music.genre?music.genre:''}</span>
                        <span>${music.year?music.year:''}</span>
                        <span>${sec2txt(144*music.duration/music.frequency*8)}</span>
                    </div>
                </div>`
    },
    show:(mode)=>{

        if(!Search.data) return; // || !Search.data.length
        Search.dom.show.style.backgroundColor='#FFF'

        //const mode = Search.mode
        const data = Search.data

        function zip(list, key){
            const out = {}
            list.forEach((v,i)=> {
                v.search_tmp_id = i;
                if(v[key] in out) out[v[key]].push(v)
                else out[v[key]] = [v]
            });

            for(let key in out){
                let list = out[key]
                //console.log('[zip] -pre',list)
                for(var i=0; i<list.length; i++){
                    let v = list[i]
                    if(!v) continue;
                    
                    v.singer = [v.sname]
                    if(i==0) continue;
                    let pre = list[i-1]
                    
                    if (pre.music_id == v.music_id) if(!pre.singer.includes(v.sname)){
                        pre.singer.push(v.sname)
                        list.splice(i,1)
                        i--;
                    }
                }
            }
            Search.data_zip = out;
            return out;
        }

        //이곳으로 출력될 것임.
        let out='';

        if (mode=='music'){
            const data2 = zip(data, 'file_name')
            //console.log(data2, data)
            //let out=''
            for(let key in data2){
                data2[key].forEach(music=>{
                    out+=Search.music_html(music)
                })
            }

            // let out = data.map((music,ind)=>{
            //     return `<div onclick = "Search.click(${ind})">  ${music.file_name} </div>`
            // })
            
        }else if(!data || !data.length){Search.dom.show.innerHTML='';}
        else if(mode=='album'){
            const data2 = zip(data, 'album_id')
            console.log(data2)
            out+="<div id='search_album'>"
            for(let key in data2){
                let info = data2[key][0];
                out+=`<div class="search_group search_album" alt='${key}' >
                <img src="./album_img/${info.album_id}" ${Search.get_img_opacity()}>
                <div>
                <button onclick = "Search.click_album(${info.album_id})" >전체재생</button>
                <button onclick = "Search.click_album_info(${info.album_id})" >상세정보</button>
                </div>
                <div><b>${info.aname}</b></div>
                <div>${info.singer}</div>
                </div>`
            }
            
            out+="</div>"

            /*
            get_album_name=(info, ind)=>{ 
                return `<div class="search_album" alt='${info.album_id}' >
                            <span onclick = "Search.click_album(${info.album_id})" > ${info.album_name}, ${info.year}, 장르: ${info.genre} 
                                <img src="./album_img/${info.album_id}"> 
                            </span>
                                ${get_music_name(info, ind)}`}
            get_music_name=(info, ind)=>{ 
                //console.log('[get_music_name]',ind,info.file_name);
                return `<div class="search_music" alt='${info.music_id}' onclick = "Search.click(${ind})">
                            <span class="search_track">${Number(info.track)}</span>
                                ${info.music_name?info.music_name:info.file_name}
                            <span calss="search_dura">${sec2txt(144*info.duration/info.frequency*8)}</span> 
                                <div>${get_singer_name(info)} `}
            get_singer_name=(info)=>{ return `${info.singer_name},`}

            let out= ` ${get_album_name(data[0],0)} `

            let flag = 0;
            for(let i=1; i<data.length; i++){
                if (data[i].music_id == data[i-1].music_id)      {falg=0; out+=get_singer_name(data[i],i)}
                else if (data[i].album_id == data[i-1].album_id) {falg=1; out+=`</div></div> ${get_music_name(data[i],i)} `}
                else                                             {flag=2; out+=`</div></div></div> ${get_album_name(data[i],i)}`}

                
            }
            if      (flag==0) out+='</div></div></div>'
            else if (flag==1) out+='/div></div>'
            else if (flag==2) out+='</div>'*/

        }
        else if(['year', 'genre', 'singer', 'lyric'].includes(mode)){
            if(mode=='singer') mode_key = 'sname'
            else if (mode=='lyric') mode_key = 'aname';
            else mode_key = mode


            const data2 = zip(data, mode_key)
            //let out = ''
            for(let key in data2){

                out += `<div class='search_group search_${mode}' >
                    <span onclick="Search.click_child(this)"><b>${key}</b>:</span>
                    <div class='search_${mode}_in'>
                        ${data2[key].map(music=>Search.music_html(music)).join('')}
                    </div>
                </div>
                `
            }
            //console.log(data2)

        }
        else{
            console.error('[Search-> 이상함..]')
            return;
        }
        
        console.log('[Search show]',Search.part, out.length);
        if(!Search.part) Search.dom.show.innerHTML = out;
        else Search.dom.show.innerHTML +=  out;
        //else if()
        //else if('year', 'genre', 'singer','lyric')
        
    },
    click:(id)=>{
        console.log('[click]',id)
        if(isNaN(id)) return;
        Queue.list_add(Search.data[id])

        if (Player.is_no_music() && Queue.list.length<2) Player.playmusic()
        Queue.show()
    },

    click_album:(id)=>{
        console.log('[click_album]',id)
        if(isNaN(id)) return;
        const data = Search.data_zip[id];
        data.forEach(music=>{
            if (music.album_id==id) Queue.list_add(music)
        })
        
        if (Player.is_no_music() && Queue.list.length<2) Player.playmusic()
        Queue.show()
    },
    click_child:(ele)=>{
        console.log(ele)
        let 속한것들 = ele.nextElementSibling.getElementsByTagName('div')
        if(속한것들) [...속한것들].forEach(v=>v.click())
    },
    click_album_info:(id)=>{
        if(isNaN(id)) return;
        const data = Search.data_zip[id].sort((a,b)=>Number(a.track)>Number(b.track)?1:-1)
        const info = data[0]
        const genre = [...new Set(data.map(v=>v.genre).filter(v=>v))]


        const singer = [];
        function singer_name_get(str){
            console.log('singer_name_get', str)
            const out = []
            let a=str.replace(/\((.*?)\)/g,'').split(',').map(v=>v.trim())
            let b = str.match(/\((.*?)\)/g);
            b=b?b:[];
            b=b.map(v=>v.replace(/\((.*?)\)/g,'$1').trim().replace(/^Feat(\.*)/gi,'').split(',').map(v=>v.trim()))
            a.forEach(v=>v&&!out.includes(v)&&out.push(v))
            b.forEach(v=>v.forEach(vv=>vv&&!out.includes(vv)&&out.push(vv)))
            return out;
        }

        //singer_name_get('마미손,(Feat. 장기하, YDG, 머쉬베놈)');

        data.forEach(music=>music.singer&&music.singer.forEach(s=>s&&singer_name_get(s).forEach(ss=>ss&&!singer.includes(ss)&&singer.push(ss))))


        console.log('[click_album_info]',data, genre, singer)
        out=`
            <div id='search_album_info_header'>
                <img src="./album_img/${info.album_id}" ${Search.get_img_opacity()}>
                <div>
                    <h3>${info.aname}</h3>
                    <div>
                        <span>${genre}</span>
                        <span>${info.year?info.year:''}</span>
                    </div>
                    <div>${singer.join(', ')}</div>
                    <button onclick = "Search.click_album(${info.album_id})" >전체재생</button>
                    <button onclick='Search.dom.show.innerHTML=unescape("${escape(Search.dom.show.innerHTML)}"); Search.dom.show.style.backgroundColor="#FFF"; Search.dom.show.scrollTop=${Search.dom.show.scrollTop} '>뒤로가기</button>
                </div>
            </div>
        `

        data.forEach(music=>{
            if (music.album_id==id) 
                out+=`<div class='search_music' onclick = "Search.click(${music.search_tmp_id})">
                        <div id='album_search_music_info_track'>${music.track?music.track:0}</div>
                        <div class='album_search_music_info'>
                            <div>
                                <div><b>${music.name?music.name:music.file_name}</b></div>
                                <div>${music.singer?singer_name_get(music.singer.join(',')).join(', '):''}</div>
                            </div>
                        </div>
                        <div class='search_music_duration'>
                            <span>${music.genre?music.genre:''}</span>
                            <span>${sec2txt(144*music.duration/music.frequency*8)}</span>
                        </div>
                    </div>`
        })
        
        Search.dom.show.innerHTML =  out;
        Search.dom.show.scrollTop=0

        try{
            let out=get_color(document.querySelector('#search_album_info_header img'));
            Search.dom.show.style.backgroundColor=`rgba(${out},0.3)`
        }catch{

        }

    }
}

