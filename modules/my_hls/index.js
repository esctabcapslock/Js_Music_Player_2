"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//tsc --target "es6" --module "commonjs"  modules\my_hls\index.ts
const fs = require("fs");
const crypto = require("crypto");
const child_process_1 = require("child_process");
//tmp, files 폴더 없으면 생성
if (!fs.existsSync(__dirname + '/tmp'))
    fs.mkdirSync(__dirname + '/tmp');
//tmp 폴더 내부의 모든 폴더 삭제
fs.readdirSync(__dirname + '/tmp').forEach(v => fs.stat(__dirname + '/tmp/' + v, (err, stat) => {
    console.log(v, stat.isDirectory());
    if (stat.isDirectory())
        fs.rmdir(__dirname + '/tmp/' + v, (err) => { });
    else
        fs.unlink(__dirname + '/tmp/' + v, (err) => { });
}));
const MD5 = (txt) => crypto.createHash('md5').update(txt).digest('hex');
console.log('__dirname', __dirname);
class Index_Event extends Event {
    constructor(data) { super('index'); this.index = data; }
}
class Create_Event extends Event {
    constructor(data) { super('create'); this.index = data; }
}
class Remove_Event extends Event {
    constructor() { super('remove'); }
}
const working_list = [];
class HLS extends EventTarget {
    constructor(url, duraction) {
        super();
        //ts_file_list:string[] = []
        this.m3u8_list = [];
        this.index_event_did = false;
        this.create_event_did = false;
        this.status = 'ready';
        this.url = url;
        this.dirpath = __dirname + '/tmp/' + MD5(url);
        this.duraction = duraction * 1000;
        this.extension_remove_deadline();
    }
    //ffmpeg로 ts파일 생성, ts파일 리스트 반환
    create_ts(hls_time = 10) {
        this.status = 'create';
        if (!working_list.includes(this.url))
            working_list.push(this.url);
        else {
            this.status = 'end';
            console.log('err');
            this.dispatchEvent(new Event('error'));
        }
        //폴더 만들기
        if (!fs.existsSync(this.dirpath))
            fs.mkdirSync(this.dirpath);
        this.status = 'working';
        const cmd = `"${__dirname}\\ffmpeg.exe" -i "${this.url}" -profile:v baseline -level 3.0 -start_number 0 -hls_time ${hls_time} -hls_list_size 0 -f hls index.m3u8`;
        this.m3u8_url = this.dirpath + '\\index.m3u8';
        // const a = setInterval(() => {
        //     var data = this.get_m3u8_list();
        //     if (!data) { this.dispatchEvent(new Event('error')) }
        //     else {
        //         clearInterval(a);
        //         this.index_event_did = true
        //         this.dispatchEvent(new Index_Event(data));
        //     }
        // }, 100);
        const _this = this;
        const ffmpeg = (0, child_process_1.spawn)(`${__dirname}\\ffmpeg.exe`, ['-i', this.url, '-profile:v', 'baseline', '-level', '3.0', '-start_number', '0', `-hls_time`, `${hls_time}`, '-hls_list_size', '0', '-f', 'hls', 'index.m3u8'], { cwd: this.dirpath });
        // input_file.pipe(ffmpeg.stdin);
        // ffmpeg.stdout.pipe(output_stream);
        ffmpeg.stdout.on('data', function (data) {
            console.log(data.toString(), data.length);
        });
        ffmpeg.stderr.on('data', function (err) {
            console.log('ffmpeg stderr', err.length); //err.toString(); //err이 아닌것 같음
            if (!_this.index_event_did) {
                const data = _this.get_m3u8_list();
                if (data) {
                    _this.index_event_did = true;
                    _this.dispatchEvent(new Index_Event(data));
                }
            }
        });
        ffmpeg.on('close', function (code) {
            console.log('file has been converted succesfully', code);
            var data = _this.get_m3u8_list();
            if (!data) {
                _this.status = 'end';
                _this.dispatchEvent(new Event('error'));
                return;
            }
            _this.create_event_did = true;
            _this.dispatchEvent(new Create_Event(data));
        });
        ffmpeg.on('err', function (err) {
            console.log(err, 'ffmpeg err');
            _this.dispatchEvent(new Event('error', err));
            return;
        });
        // exec(cmd, {encoding: 'utf8', cwd:this.dirpath},(err,result,stderr) => {
        //     var data = this.get_m3u8_list();
        //     if(!data) {this.status='end'; console.log(err); this.dispatchEvent(new Event('error')); return;}
        //     this.dispatchEvent(new Create_Event(data));
        // });
    }
    get_m3u8_list() {
        if (fs.existsSync(this.m3u8_url)) {
            const data = fs.readFileSync(this.m3u8_url);
            //if(err) {this.status='end'; console.log(err); this.dispatchEvent(new Event('error'))}
            const dd = data.toString('utf8').trim().split('\n');
            const ended = dd[dd.length - 1] == '#EXT-X-ENDLIST';
            const df = dd.filter(v => v.endsWith('.ts'));
            const ds = dd.filter(v => v.startsWith('#EXTINF:') && v.endsWith(','));
            const out = df.map((v, i) => [df[i], Number(ds[i].replace(/^#EXTINF:(\d+.\d+),$/, '$1'))]);
            this.m3u8_list = out;
            return { m3u8: out, ended };
        }
        else {
            return undefined;
        }
    }
    //요청에 대해 파일 반환
    get_ts_url(i) {
        const url = this.dirpath + '/' + this.m3u8_list[i][0];
        console.log('[HLS get_ts_url] url, i:', url, i);
        if (!fs.existsSync(url))
            return undefined;
        return url; //fs.readFileSync()
    }
    //이 함수가 호출되고 특정 시간이 지나면, 본 객체는 제거된다.
    extension_remove_deadline() {
        if (this.timeout)
            clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.timeout = undefined;
            this.remove();
        }, this.duraction);
    }
    //파일제거
    remove() {
        working_list.splice(working_list.indexOf(this.url), 1);
        this.status = 'end';
        this.dispatchEvent(new Remove_Event());
        //폴더 내 모든 것들 제거
        Promise.all(fs.readdirSync(this.dirpath).map(() => new Promise(resolve => (v => fs.stat(this.dirpath + '/' + v, (err, stat) => {
            console.log(v, stat.isDirectory());
            if (stat.isDirectory())
                fs.rmdirSync(this.dirpath + '/' + v);
            else
                fs.unlinkSync(this.dirpath + v);
        }))))).then(() => {
            fs.rmdirSync(this.dirpath);
        });
        //폴더 제거
        return true;
    }
}
class HLS_manage {
    constructor() {
        this.HLS_url_list = [];
        this.HLS_list = [];
    }
    add_HLS(url, callback_index, callback_create) {
        console.log('[HLS > HLS_manage > add_HLS], url:', url);
        if (!fs.existsSync(url))
            return false;
        const hls = new HLS(url, 120);
        hls.create_ts();
        this.HLS_list.push(hls);
        this.HLS_url_list.push(url);
        hls.addEventListener('index', (e) => { callback_index(e['index']); });
        hls.addEventListener('create', callback_create);
        hls.addEventListener('remove', () => {
            const index = this.HLS_url_list.indexOf(url);
            this.HLS_url_list.splice(index, 1);
            this.HLS_list.splice(index, 1);
        });
    }
    get_HTL_ts(url, index) {
        const i = this.HLS_url_list.indexOf(url);
        console.log('[HLS_manage > get_HTL_ts] url, index, i ', url, index, i);
        if (isNaN(i) || i < 0)
            return undefined;
        this.HLS_list[i].extension_remove_deadline();
        return this.HLS_list[i].get_ts_url(index);
    }
    get_HTL_m3u8(url) {
        const i = this.HLS_url_list.indexOf(url);
        if (isNaN(i) || i < 0)
            return false;
        this.HLS_list[i].extension_remove_deadline();
        return this.HLS_list[i].get_m3u8_list(); //
    }
}
//module.exports = HLS
//module.exports.HLS = HLS
module.exports = HLS_manage;
