Search={
    setting:()=>{
        Search.dom.input = document.getElementById('search_quray')
        Search.dom.show = document.getElementById('search_result') 
        Search.dom.검색모드선택 = document.getElementById('검색모드선택') 
        Search.dom.search_btn = document.getElementById('search_btn')
        Search.dom.search_btn_reset = document.getElementById('search_btn_reset')
        Search.dom.search_btn.addEventListener('click',Search.search)
        Search.dom.search_btn_reset.addEventListener('click',(e)=>{Search.dom.input.value='';Search.search('')})
        Search.dom.input.addEventListener('keyup',Search.search)
        Search.dom.검색모드선택.addEventListener('click',Search.search)
    },
    dom:{

    },
    search:()=>{
        const value = Search.dom.input.value.trim()
        console.log('[search search], value:',value)
        const mode = Search.mode = document.querySelector('#검색모드선택 > label > input:checked').value
        // Search.ff={
        //     mode,
        //     body: value.split(' ')
        // }

        fetch("./search", {
            method: "POST",
            body: JSON.stringify({
                mode:mode,
                body: value.split(' ')
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then(d=>d.text()).then(data=>{
            Search.data = data = JSON.parse(data)
            console.log(data)
            Search.show(mode)

        })
    },
    show:(mode)=>{
        if(!Search.data) return; // || !Search.data.length

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
                //console.log('[zip] - next',list)
            }
            return out;
        }

        if (mode=='music'){
            let out = data.map((music,ind)=>{
                return `<div onclick = "Search.click(${ind})">  ${music.file_name} </div>`
            })
            
            Search.dom.show.innerHTML =  out.join('')
        }else if(!data || !data.length){Search.dom.show.innerHTML='';}
        else if(mode=='album'){
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
            else if (flag==2) out+='</div>'

            Search.dom.show.innerHTML =  out
        }
        else if(['year', 'genre', 'singer', 'lyric'].includes(mode)){
            if(mode=='singer') mode_key = 'sname'
            else if (mode=='lyric') mode_key = 'sname';
            else mode_key = mode


            const data2 = zip(data, mode_key)
            let out = ''
            for(let key in data2){

                out += `<div class='search_group search_${mode}' >
                    <span onclick="Search.click_child(this)"><b>${key}</b>:</span>
                    <div calss='search_${mode}_in'>
                        ${data2[key].map(music=>
                            `<div onclick = "Search.click(${music.search_tmp_id})">  ${music.file_name} </div>`
                        ).join('')
                        }
                    </div>
                </div>
                `
            }
            //console.log(data2)

            Search.dom.show.innerHTML =  out
        }
        else{

        }
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
        const data = Search.data;
        for(let i=0; i<data.length; i++){
            if (data[i].album_id==id) Queue.list_add(Search.data[i])
        }
        
        if (Player.is_no_music() && Queue.list.length<2) Player.playmusic()
        Queue.show()
    },
    click_child:(ele)=>{
        console.log(ele)
        let 속한것들 = ele.nextElementSibling.getElementsByTagName('div')
        if(속한것들) [...속한것들].forEach(v=>v.click())
    }
}