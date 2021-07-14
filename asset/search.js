Search={
    setting:()=>{
        Search.dom.input = document.getElementById('search_quray')
        Search.dom.show = document.getElementById('search') 
        document.getElementById('search_btn').addEventListener('click',Search.search)
    },
    dom:{

    },
    search:()=>{
        var value = Search.dom.input.value
        Search.mode = document.querySelector('#검색모드선택 > label > input:checked').value
        Search.ff={
            mode:Search.mode,
            body: value.split(' ')
        }

        fetch("./search", {
            method: "POST",
            body: JSON.stringify({
                mode:Search.mode,
                body: value.split(' ')
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then(d=>d.text()).then(data=>{
            Search.data = data = JSON.parse(data)
            console.log(data)
            Search.show()

        })
    },
    show:()=>{
        if(!Search.data) return;

        if (Search.mode=='music'){
            var out = Search.data.map((music,ind)=>{
                return `<div onclick = "Search.click(${ind})">  ${music.file_name} </div>`
            })
            
            Search.dom.show.innerHTML =  out.join('')
        }else{
            var data = Search.data
            get_album_name=(info, ind)=>{ 
                return `<div class="search_album" alt='${info.album_id}' >
                            <span onclick = "Search.click_album(${info.album_id})" > ${info.album_name}, ${info.year}, 장르: ${info.genre} 
                                <img src="./album_img/${info.album_id}"> 
                            </span>
                                ${get_music_name(info, ind)}`}
            get_music_name=(info, ind)=>{ 
                console.log('[get_music_name]',ind,info.file_name);
                return `<div class="search_music" alt='${info.music_id}' onclick = "Search.click(${ind})">
                            <span class="search_track">${Number(info.track)}</span>
                                ${info.music_name?info.music_name:info.file_name}
                            <span calss="search_dura">${sec2txt(144*info.duration/info.frequency*8)}s</span> 
                                <div>${get_singer_name(info)} `}
            get_singer_name=(info)=>{ return `${info.singer_name},`}

            var out= ` ${get_album_name(data[0])} `

            var flag = 0;
            for(var i=1; i<data.length; i++){
                if (data[i].music_id == data[i-1].music_id)      {falg=0; out+=get_singer_name(data[i],i)}
                else if (data[i].album_id == data[i-1].album_id) {falg=1; out+=`</div></div> ${get_music_name(data[i],i)} `}
                else                                             {flag=2; out+=`</div></div></div> ${get_album_name(data[i],i)}`}

                
            }
            if      (flag==0) out+='</div></div></div>'
            else if (flag==1) out+='/div></div>'
            else if (flag==2) out+='</div>'

            Search.dom.show.innerHTML =  out
        }
        
    },
    click:(id)=>{
        console.log('[click]',id)
        if(isNaN(id)) return;
        Queue.list.push(Search.data[id])

        if (Player.is_not_played()) Player.playmusic()
        Queue.show()
    },

    click_album:(id)=>{
        console.log('[click_album]',id)
        if(isNaN(id)) return;
        var data = Search.data;
        for(var i=0; i<data.length; i++){
            if (data[i].album_id==id) Queue.list.push(Search.data[i])
        }
        
        if (Player.is_not_played()) Player.playmusic()
        Queue.show()
    }
}