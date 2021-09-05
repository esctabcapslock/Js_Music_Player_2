class Dragside_Event extends Event{
    constructor(n){
        super('dragside')
        this.direction = n;
    }
}
class Dragsideend_Event extends Event{
    constructor(n){
        super('dragsideend')
        this.direction = n;
    }
}

class Dragside extends EventTarget{

    constructor(ele, min, max){
        super();
        this.ele = ele;
        this.val = min?min:0;
        this.touch_val = null;
        this.wheel_val = null;
        this.max = max==undefined?1:max;
        this.min = min==undefined?0:min;

        this.sum_x = 0;
        this.wheel_event = true;
        this.event_list
        const tthis = this;
        ele.addEventListener('wheel',async e=>{
            if(e.deltaY) return;//대각선이나, 아래로 가는 방향 차단.
            //console.log(e.deltaX, e.deltaY, e.deltaX/e.deltaY)
            //if(e.deltaX**2<60**2) return;

            const pre_val = [this.wheel_val,this.val];

            if(!tthis.wheel_event) return;
            this.sum_x += e.deltaX;
            if(this.sum_x>200){
                this.sum_x=0;
                this.wheel_val = this.val += 1
            }else if(this.sum_x<-200){
                this.sum_x=0
                this.wheel_val = this.val -= 1
            }else{
                this.wheel_val = this.val+this.sum_x/200
            }

            this.val = this.reduce_val_max(this.val)
            this.wheel_val = this.reduce_val_max(this.wheel_val)

            //중복값은 제거. (호출X)
            if(pre_val[0]==this.wheel_val || (null==pre_val[0]&&pre_val[1]==this.wheel_val)) return;

            //console.log('wheel_val',this.wheel_val, 'sum_x',this.sum_x, e.deltaX, pre_val);
            this.check();
            this.dispatchEvent(new Dragside_Event(this.wheel_val))

            //멈춤확인
            if(await this.wheel_stop_check(this.wheel_val)){
                if(this.wheel_val==null) return;
                this.sum_x=0;
                this.val = this.reduce_val_max(Math.round(this.wheel_val))
                this.wheel_val = null;
                //this.dispatchEvent(new Dragside_Event(this.val))
                this.dispatchEvent(new Dragsideend_Event(this.val))
            }

        })

        this.points = {};

        function tl(temp){
            return new Array(temp.length).fill().map((v,i)=>{v=temp.item(i); return  [v.identifier, [v.clientX, v.clientY]]})
        }

        ele.addEventListener('touchstart',e=>{
            //console.log(`[${e.type}]`,e.timeStamp, this.touch_val, this.val)
            tl(e.changedTouches).map(v=>this.points[v[0]]=v[1][0])
        })
        ele.addEventListener('touchmove',e=>{
            //console.log(`[${e.type}]`,e.timeStamp, tl(e.touches).join(', '),  this.touch_val, this.val)
            const ar = tl(e.touches).map(v=>v[1][0]-this.points[v[0]]).filter(v=>v)
            if(!ar.length) return;
            const avg = ar.reduce((a,b)=>a+b,0)/ar.length
            //console.log('avg',-avg/200)
            
            const pre_val = this.touch_val
            this.touch_val = this.reduce_val_max(this.val + (-avg/200 - this.min))
            if(pre_val==this.touch_val) return; //중복값이므로 이벤트 중복호출 방지.
            
            this.dispatchEvent(new Dragside_Event(this.touch_val))
            
        })
        ele.addEventListener('touchend',e=>{
            //console.log(`[${e.type}]`,e.timeStamp, tl(e.changedTouches).length, this.touch_val, this.val)
            tl(e.changedTouches).map(v=>delete tthis.points[v[0]])
            if(tl(e.changedTouches).length==1){
                //console.log('end=확인',this.touch_val, this.val)
                if(!isNaN(this.touch_val) && this.touch_val!=null){
                    //console.log('this.touch_val',this.touch_val)
                    this.val = Math.round(this.touch_val)
                    this.touch_val = null;
                    //this.dispatchEvent(new Dragside_Event(this.val))
                    this.dispatchEvent(new Dragsideend_Event(this.val))
                }
                
            }
        })
    }

    reduce_val_max(x){
        if(x>this.max)x=this.max
        if(x<this.min)x=this.min
        return x;
    }

    async check(){
        await new Promise((resolve)=>setTimeout(resolve, 30))
        this.wheel_event = true;
    }

    async wheel_stop_check(x){
        if(this.wheel_val==null) return;
        await new Promise((resolve)=>setTimeout(resolve, 250));
        //console.log('x==this.wheel_val',x==this.wheel_val,x,this.wheel_val)
        if(x==this.wheel_val) return true;
        else return false;
    }

    set (v){
        this.val = v;
    }
    
}