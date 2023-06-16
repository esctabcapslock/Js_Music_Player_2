//컴파일: tsc --lib 'es6,dom' --downlevelIteration  ./asset/src/graph.ts

class Graph{
    public svg:SVGSVGElement
    protected g1:SVGGElement
    protected g2:SVGGElement
    protected g3:SVGGElement
    public xlabel:string = ''
    protected x_is_time:boolean = false
    public ylabel:string  = ''
    protected data_labels:(string)[]  = []
    public label_len_max:number  = 30;
    protected data_show:boolean[] = []
    protected data_color:string[] = []
    //protected visual:boolean[] = []
    
    protected width:number = 200
    protected height:number = 200
    protected dataheight:number = 40;
    protected xmin:number = 0
    protected xmax:number = 1
    protected ymin:number = 0
    protected ymax:number = 1
    protected x_data:number[] = []
    protected y_datas:((number|undefined)[])[] = []
    protected type = ''
    protected scale_spacing:number = 50; //픽셀단위
    
    public timezoneoffset:number = 0;

    //그래프 선분들을 저장하는 배열이다.
    //마우스 올리면 두꺼워지는 hover을 구현하기 위함이다.
    protected path_ele_list:SVGPathElement[];
    protected legend_ele_list:SVGGElement[];
    protected hover_path_weight:Number = 5; //마우스올렸을 때 변할 굵기
    

    constructor(dom:HTMLElement, xlabel:string, ylabel:string, type:string, scale_spacing?:number){
        this.timezoneoffset = 0
        if(typeof scale_spacing == typeof 1)  this.scale_spacing = scale_spacing
        this.type = type
        //구조 만들기
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.g1  = document.createElementNS('http://www.w3.org/2000/svg', 'g'); //그래프를 그림
        this.g2  = document.createElementNS('http://www.w3.org/2000/svg', 'g'); //축을 그림
        this.g3  = document.createElementNS('http://www.w3.org/2000/svg', 'g'); //범례를 그림
        dom.appendChild(this.svg)
        this.svg.appendChild(this.g1)
        this.svg.appendChild(this.g2)   
        this.svg.appendChild(this.g3)   
        
        //설정하기
        this.xlabel = xlabel
        this.ylabel = ylabel

    }
    

    protected map(v:number,a:number, b:number, c:number, d:number):number{
        const rate:number = (v-a)/(b-a)
        return d*rate + c*(1-rate)
    }

    public set_x_as_time(timezoneoffset?:number){
        this.x_is_time = true
        if(timezoneoffset) this.timezoneoffset = timezoneoffset;
    }

    public get_xminmax():number[]{
        if(!this.x_data.length) return;
        return [Math.min(...this.x_data), Math.max(...this.x_data)]
    }

    public set_label_len_max(n:number){
        this.label_len_max = n
    }

    public set_data(x_data:number[], y_data:number[], data_label:string){
        
        //console.log('set_data')
        return new Promise((resolve, reject)=>{
        if(x_data.length != y_data.length || !x_data.length || !y_data.length) reject('올바르지 않은 범위');
        x_data = x_data.slice()
        y_data = y_data.slice()
        // if(!this.x_data.length){
        //     this.x_data = x_data
        //     this.y_datas = [y_data]
        // }else{
            this.data_labels.push(String(data_label))
            this.data_show.push(true)
            this.data_color.push(this.random_color())
            let new_x_data:number[] = [...new Set([...this.x_data, ...x_data])].sort((a:any,b:any)=> Number(a-b));
            //console.log('[new_x_data, this.y_datas - b]',new_x_data, this.y_datas)
             this.y_datas = this.y_datas.map(data=>new_x_data.map(v=>data[this.x_data.indexOf(v)]))
            //console.log('[new_x_data, this.y_datas - a]',new_x_data, this.y_datas)
            this.y_datas.push(new_x_data.map(v=>y_data[x_data.indexOf(v)]))
            //console.log('[new_x_data, this.y_datas - aφ]',new_x_data, this.y_datas)
            this.x_data = new_x_data;
            resolve(true);
        //}
        })
        
    }

    protected random_color():string{
        let srt:string = Math.round(Math.random() * 0xffffff).toString(16);
        while(srt.length!=6) srt = '0'+srt;
        return "#" + srt
    }

    protected create_path(d:string, stroke_color:string, stroke_width:number, classList:string[]):SVGPathElement{
        const path:SVGPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttributeNS(null, 'd', d);
        path.setAttributeNS(null, 'stroke', stroke_color);
        path.setAttributeNS(null, 'fill', 'none');
        path.setAttributeNS(null, 'stroke-width', `${stroke_width}px`);
        classList.forEach(v=>path.classList.add(v))
        return path;
    }
    protected create_text(str:string, x:number, y:number, color:string, font_size:number, text_anchor?:string, rotate?:number):SVGTextElement{
        const text:SVGTextElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.innerHTML = str;
        text.setAttributeNS(null, 'x', String(x));
        text.setAttributeNS(null, 'y', String(y));
        text.setAttributeNS(null, 'style', `font-size:${font_size}pt`)
        if(typeof text_anchor == typeof '1') text.setAttributeNS(null, 'text-anchor', text_anchor)
        if(typeof rotate == typeof 1){
            text.setAttributeNS(null, 'transform', `rotate(${rotate})`)
            text.setAttributeNS(null, 'transform-origin', `${x} ${y}`)
        }
        return text;
    }

    protected create_circle(r:number, x:number, y:number, color:string):SVGCircleElement{
        const circle:SVGCircleElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttributeNS(null, 'r', String(r));
        circle.setAttributeNS(null, 'cx', String(x));
        circle.setAttributeNS(null, 'cy', String(y));
        circle.setAttributeNS(null, 'fill', color);
        return circle;
    }

    protected setsize(){
        this.svg.setAttribute('viewbox',`0 0 ${this.width} ${this.height}`)
        this.svg.style.width = `${this.width}px`
        this.svg.style.height = `${this.height}px`
    }

    public async drow(width:number, height:number, xmin:number, xmax:number){
        console.log('drow')
        
        this.width = width
        this.height = height
        this.setsize()
        this.xmin = xmin
        this.xmax = xmax
        this.drow_legend()
        this.drow_data()
        this.drow_axis()
    }

    protected drow_data(){
        this.g1.innerHTML = ''
        this.ymin = Infinity
        this.ymax = -Infinity
        let x_out:number[] = []
        let y_out:((number|undefined)[])[] = this.y_datas.map(v=>new Array())
        this.x_data.forEach((v,i,ar)=>{
            if( (this.x_data.length-1==i || ar[i+1]>this.xmin) && (i==0 || ar[i-1]<this.xmax)){
                x_out.push(ar[i])
                this.y_datas.forEach((data,j)=>{
                    
                    if(this.data_show[j] && !isNaN(data[i])){
                        this.ymin = Math.min(this.ymin, data[i])
                        this.ymax = Math.max(this.ymax, data[i])
                    }
                    y_out[j].push(data[i])
                })
            }
        })
        //console.log('[x_out, y_out]',x_out, y_out, this.type);

        this.path_ele_list = []
        if(this.type=='꺾은선'){
            y_out.forEach((data,i)=>{
                if(this.data_show[i]){
                    let d = x_out.map((v,i)=>isNaN(v)?'':`${i==0?'M':'L'}${this.map(v,this.xmin, this.xmax, 40, this.width)} ${this.map(data[i], this.ymin, this.ymax, this.height-this.dataheight, 0)}`).join(' ');
                    //console.log('안',data,d)
                    const path_ele:SVGPathElement = this.create_path(d,this.data_color[i], 2, ['graph_data'])
                    this.path_ele_list[i] = path_ele
                    this.g1.appendChild(path_ele)
                    path_ele.addEventListener('mouseenter',e=>{
                        path_ele.style.strokeWidth =  this.hover_path_weight + 'px'
                        const k:NodeListOf<SVGGElement> = this.legend_ele_list[i].querySelectorAll('text')
                        for(let i=0; i<k.length; i++) k[i].style.fontWeight='bold'
                    })
                    path_ele.addEventListener('mouseout',e=>{
                        path_ele.style.strokeWidth = ''
                        const k:NodeListOf<SVGGElement> = this.legend_ele_list[i].querySelectorAll('text')
                        for(let i=0; i<k.length; i++) k[i].style.fontWeight=''
                    })
                }
            })
                
            
        }
        
    }
    protected drow_axis(){
        this.g2.innerHTML = ''
        //console.log('[drow_axis]',this.g2)
        this.g2.appendChild(this.create_path(`M40 0 L40 ${this.height-this.dataheight}`,'black',1, ['graph_axis']))
        this.g2.appendChild(this.create_path(`M40 ${this.height-this.dataheight} L${this.width} ${this.height-this.dataheight}`,'black',1, ['graph_axis']))
        

        function find_good_interval(a:number):number[]{
            const b:number = Math.log10(a)
            const n:number = Math.floor(b)
            const α:number = b-n;
            const t:number[]=[0, Math.log10(2), Math.log10(4), Math.log10(5)].map(v=>Math.abs(v-α))
            //console.log('[α]',a,b,α,t)
            return [(10**n)*[1,2,4,5][t.indexOf(Math.min(...t))], n]
        }

        const _timezoneoffset = this.timezoneoffset
        function myDate(x,...y:number[]):Date{
            if(isNaN(_timezoneoffset)) {console.error('[this.timezoneoffset 없음]', _timezoneoffset);}
            //console.log('[myDate]',x,y,_timezoneoffset)
            if(!y.length)
                {var d= new Date(x+_timezoneoffset); /*console.log('efw',x+_timezoneoffset, y)*/}
            else
                {var d= new Date(Number(new Date(x,y[0]))+_timezoneoffset)  }
            //console.log('fre',d, x+_timezoneoffset);
            return d;      
        }

        
        const [s_y, ny]:number[] = find_good_interval((this.ymax-this.ymin)*(this.scale_spacing/this.height))
        //console.log('[scale_spacing]',s_y, ny)

        this.g2.appendChild(this.create_text(this.xlabel, this.width/2+20, this.height-this.dataheight+30, 'black', 10, 'middle'))
        this.g2.appendChild(this.create_text(this.ylabel, 12, (this.height-this.dataheight)/2, 'black', 10, 'middle', 270))

        //x축 축 위에서 
        if(this.x_is_time){
            //x축을 시간으로 삼음
            const view_dis:number = (this.xmax-this.xmin)*(this.scale_spacing/this.width)

            // 단위로 삼을 것들
            const time_dis:number[] = [1, 10, 60, 60*10, 3600, 3600*3, 3600*6, 3600*24, 3600*24*2, 3600*24*7, 3600*24*30, 3600*24*30*365].map(v=>v*1000)
            const time_fn:string[] = ['getSeconds', 'getSeconds', 'getMinutes','getMinutes','getHours','getHours','getHours','getDate','getDate', 'getDate','getMonth','getFullYear']
            const time_name:string[] = ['초','초','분','분','시','시','시','일','일','일','월','년'];
            //const time_offset:boolean[] =time_name.map((v)=>v=='월'); //월만
            const time_id:number[] = [0];
            var tmp=0;
            for (let i=1; i<time_name.length; i++){
                tmp+=(time_name[i]==time_name[i-1]?0:1)
                time_id.push(tmp);
            }
            //console.log(time_id)
            
            //가장 가까운거 찾기. 이 값을 i에 저장
            const tmp_ar:number[] =  time_dis.map(v=>Math.abs(Math.log(v/view_dis)))
            const timetype:number = tmp_ar.indexOf(Math.min(...tmp_ar))
            //console.log('[가장 가까운 단위는]',view_dis, timetype, time_fn[timetype], time_dis[timetype], time_name[timetype])
            
            //시작하는 시점 찾기
            let v:number = this.xmin
            const date:Date = myDate(v);
            //console.log('[시작하는 시점 찾기]',date);
            if(time_id[timetype]<=3) v = Math.floor(v/(time_dis[timetype]))*(time_dis[timetype]);
            else if(time_id[timetype]==4) v = Number(myDate(date.getFullYear(), date.getMonth()))
            else if(time_id[timetype]==5) v = Number(myDate(date.getFullYear(),0))

            //라벨 들어갈 문자열을 위해, 초,분,시,월,일이 변화했는지 알 필요 있다.
            const label_fns = {
                get_timeunit_list(d: number): number[] {
                    //console.log('[this.myDate, this]',this.myDate, this)
                    const date:Date = myDate(d)
                    //console.log('[get_timeunit_list]',d,date)
                    return [date.getSeconds(), date.getMinutes(), date.getHours(), date.getDate(), date.getMonth(), date.getFullYear()].splice(time_id[timetype])
                },

                get_label_text(pre_timeunit_list: number[], timeunit_list: number[]): string[] {
                    let flag: boolean = false;
                    let out: string[] = []
                    let n:number = 6-timeunit_list.length
                    for (let i = timeunit_list.length - 1; i >= 0; i--) {
                        if (flag || timeunit_list[i] != pre_timeunit_list[i]) {
                            flag = true;
                            out.push(`${timeunit_list[i]+Number(n+i==4)}` + ['초', '분', '시', '일', '월', '년'][n+i])
                        }
                    }//console.log(out,'ewf', pre_timeunit_list, timeunit_list)

                    return [out[0]]; //맨 최상위 것만 내보내자. 어차피 알 수 있음!
                    if(out.length>2) return [out.splice(0,1).join(' '), out.splice(0,2).join(' '), out.join(' ')];//`<tspan dx="0">${out.splice(0,3).join(' ')}</tspan><tspan dy="1.2em" dx="0">${out.join(' ')}</tspan>` ;
                    else return [out.join(' ')]
                },
            }
            let pre_timeunit_list:number[] = [NaN,NaN,NaN,NaN,NaN,NaN]

            //반복하기
            while(v<=this.xmax){
                let timeunit_list:number[] = label_fns.get_timeunit_list(v); //라벨 그리는 용도임
                if(v>=this.xmin){
                    //console.log('while',this.myDate(v), time_id[timetype], time_name[timetype],v, this.xmax)

                    const vx:number = this.map(v,this.xmin, this.xmax, 40, this.width)

                    
                    //console.log('vx',vx,)
                    //축그리기
                    this.g2.appendChild(this.create_path(`M${vx} 0 L${vx} ${this.height-this.dataheight}`,'gray',1, []))
                    
                    //라벨 그리기
                    label_fns.get_label_text(pre_timeunit_list, timeunit_list).forEach((v,i)=>{
                        const label:SVGTextElement = this.create_text(v,vx , this.height-this.dataheight+15+i*10, 'black', 8)
                        this.g2.appendChild(label)
                    })
                    //label.setAttributeNS(null, 'transform', 'rotate(8)')
                    //label.setAttributeNS(null, 'transform-origin', `${vx} ${this.height-this.dataheight+15}`)
                }
                //다음 시점으로 넘어간다.
                if(time_id[timetype]<=3)  v += time_dis[timetype];
                else{
                    const date:Date = myDate(v);
                    if(time_id[timetype]==4) v = Number(myDate(date.getFullYear(), date.getMonth()+1))
                    else if(time_id[timetype]==5) v = Number(myDate(date.getFullYear()+1,0))
                }
                pre_timeunit_list = timeunit_list;
        }

        }else{ //아님
            const [s_x, nx]:number[] = find_good_interval((this.xmax-this.xmin)*(this.scale_spacing/this.width))
            for(var i=Math.floor(Number(this.xmin/s_x)); i*s_x<this.xmax; i++){
                const v:number = i*s_x;
                if(v<this.xmin) continue;
                const vx:number = this.map(v,this.xmin, this.xmax, 40, this.width)
                this.g2.appendChild(this.create_path(`M${vx} 0 L${vx} ${this.height-this.dataheight}`,'gray',1, []))
                this.g2.appendChild(this.create_text(parseFloat(`${v}`).toFixed(Math.max(-nx,0)), vx, this.height-this.dataheight+10, 'black', 8))
            }
        }

        //y축 축 위에서 
        for(var i=Math.floor(Number(this.ymin/s_y)); i*s_y<this.ymax; i++){
            const v:number = i*s_y;
            if(v<this.ymin) continue;
            const vy:number = this.map(v, this.ymin, this.ymax, this.height-this.dataheight, 0)
            this.g2.appendChild(this.create_path(`M40 ${vy} L${this.width} ${vy} ${this.height-this.dataheight}`,'gray',1, ['graph_axis']))
            this.g2.appendChild(this.create_text(parseFloat(`${v}`).toFixed(Math.max(-ny,0)), 40-2, vy, 'black', 8, 'end'))
        }

    }

    protected drow_legend(){
        //console.log('[drow_legend]')
        this.g3.innerHTML = ''
        this.legend_ele_list = []
        const legend_width:number = 20 + Math.max(...this.data_labels.map(v=>Math.min(v.length,this.label_len_max)))*9
        const length:number = this.data_labels.length
        const n:number = Math.floor(this.width/legend_width)?Math.floor(this.width/legend_width):1
        this.dataheight = 45+Math.floor(length/n)*8

        //console.log('drow_legend',legend_width, length, n)
        for(let i=0; i<length; i++){
            const index = i;
            const x:number = (i%n)*legend_width
            const y:number = (Math.floor(length/n)-Math.floor(i/n))*10
            const g:SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.appendChild(this.create_circle(4,x+4,this.height-y-4-1, this.data_color[i]))
            g.appendChild(this.create_text(this.data_labels[i].substr(0,this.label_len_max),x+14,this.height-y-1, 'black', 8))
            g.style.opacity = this.data_show[i]?'1':'0.1';
            g.addEventListener('click',e=>{
                //console.log(e, index, this)
                this.data_show[index] = !this.data_show[index]
                this.drow_legend()
                this.drow_data()
                this.drow_axis()
            })
            g.addEventListener('dblclick',e=>{
                //console.log(e, index, this)
                this.data_show.forEach((v,i,ar)=>ar[i]=false)
                this.data_show[index] = true
                this.drow_legend()
                this.drow_data()
                this.drow_axis()
            })
            g.addEventListener('mouseout',e=>{
                this.path_ele_list[i].style.strokeWidth = ''//'2px'
                //console.log('moveout',i, this.path_ele_list[i]);
            })
            g.addEventListener('mouseenter',e=>{
                this.path_ele_list[i].style.strokeWidth = this.hover_path_weight + 'px'
                //console.log('moveenter',i, this.path_ele_list[i]);
            })
            this.legend_ele_list.push(g)
            this.g3.appendChild(g)
        }

    }
}