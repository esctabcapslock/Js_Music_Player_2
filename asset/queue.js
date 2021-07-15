Queue={
    list:[],
    top:0,
    mix:()=>{},
    dom:{},
    setup:()=>{
        Queue.dom.queue = document.getElementById('queue')
        Queue.dom.랜덤추가 = document.getElementById('랜덤추가')
        Queue.dom.queue_list = document.getElementById('queue_list')
        Queue.dom.남은시각 = document.getElementById('남은시각')
        Queue.dom.랜덤추가.addEventListener('click',Queue.random_add)
    },
    random_add:()=>{
        fetch('./length/music').then(d=>d.text()).then(data=>{
            var length = Number(data)
            if(isNaN(length)) return;
            var id = Math.floor(Math.random()*length)+1;
            
            fetch('./info/'+id).then(data=>data.text()).then(data=>{
                if(!data) return;
                var info = data?JSON.parse(data):null;
                Queue.list.push(info)
                Queue.show()
                
            })
        })
    },show:()=>{
        var out = Queue.list.map((v,i)=>(i>=Queue.top)?`<div ><span onclick="Queue.delete(${i})">x</span> ${v.file_name} </div>`:'')
        Queue.dom.queue_list.innerHTML = out.join('')
        Queue.dom.남은시각.innerHTML = sec2txt(Queue.remaintime())
    },
    result_add:()=>{},
    all_del:()=>{},
    overlap_remove:()=>{},
    recommend:()=>{},
    replay:()=>{},
    delete:(id)=>{
        Queue.list.splice(id,1)
        Queue.show()
    },
    sort:{
        year:()=>{},
        track:()=>{},
        album:()=>{},
        singer:()=>{},
    },
    remaintime:()=>{
        var out=0;
        var top = Queue.top;
        var list = Queue.list;
        for (var i=top; i<list.length; i++){
            var tmp = 144*list[i].duration/list[i].frequency*8
            if (!isNaN(tmp)) out+=tmp;
        }
        //var pre_audio = Player.Audios[Player.Audios_select]
        //var pre_music = Player.musics[Player.Audios_select]
        var next_music = Player.musics[Number(!Player.Audios_select)]

        /*if (pre_music && pre_audio.src){ // 진행중인 곡이 있음.
            var tmp = pre_audio.duration - pre_audio.currentTime - pre_music.e
            if (!isNaN(tmp)) out+=tmp;
        }*/
        if (next_music){
            var tmp = 144*next_music.duration/next_music.frequency*8 - next_music.s - next_music.e
            if (!isNaN(tmp)) out+=tmp;

        } 
        return out

    }
}