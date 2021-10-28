Statistics = {
    setting(){
        Statistics.TimezoneOffset = -540//new Date().getTimezoneOffset()

        Statistics.dom.stat_size = document.getElementById('stat_size')
        Statistics.dom.stat_range = document.getElementById('stat_range')
        Statistics.dom.stat_type = document.getElementById('stat_type')
        Statistics.dom.graph = document.getElementById('statistics_graph')
        Statistics.dom.ranking = document.getElementById('statistics_ranking')
        Statistics.dom.통계기간_시작_날짜 = document.getElementById('통계기간_시작_날짜')
        Statistics.dom.통계기간_시작_시각 = document.getElementById('통계기간_시작_시각')
        Statistics.dom.통계기간_종료_날짜 = document.getElementById('통계기간_종료_날짜')
        Statistics.dom.통계기간_종료_시각 = document.getElementById('통계기간_종료_시각')
        Statistics.dom.stat_do_btn = document.getElementById('stat_do_btn')
        Statistics.dom.stat_do_btn.addEventListener('click',Statistics.get)
        Statistics.graph = new Graph(Statistics.dom.graph,'시간','조회수','꺾은선')

        if(!Statistics.dom.통계기간_종료_날짜.value) Statistics.dom.통계기간_종료_날짜.valueAsNumber = new Date()
        if(!Statistics.dom.통계기간_종료_시각.value) Statistics.dom.통계기간_종료_시각.valueAsNumber = Math.floor((new Date())/1000/60-Statistics.TimezoneOffset)*1000*60
        //dom:HTMLElement, xlabel:string, ylabel:string, type:string, scale_spacing?:number
        Statistics.graph.set_x_as_time()
    },
    dom:{
    },
    data:[],
    
    get(){
        Statistics.dom.graph.innerHTML = ''
        Statistics.graph = new Graph(Statistics.dom.graph,'시간','조회수','꺾은선')
        Statistics.graph.set_x_as_time()
        Statistics.type = Statistics.dom.stat_type.querySelector('label > input[type=radio]:checked').value
        fetch('statistics',{
            method:'POST',
            body:JSON.stringify({
                type : Statistics.type
            })
        }).then(v=>{
            if(v.status!=200) return undefined
            else return v.json()
        }).then(data=>{
            if(data){
                Statistics.data = data;
                Statistics.show()
            }
        })
    },
    show(){
        if(!Statistics.dom.통계기간_시작_날짜.valueAsNumber){
            Statistics.dom.통계기간_시작_날짜.valueAsNumber = 1631664000000
            Statistics.dom.통계기간_시작_시각.valueAsNumber = 0
        }
        let s = Statistics.dom.통계기간_시작_날짜.valueAsNumber + Statistics.dom.통계기간_시작_시각.valueAsNumber
        const e = Statistics.dom.통계기간_종료_날짜.valueAsNumber + Statistics.dom.통계기간_종료_시각.valueAsNumber
        if(isNaN(s) || isNaN(e)) return; //날짜를 입력해야함

        const data = Statistics.data.filter(v=>(v.date>=s)&&(v.date<=e))
        console.log(data, Statistics.type)

        const 양 = Statistics.ranking(data.map(v=>v[Statistics.type]))
        const l = 양.length
        const 상위_양 = 양.splice(0,Math.min(10,양.length)); //l==0?양.length:l
        console.log('[양, 상위_양]',양, 상위_양)
        Statistics.dom.ranking.innerHTML = Statistics.rankinghtml(상위_양, l)

        
        const 통계주기 = Statistics.dom.stat_size.querySelector('label > input:checked').value
        let out = []
        let out_양 = []
        let outx = []
        let get_index = ()=>{};
        let get_date_by_index = ()=>{};
        if(통계주기=='일' || 통계주기=='주'){
            s = Statistics.dom.통계기간_시작_날짜.valueAsNumber
            let 통계간격 = 24*3600*1000*(통계주기=='일'?1:7)
            get_index = (d)=>Math.floor((d-s)/통계간격);
            get_date_by_index = (i)=>(s+통계간격*i)
        }
        else{
            const date = new Date(Statistics.dom.통계기간_시작_날짜.valueAsNumber)
            if(통계주기=='월'){s = Number(new Date(date.getFullYear(), date.getMonth()))
                get_index=d=>{const dd = new Date(d); return dd.getFullYear()*12+dd.getMonth()};
                const s_d = get_index(s)
                get_index=d=>{const dd = new Date(d); return dd.getFullYear()*12+dd.getMonth()-s_d};
                get_date_by_index = i=>Number(new Date(date.getFullYear(), date.getMonth()+i))
            }
            if(통계주기=='년'){s = Number(new Date(date.getFullYear(),0))
                get_index=d=>{const dd = new Date(d); return dd.getFullYear()};
                const s_d = get_index(s)
                get_index=d=>{const dd = new Date(d); return dd.getFullYear()-s_d};
                get_date_by_index = i=>Number(new Date(date.getFullYear()+i))
            }
        }
        const arr_len = get_index(e)+1
        out = new Array(arr_len).fill(0);
        outx = new Array(arr_len).fill(0);
        out_양 = 상위_양.map(v=>new Array(arr_len).fill(0))

        outx.forEach((v,i,ar)=>ar[i]=get_date_by_index(i)) //체우기
        data.forEach(v=>{
            const vv = v[Statistics.type]
            out[get_index(v.date)] ++;

            상위_양.forEach((vv,i)=>{
                if(vv.key==v[Statistics.type]) out_양[i][get_index(v.date)]++;
            })
        })

        console.log('[out,out_양]',out,out_양)
        p_list = [Statistics.graph.set_data(outx, out, '전체'), ...out_양.map((v,i)=>Statistics.graph.set_data(outx, v, 상위_양[i].key))]
        Promise.all(p_list).then(v=>Statistics.graph.drow(screen.availWidth-70, 200, s,e))
        .catch(err=>console.log(err))

    },
    ranking(arr){
        const counts = {}
        arr.forEach(v=>{
            if(v==226) console.log('226 rk')
            if(v==227) console.log('227 rk')
            
            if(v in counts) counts[v]++;
            else counts[v] = 1
        })
        console.log('[ranking]',arr,counts, counts[226], counts[227])
        const out = []
        for(let v in counts) out.push({key:v,count:counts[v]}
            )
        out.sort((a,b)=>b.count-a.count)
        return out;
    },
    rankinghtml(arr,n){
        return arr.map((v)=>{
            if(Statistics.type =='song_id'){
                var name = Statistics.data.filter(vv=>vv['song_id']==v.key)[0].url
                // let d = await fetch('./info/'+v.key)
                // if(d.status!=200) return undefined;
                // let dd = d.json()
                // if(dd.file_name)
                return `<div><span>${v.count}회</span> | <span>${parseFloat(v.count/n*100).toFixed(2)}%</span> | <span>${v.key}</span> | <span>${name}</span></div>`

            }
            else return `<div><span>${v.count}회</span> | <span>${parseFloat(v.count/n*100).toFixed(2)}%</span> | <span>${v.key}</span></div>`
            //substr(0,30)
        }).join('')
    }
}