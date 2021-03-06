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

        if(!Statistics.dom.통계기간_종료_날짜.value) Statistics.dom.통계기간_종료_날짜.valueAsNumber = (new Date()-Statistics.TimezoneOffset*60*1000)
        if(!Statistics.dom.통계기간_종료_시각.value) Statistics.dom.통계기간_종료_시각.valueAsNumber = 1000*3600*24-60000//Math.floor((new Date())/1000/60-Statistics.TimezoneOffset)*1000*60
        //dom:HTMLElement, xlabel:string, ylabel:string, type:string, scale_spacing?:number
        Statistics.graph.set_x_as_time()
    },
    dom:{
    },
    data:[],
    
    new_graph(istime){
        Statistics.dom.graph.innerHTML = ''
        Statistics.graph = new Graph(Statistics.dom.graph,'시간','조회수','꺾은선')
        if(istime)Statistics.graph.set_x_as_time(Statistics.TimezoneOffset*60*1000)
        Statistics.graph.set_label_len_max(4+document.body.clientWidth/40)
    },
    get(){
        Statistics.new_graph(true)
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

                //중복값이 있는 경우가 있다. 들은 시간이 같고, 원하는 속성값도 같은경우. 이를 제거한다.
                data = data.filter((v,i,ar)=>!(i&&(v.date==ar[i-1].date&&v[Statistics.type]==ar[i-1][Statistics.type])))

                Statistics.data = data;
                if(Statistics.data.length)
                    Statistics.show()
                else{
                    alert("아직 들은 곡이 없습니다. 더 들어주세요")
                }
            }
        })
    },
    show(){
        if(!Statistics.dom.통계기간_시작_날짜.valueAsNumber && Statistics.data[0].date){
            Statistics.dom.통계기간_시작_날짜.valueAsNumber = Statistics.data[0].date
            Statistics.dom.통계기간_시작_시각.valueAsNumber = 0
        }
        let s = Statistics.dom.통계기간_시작_날짜.valueAsNumber + Statistics.dom.통계기간_시작_시각.valueAsNumber
        let e = Statistics.dom.통계기간_종료_날짜.valueAsNumber + Statistics.dom.통계기간_종료_시각.valueAsNumber
        if(isNaN(s) || isNaN(e)) return; //날짜를 입력해야함

        const data = Statistics.data.filter(v=>(v.date>=s)&&(v.date<=e))
        console.log('data',data, Statistics.type)
        const 양 = Statistics.ranking(data.map(v=>v[Statistics.type]))
        this.양_all_count = data.length
        const 상위_양 = 양.splice(0,Math.min(12,양.length)); //l==0?양.length:l
        console.log('[양, 상위_양]',양, 상위_양, 양.length)

        if(['length','year'].includes(Statistics.type)) Statistics.showbyvalue(data,양,상위_양)
        else Statistics.showbytime(data,양,상위_양,e);
    },
    ranking(arr){
        arr.reverse()
        if(Statistics.type=='length') arr=arr.map(v=>Number(v)&(-1)); //길이의 경우, 1초 단위로 빈도 계산
        const arr_l = arr.map(v=>String(v).toLocaleLowerCase().trim().replace(/\((.*?)\)/g,''))
        const counts = {}
        arr_l.forEach(v=>{
            if(v in counts) counts[v]++;
            else counts[v] = 1
        })
        console.log('[ranking]',arr,counts)
        const out = []
        for(let v in counts) out.push({key:arr[arr_l.indexOf(v)],count:counts[v]}
            )
        out.sort((a,b)=>b.count-a.count)
        return out;
    },
    rankinghtml(arr){
        let n = this.양_all_count
        return arr.map((v,i)=>{
            const color = Statistics.graph.data_color[i+1]
            if(Statistics.type =='song_id'){
                var name = Statistics.data.filter(vv=>vv['song_id']==v.key)[0].url
                // let d = await fetch('./info/'+v.key)
                // if(d.status!=200) return undefined;
                // let dd = d.json()
                // if(dd.file_name)
                // console.log(`<svg width="16px" height="16px" viewbox="0 0 10 10><circle r="4" cx="6" cy="6" fill="${color}"></circle>`)
                return `<div>
                    <span><svg width="16px" height="16px" viewbox="0 0 10 10"><circle r="4" cx="6" cy="6" fill="${color}"></circle></svg></span>
                    <span>${v.count}회</span> | <span>${parseFloat(v.count/n*100).toFixed(2)}%</span> | <span>${v.key}</span> | <span>${name}</span>
                </div>`

            }
            else return `<div>
                <span><svg width=16px height=16px viewbox="0 0 10 10"><circle r="4" cx="6" cy="6" fill="${color}"></circle></svg></span>
                <span>${v.count}회</span> | <span>${parseFloat(v.count/n*100).toFixed(2)}%</span> | <span>${v.key}</span>
            </div>`
            //substr(0,30)
        }).join('')
    },
    showbytime(data,양,상위_양,e){//시간축으로 그리기! (시계열 데이터)
        
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
            //const vv = v[Statistics.type]
            out[get_index(v.date)]++;

            상위_양.forEach((vv,i)=>{
                if(vv.key==v[Statistics.type]) out_양[i][get_index(v.date)]++;
            })
        })

        console.log('[out,out_양]',out,out_양)
        const p_list = [Statistics.graph.set_data(outx, out, '전체'), ...out_양.map((v,i)=>Statistics.graph.set_data(outx, v, 상위_양[i].key))]
        Promise.all(p_list).then(v=>Statistics.graph.drow(document.body.clientWidth-60, 300, Math.min(...outx),Math.max(...outx)))
        .catch(err=>console.log(err)).then(()=>{
            console.log(Statistics.graph.data_color)
            Statistics.dom.ranking.innerHTML = Statistics.rankinghtml(상위_양)
        })

    },
    showbyvalue(data,양,상위_양){//값을 축으로 분석하기
        console.log('data-값분석',data,양)
        //양.sort((a,b)=>a.key>b.key)
        const 양_ = {}
        
        for(let v of 양) 양_[v.key]=v.count
        for(let v of 상위_양) 양_[v.key]=v.count

        let tmpv = 양.map(v=>v.key)
        상위_양.forEach(v=>tmpv.push(v.key))
        tmpv=tmpv.filter(v=>v!=null)

        const min = Math.min(...tmpv), max=Math.max(...tmpv);
        const xv=[], yv=[]
        for(let i=min; i<=max; i++){
            xv.push(i)
            yv.push(양_[i]?양_[i]:0)
        }

        Statistics.new_graph(false)
        console.log(xv,yv)

        Statistics.graph.set_data(xv,yv,Statistics.type).then(v=>Statistics.graph.drow(document.body.clientWidth-60, 300, min, max ))
        .catch(err=>console.log(err)).then(()=>{
            console.log(Statistics.graph.data_color)
            Statistics.dom.ranking.innerHTML = Statistics.rankinghtml(상위_양)
        })


    }
}