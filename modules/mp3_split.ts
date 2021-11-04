import * as fs from "fs"
// tsc --target "es6" --module "commonjs"  modules\mp3_split.ts  
type m3u8type = {m3u8:(number[][]),ended:boolean}
const bf2chr = (bf:Buffer,start:number,len:number, encoding:boolean):string=>{
    if(start<0) return undefined;
    const b=Buffer.alloc(len);
    for (let i=0; i<len; i++) b[i]=bf[start+i];
    return b.toString(encoding?undefined:'utf8');
}
const bf2num=(bf:Buffer,start:number, len:number, encodinged:boolean):number=>{
    let out:number=0;
    for(let i=0; i<len; i++){
        //console.log('out',out,bf[start+i])
        out*=(1<<(encodinged?7:8)) // Encoding된 값이라 최상위 비트 제거.
        out+=bf[start+i]
    }
    return out;
}

const bf2num_bit=(bf:Buffer,start:number, st_bit:number, len_bit:number):number=>{//st_bit = 0~7, 

    //console.log('[bf2num_bit - a] start, st_bit',start, st_bit,len_bit)
    start+=(st_bit>>3);
    st_bit%=8;
    //console.log('[bf2num_bit - b] start, st_bit',start, st_bit,len_bit)
    if (st_bit+len_bit <= 8) return (bf[start]>>(8-len_bit-st_bit))&((1<<len_bit)-1);
    
    let out:number=bf[start]&((1<<(8-st_bit))-1)
    //console.log('[bf2num_bit - out-setup]',out)
    
    for(var i=8-st_bit; i+8<len_bit; i+=8){
        //console.log('bf2num',i,out)
        out<<=8;
        out+=bf[start+((i+st_bit)>>3)]
    }
    //console.log(out)
    out<<=len_bit-i;
    //console.log('bf2num-out',i,out, bf[start+((i+st_bit)>>3)],(8-(len_bit-i)))
    out+=bf[start+((i+st_bit)>>3)]>>(8-(len_bit-i))
    return out;
}



class Mp3_split{
    file:Buffer
    chunk_size:number
    start_pos:number
    ended:boolean = false;
    m3u8:number[][] = [];
    //timeout:NodeJS.Timeout[] = []
    remove_interver:NodeJS.Timer
    last_time:number
    duraction:number
    AAU_size:number
    frequency:number
    header:number[]
    indexed_callback:(index:m3u8type)=>void
    remove_callback:()=>any
    constructor(file:Buffer, chunk_size:number=10, duraction:number=120, indexed_callback:(index:m3u8type)=>{}, remove_callback:()=>any){
        this.file = file
        this.chunk_size = chunk_size
        this.indexed_callback = indexed_callback;
        this.get_start_pos()
        this.duraction=duraction
        this.remove_callback = remove_callback;
        //this.timeout = [];
        //this.last_time = Number(new Date())
        this.extension_remove_deadline()
        this.remove_triger()
        
    }
    private get_start_pos():number{
        let Tag_Identifier:string  = bf2chr(this.file,0,3,undefined);
        let p:number = 0
        if (Tag_Identifier=='ID3'){
            var Size_of_Tag = bf2num(this.file,6,4,true)
            //console.log('Size_of_ID3Tag:',Size_of_Tag) // 헤더 길이(10) 미포함.
            p=Size_of_Tag+10;
        }else p=10;
        this.start_pos = p
        return p;
    }
    public create_m3u8(){
        return new Promise((resolve:(index:m3u8type)=>any, rejects)=>{
        if(!this.start_pos) {rejects('시작 안 됨...'); return;}
        this.ended = false;
        let time_sum:number = 0
        let time_sum_off:number = 0
        let first_flag:boolean = true
        let pre_p:number = this.start_pos
        let pre_AAU_size:number = 0
        let ppre_AAU_size:number = 0
        let start_flag:boolean = true;
        let _frequency;

        for(let p:number=pre_p; p<this.file.length;){
            let {AAU_size, frequency} = this.get_AAU_len(p)
            
            //console.log('[for]',p,this.file.length,AAU_size,frequency)
            if(isNaN(AAU_size) || !AAU_size) {
                console.log('정복중 오류 파일!', p,this.file.length, AAU_size, frequency);
                p-=this.AAU_size;3
                //
                const d = this.get_AAU_야매(p)
                AAU_size=d.AAU_size;
                if(!isNaN(frequency)) frequency=d.frequency
                if(isNaN(AAU_size)) break;
            }
            if(!isNaN(frequency)) _frequency = frequency;
            const time_piece = 144/frequency*8
            
            if(time_sum_off*time_piece>this.chunk_size){
                const pre_offset:number = start_flag?0:2; //처음이면 0, 아니면 1
                start_flag = false;

                this.m3u8.push([pre_p-ppre_AAU_size*pre_offset, p, (time_sum-pre_offset)*time_piece, (time_sum_off+pre_offset)*time_piece])
                time_sum+=time_sum_off
                time_sum_off = 0;
                pre_p = p
                if(first_flag){
                    first_flag = false;
                    this.indexed_callback({m3u8:this.m3u8, ended:this.ended})
                } 
            }else{
                time_sum_off++
            }
            ppre_AAU_size = pre_AAU_size;
            pre_AAU_size = AAU_size;
            p+=AAU_size;
        }
        const time_piece = 144/_frequency*8
        //마지막 부분을 더함.
        console.log('마지막 부분 더함',this.file.length,time_sum, time_piece, _frequency, pre_AAU_size )
        this.m3u8.push([pre_p-ppre_AAU_size*2, this.file.length, (time_sum-2)*time_piece, (time_sum_off+2)*time_piece])
        
        this.ended = true
        //delete this.file
        resolve({m3u8:this.m3u8,ended:this.ended})
    })
    }
    private get_AAU_len(p:number):{AAU_size:number, frequency:number}{
        // if(!this.header) 
        
        if(this.file[p]!=255){
            console.log('해더가 아님!')
            return {AAU_size:NaN, frequency:NaN}
        }
        this.header = [this.file[p],this.file[p+1],this.file[p+2],this.file[p+3]]
        
        const Version = (this.file[p+1]>>3)&3
        const Layer = (this.file[p+1]>>1)&3
        const Bit_rate = this.file[p+2]>>4
        const Frequency = (this.file[p+2]>>2)&3
        const Padding_bit = (this.file[p+2]>>1)&1

        let Bit_rate_val:number = 0// = undefined;
        if (Version==3){
            if (Layer==3) Bit_rate_val = [NaN,32,64,96,128,160,192,224,256,288,320,352,384,416,448,NaN][Bit_rate];
            else if (Layer==2) Bit_rate_val = [NaN,32,45,56,64,80,96,112,128,160,192,224,256,320,384,NaN][Bit_rate];
            else if (Layer==1) Bit_rate_val = [NaN,32,40,45,56,64,80,96,112,128,160,192,224,256,320,NaN][Bit_rate];
        }else if (Version==0 || Version==2){
            if (Layer==3) Bit_rate_val = [NaN,32,48,56,64,80,96,112,128,144,160,176,192,224,256,NaN][Bit_rate];
            else if (Layer==2 || Layer==1) Bit_rate_val = [NaN,8,16,24,32,40,48,56,64,80,96,112,128,144,160,NaN][Bit_rate];
        }
        let Frequency_val:number
        if (Version==3) Frequency_val = [44100,48000,32000,NaN][Frequency]
        else if (Version==2) Frequency_val = [22050,24000,16000,NaN][Frequency]
        else if (Version==0) Frequency_val = [11025,12000,8000,NaN][Frequency]
        const AAU_size = Math.floor(144*Bit_rate_val*1000/Frequency_val+Padding_bit)
        //if(!isNaN(Frequency_val)) this.frequency = Frequency_val
        //if(isNaN(AAU_size)||!AAU_size) {
        //if(p>36023473) console.log('[mp3_size_err]',p,this.file.length,'AAU',this.AAU_size, AAU_size, 'Frequency', Frequency_val, this.frequency, 'Bit_rate_val',Bit_rate_val, this.header)
        //    return {AAU_size:this.AAU_size, frequency:this.frequency}
        //}
        // if(this.AAU_size != AAU_size) console.log('[mp3_size_ 변경점 존재]',p,this.file.length,this.AAU_size, AAU_size, Frequency_val)
        this.AAU_size = AAU_size
        //if(!this.frequency)
         this.frequency = Frequency_val //고정 가정
        return {AAU_size, frequency:Frequency_val};
        //l = 144/info.frequency*8
    }
    private get_AAU_야매(p:number):{AAU_size:number, frequency:number}{
        console.log('야매로 찍기')
        const p_s = p;
        p++;
        while(p<this.file.length){
            if((this.file[p] == this.header[0]) &&
            (this.file[p+1] == this.header[1])
            // (this.file[p+2] == this.header[2]) &&
            // (this.file[p+3] == this.header[3])
            ) return {AAU_size:p-p_s, frequency:this.frequency}
            p++;
        }
        return {AAU_size:NaN, frequency:NaN};
    }
    public get_m3u8():m3u8type{
        this.extension_remove_deadline()
        return {m3u8:this.m3u8,ended:this.ended}
    }
    public get_file(index:number):undefined|Buffer/*{file:Buffer, length:number, currentTime:number}*/{
        this.extension_remove_deadline()
        if(isNaN(index) || index<0 || index>=this.m3u8.length) return;
        if(!this.m3u8[index] || !this.file) return;
        const start = this.m3u8[index][0]
        const end = this.m3u8[index][1]
        const currentTime = this.m3u8[index][2]
        const length = this.m3u8[index][3]
        if(end-start < 0) return;
        
        const id3 = [73, 68, 51, 4, 0, 0, 0, 0, 0, 0]
        const _file = Buffer.alloc(end-start+10)
        id3.forEach((v,i)=>_file[i]=v);
        for(let i=10; i<_file.length; i++){
            //console.log('[for - getfile]',typeof this.file, start, i)
            _file[i] = this.file[start+i-10];
        }
        return _file//{file:_file, length, currentTime}
    }
    private remove_triger(){
        if(this.remove_interver) return;
        this.remove_interver = setInterval(()=>{
            if(Number(new Date()) - this.last_time > this.duraction*1000){ //시간이 너무 흐르면, 제거하기
                console.log('rm before',Number(new Date())/1000, this.last_time/1000, (Number(new Date())-this.last_time)/1000, this.duraction)
                this.remove()
            }
        }, 20*1000); //30초마다 제가
    }
    public extension_remove_deadline (){
        console.log('[extension_remove_deadline]')
        this.last_time = Number(new Date());
    }
    private remove(){
        console.log('[mp3] remove')
        clearInterval(this.remove_interver)
        delete this.file
        this.remove_callback();
    }
}


class Mp3_split_manage{
    HLS_url_list:string[] = []
    HLS_list:Mp3_split[] = []
    constructor(){
        
    }
    add_mp3(url:string, callback_index:(index:m3u8type)=>{}, callback_create:(index:m3u8type)=>{}){
        const _url = url;
        console.log('[Mp3_split_manage > add_Mp3_split], url:',_url);
        if(!fs.existsSync(url)) {console.log('[Mp3_split_manage] 없는 주소 요청함;;',_url); return false;}
        if(this.HLS_url_list.includes(_url)){console.log('[Mp3_split_manage] 이미 있는 주소 요청함;;',url); return false;}
        const hls:Mp3_split = new Mp3_split(fs.readFileSync(_url),undefined,  60, callback_index, ()=>{
            //삭제시 실행되는 함수임!
            let ind = this.HLS_url_list.indexOf(_url)
            if(ind<0) {console.log('[mp3 > remove_callback] 이미 삭제됨- 배열에 안들음',_url); return false}
            else console.log('[mp3 > remove_callback] 아직 삭제안됨- 배열에 들음',_url);
            delete this.HLS_url_list.splice(ind,1)[0]
            delete this.HLS_list.splice(ind,1)[0]
        })
        hls.create_m3u8().then((d)=>{
            callback_create(d);
        }).catch((err)=>{
            console.log('[add mp3.split err]',_url, err);
        })
        this.HLS_list.push(hls)
        this.HLS_url_list.push(_url)
    }
    get_mp3(url:string, index:number):Buffer{
        const i:number = this.HLS_url_list.indexOf(url)
        console.log('[Mp3_split_manage > get_HTL_ts] url, index, i ',url, index, i, this.HLS_url_list.length)
        if(isNaN(i) || i<0) return undefined
        this.HLS_list[i].extension_remove_deadline();
        console.log('[Mp3_split_manage > get_HTL_ts]2')
        return this.HLS_list[i].get_file(index)
    }
    get_m3u8(url:string):m3u8type|undefined{
        const i:number = this.HLS_url_list.indexOf(url)
        if(isNaN(i) || i<0) return;
        this.HLS_list[i].extension_remove_deadline();
        return this.HLS_list[i].get_m3u8()
    }
}
module.exports = Mp3_split_manage