function deepCopy(o) {
    var result = {};
    if(Array.isArray(o)) return o.slice();
    if (typeof o === "object" && o !== null)
      for (i in o) result[i] = deepCopy(o[i]);
    else result = o;
    return result;
}

Queue={
    list:[],
    top:0,
    mix:()=>{},
    dom:{
        clear_padding:(ind)=>{
            if(Queue.dom.queue_list) [...Queue.dom.queue_list.children].forEach((v,i)=>{if(i!=ind) v.style.borderBottom = v.style.borderTop = '0'; v.style.paddingTop = v.style.paddingBottom='2px'})
        }
    },
    setup:()=>{
        Queue.dom.queue = document.getElementById('queue')
        Queue.dom.랜덤추가 = document.getElementById('랜덤추가')
        Queue.dom.전체삭제 = document.getElementById('전체삭제')
        Queue.dom.섞기 = document.getElementById('섞기')
        Queue.dom.검색추가 = document.getElementById('검색추가')
        Queue.dom.queue_list = document.getElementById('queue_list')
        Queue.dom.남은시각 = document.getElementById('남은시각')
        Queue.dom.랜덤추가.addEventListener('click',Queue.random_add)
        Queue.dom.전체삭제.addEventListener('click',Queue.all_del)
        Queue.dom.섞기.addEventListener('click',Queue.shuffle)
        Queue.dom.검색추가.addEventListener('click',Queue.result_add)
    },
    list_add:(info)=>{
        //console.log('[queue] [list_add], info:',info.file_name)

        for (let key in info){
            if(typeof info[key]=='string') info[key] = info[key].replace(/<mark>/gi,'').replace(/<\/mark>/gi,'');
            else if(Array.isArray(info[key])) info[key]=info[key].map(v=>(typeof v=='string')?v.replace(/<mark>/gi,'').replace(/<\/mark>/gi,''):v)
        }
        info = deepCopy(info);

        if (isNaN(info.blank_start)) info.blank_start = 0
        if (isNaN(info.frequency))   info.frequency = 0
        if (isNaN(info.blank_end))   music.blank_end = 0
        info.s = info.frequency? 144*info.blank_start /info.frequency*8 : 0
        info.e = info.frequency? 144*info.blank_end   /info.frequency*8 : 0
        info.l = info.frequency? 144*info.duration    /info.frequency*8 : 0

        info.music_instance = new Music_instance_stream()//AudioApi.new_source()
        const ind = Queue.list.push(info)
        //Queue.show()
        //Queue.list_add_data();
    },
    list_add_data:()=>{
        return new Promise(async (resolve)=>{

        
        for(let i=Queue.top; i<Queue.top+5; i++) if(Queue.list[i]){ /*&& !Queue.list[i].source.buffer && !Queue.list[i].source.buffer_load){*/
            console.log('[queue] [list_add_data] > for in', Queue.list.length, i)
            const info = Queue.list[i]
            if(info.lyric == undefined || info.album_id == undefined){
                await fetch('./info/'+info.music_id).then(data=>data.text()).then(data=>{
                    if(!data) return;
                    const info2 = JSON.parse(data)
                    Queue.list[i] = {...info, ...info2};
                    //console.log('[queue] [list_add] -> fetch info',info.file_name)
                })
            }
            
        }
        resolve()
    })
            /*info.source.buffer_load = 
                new Promise(function(resolve, reject) {
                    ((info)=>{AudioApi.get_audio_buffer_by_fetch(info.music_id).then(audio=>{
                        console.log('[list_add_buffer for_in] - 끝남..',info.file_name)
                        if(!info.source.buffer) info.source.buffer = audio;
                        resolve()
                    })})(info);
                })*/
        
    },/*
    top_add_buffer:()=>{
        const info = Queue.list[Queue.top]
        if(!info) return undefined;
        else if(info.source.buffer || info.source.buffer_load) return info.source.buffer_load
        return info.source.buffer_load = 
        new Promise(function(resolve, reject) {
            ((info)=>{AudioApi.get_audio_buffer_by_fetch(info.music_id).then(audio=>{
                console.log('[list_add_buffer for_in]',info.file_name)
                if(!info.source.buffer) info.source.buffer = audio;
                resolve()
            })})(info);
        })
    }*/
    random_add:()=>{
        fetch('./length/music').then(d=>d.text()).then(data=>{
            const length = Number(data)
            if(isNaN(length)) return;
            const id = Math.floor(Math.random()*length)+1;
            fetch('./info/'+id).then(data=>data.text()).then(data=>{
                if(!data) return;
                const info = data?JSON.parse(data):null;
                Queue.list_add(info)
                Queue.show()
            })
        })
    },show:()=>{
        const out = Queue.list.map((v,i)=>(i>Queue.top || (i==Queue.top &&(!v.music_instance||!v.music_instance.loaded)))?
            `<div draggable='true' id='queuelist_${i}'><button onclick="Queue.delete(${i})">×</button> ${v.file_name} </div>`:'')
        Queue.dom.queue_list.innerHTML = out.join('')
        Queue.dom.남은시각.innerHTML = sec2txt(Queue.remaintime())

        if(Queue.dom.queue_list) [...Queue.dom.queue_list.children].forEach(v=>{
        v.addEventListener('dragstart',e=>{/*console.log('[DragStart]',e.target.id);*/ e.dataTransfer.setData('text',e.target.id);})

        v.addEventListener('dragover',e=>{
            e.preventDefault(); /*console.log('[dragover]',e.target.id,); */
            const rate = (e.layerY-e.target.offsetTop)/e.target.clientHeight
            const ind = Number(e.target.id.split('_')[1]);

        Queue.dom.clear_padding(ind)
        if(rate>0.5) {
            e.target.style.borderBottom='2px solid black'
            e.target.paddingTop='2px';
            e.target.style.paddingBottom=0;
            e.target.style.borderTop=0;
        }

        else {
            e.target.style.borderBottom=0;
            e.target.style.paddingBottom='2px';
            e.target.style.paddingTop=0;
            e.target.style.borderTop='2px solid black';
        }

        //console.log('[over - ?]',e.target.style.borderBottom, '|',e.target.style.borderTop,'|', e.target.style.paddingBottom,'|', e.target.paddingTop)
        })

        // 큐에서, 드래그를 통해 위치 변경!
        v.addEventListener('dragleave',e=>{e.preventDefault();Queue.dom.clear_padding()})

        v.addEventListener('drop',e=>{
            e.preventDefault();
            Queue.dom.clear_padding()
            const rate = Math.round((e.layerY-e.target.offsetTop)/e.target.clientHeight)
            const from = Number(e.dataTransfer.getData('text').split('_')[1])
            const to = Number(e.target.id.split('_')[1])+rate
            
            /*console.log('[Drop] id', from, to)*/
            if(from==to) return;
            else if(from<to){
                const tmp = Queue.list.splice(from,1)[0]
                //console.log('작음',tmp)
                Queue.list.splice(to-1, 0, tmp)
            }
            else{
                const tmp = Queue.list.splice(from,1)[0]
                //console.log('큼',tmp)
                Queue.list.splice(to, 0, tmp)
            }
            Queue.show()
            Queue.reset_start_aduio();

        })
        })
    },
    result_add:()=>{
        Search.data.forEach(v=>Queue.list_add(v))
        Queue.show()
    },
    all_del:()=>{
        const top = Queue.starttop()
        const out = Queue.list.splice(top, Math.max(Queue.list.length-top,0))
        Queue.delete_info_exactly(...out);
        Queue.show()
    },
    shuffle:()=>{
        const top = Queue.starttop()
        let arr = Queue.list.splice(top, Math.max(Queue.list.length-top,0))
        let narr = [];
        while(arr.length > 0) {
            var x = Math.floor(Math.random()*arr.length);
            narr.push(...arr.splice(x,1))
        }
        Queue.list = Queue.list.concat(narr)
        Queue.show()
    },
    overlap_remove:()=>{},
    recommend:()=>{},
    replay:()=>{},
    delete_info_exactly:(...arguments)=>{ ///확실히 제거해야. 구석에 남아있다가 재생 안돠게...
        console.log('[Queue] [delete_info_exactly] arguments:   ',arguments);
        [...arguments].forEach(info=>{
            let s = info.source
            if(s && s.buffer) try{s.stop()}catch{}
            delete info;

        })
    },
    delete:(id)=>{
        let out = Queue.list.splice(id,1)
        Queue.delete_info_exactly(...out);
        Queue.show()
    },
    sort:{
        year:()=>{},
        track:()=>{},
        album:()=>{},
        singer:()=>{},
    },
    starttop:()=>{
        let top = Queue.top
        const list = Queue.list;
        if(!list[top]) return top;

        if (list[top].source && list[top].source.startTime)  top++;
        return top;
    },
    remaintime:()=>{
        let out=0;
        const top = Queue.top;
        const list = Queue.list;
        for (let i=Queue.starttop(); i<list.length; i++) if(list[i])  {
            const tmp = 144*list[i].duration/list[i].frequency*8
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
    },
    reset_start_aduio:()=>{
        const list = Queue.list
        let i=Queue.starttop();

        //if(!list[i].source || !list[i].source.startTime)  이미 맨 위에 있는 것은 interver함수에서 계속 체크중

        //첫번째가 아닌데, 시작된 버퍼가 있다면, 멈추기
        for (i=i+1; i<list.length; i++) if(list[i])  {
            if(list[i].source && list[i].source.startTime){
                list[i].source = AudioApi.stop_source(list[i].source);
            }
        }
    }
}