Queue={
    list:[],
    top:0,
    mix:()=>{},
    dom:{},
    setup:()=>{
        Queue.dom.queue = document.getElementById('queue')
        Queue.dom.랜덤추가 = document.getElementById('랜덤추가')
        Queue.dom.queue_list = document.getElementById('queue_list')
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
        var out = Queue.list.map((v,i)=>(i>=Queue.top)?`<div> ${v.file_name} </div>`:'')
        Queue.dom.queue_list.innerHTML = out.join('')
    },
    result_add:()=>{},
    all_del:()=>{},
    overlap_remove:()=>{},
    overlap_remove:()=>{},
    recommend:()=>{},
    replay:()=>{},
    sort:{
        year:()=>{},
        track:()=>{},
        album:()=>{},
        singer:()=>{},
    },
    
}