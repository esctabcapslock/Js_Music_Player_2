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
    list_add:(info)=>{
        console.log('[queue] [list_add], info:',info)

        if (isNaN(info.blank_start)) info.blank_start = 0
        if (isNaN(info.frequency))   info.frequency = 0
        if (isNaN(info.blank_end))   music.blank_end = 0
        info.s = info.frequency? 144*info.blank_start /info.frequency*8 : 0
        info.e = info.frequency? 144*info.blank_end   /info.frequency*8 : 0
        info.l = info.frequency? 144*info.duration    /info.frequency*8 : 0

        info.source = AudioApi.new_source()
        Queue.list.push(info)
        Queue.show()
        Queue.list_add_buffer();

    },
    list_add_buffer:()=>{
        console.log('[queue] [list_add_buffer]', Queue.list.length)
        for(var i=Queue.top; i<Queue.top+5; i++) if(Queue.list[i] && !Queue.list[i].source.buffer && !Queue.list[i].source.buffer_load){
            var info = Queue.list[i]
            info.source.buffer_load = 
                new Promise(function(resolve, reject) {
                    ((info)=>{AudioApi.get_audio_buffer_by_fetch(info.music_id).then(audio=>{
                        console.log('[list_add_buffer for_in]',info.file_name)
                        if(!info.source.buffer) info.source.buffer = audio;
                        resolve()
                    })})(Queue.list[i]);
                })
        }
    },
    random_add:()=>{
        fetch('./length/music').then(d=>d.text()).then(data=>{
            var length = Number(data)
            if(isNaN(length)) return;
            var id = Math.floor(Math.random()*length)+1;
            
            fetch('./info/'+id).then(data=>data.text()).then(data=>{
                if(!data) return;
                var info = data?JSON.parse(data):null;
                Queue.list_add(info)
                
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
        for (var i=top; i<list.length; i++) if(list[i]) {
            var tmp = 144*list[i].duration/list[i].frequency*8
            if (!isNaN(tmp)) out+=tmp;
        }
        return out

    },
    get_pst_audio:()=>{
        return Queue.list[Queue.top-1]
    },
    get_pre_audio:()=>{
        return Queue.list[Queue.top]
    },
    get_next_audio:()=>{
        return Queue.list[Queue.top+1]
    }

}