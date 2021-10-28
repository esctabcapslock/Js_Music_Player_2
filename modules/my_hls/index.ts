import * as fs from "fs"
import * as crypto from "crypto"
import { exec } from "child_process";
import { resolve } from "path/posix";
import { rejects } from "assert";

//tmp, files 폴더 없으면 생성
if(!fs.existsSync('./tmp')) fs.mkdirSync('./tmp');
//tmp 폴더 내부의 모든 폴더 삭제
fs.readdirSync('./tmp').forEach(v=>fs.unlinkSync('./tmp/'+v))

const MD5 = (txt)=> crypto.createHash('md5').update(txt).digest('hex');

const working_list = []
class HLS{
    status:string
    url:string
    dirpath:string
    constructor(url:string, duraction:number){
        this.status = 'ready';
        this.url = url
        this.dirpath = '/tmp/'+MD5(url);
        //
        setTimeout(() => {
            this.remove()
        }, duraction*2*1000);
    }
    //ffmpeg로 ts파일 생성, ts파일 리스트 반환
    public create_ts(hls_time:number=10,){
        return new Promise((resolve:((list:string[])=>any), rejects)=>{
        this.status = 'create';
        if(working_list.includes(this.url)) working_list.push(this.url)
        else{this.status='end'; rejects(false)}
        
        //폴더 만들기
        fs.mkdirSync(this.dirpath)
        this.status = 'working';
        const cmd:string=`ffmpeg -i ${this.url} -profile:v baseline -level 3.0 -start_number 0 -hls_time 10 -hls_list_size 0 -f hls index.m3u8`
        exec(cmd, {encoding: 'utf8'},(err,result,stderr) => {
            fs.readFile(this.dirpath+'/index.m3u8',(err,data)=>{
                resolve([]);
            })
        })
    })
    }
    
    //요청에 대해 파일 반환
    public get_ts_file():Buffer{
        return Buffer.from([1]);
    }
    //파일제거
    public remove():boolean{
        working_list.splice(working_list.indexOf(this.url), 1)
        this.status='end';

        fs.unlinkSync(this.dirpath)
        return true
    }

}
module.exports = HLS