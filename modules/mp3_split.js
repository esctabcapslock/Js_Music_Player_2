"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mp3_split = void 0;
const fs = require("fs");
const mp3_def_1 = require("./mp3_def");
const bf2chr = (bf, start, len, encoding) => {
    if (start < 0)
        return undefined;
    const b = Buffer.alloc(len);
    for (let i = 0; i < len; i++)
        b[i] = bf[start + i];
    return b.toString(encoding ? undefined : 'utf8');
};
const bf2num = (bf, start, len, encodinged) => {
    let out = 0;
    for (let i = 0; i < len; i++) {
        //console.log('out',out,bf[start+i])
        out *= (1 << (encodinged ? 7 : 8)); // Encoding된 값이라 최상위 비트 제거.
        out += bf[start + i];
    }
    return out;
};
const bf2num_bit = (bf, start, st_bit, len_bit) => {
    //console.log('[bf2num_bit - a] start, st_bit',start, st_bit,len_bit)
    start += (st_bit >> 3);
    st_bit %= 8;
    //console.log('[bf2num_bit - b] start, st_bit',start, st_bit,len_bit)
    if (st_bit + len_bit <= 8)
        return (bf[start] >> (8 - len_bit - st_bit)) & ((1 << len_bit) - 1);
    let out = bf[start] & ((1 << (8 - st_bit)) - 1);
    //console.log('[bf2num_bit - out-setup]',out)
    for (var i = 8 - st_bit; i + 8 < len_bit; i += 8) {
        //console.log('bf2num',i,out)
        out <<= 8;
        out += bf[start + ((i + st_bit) >> 3)];
    }
    //console.log(out)
    out <<= len_bit - i;
    //console.log('bf2num-out',i,out, bf[start+((i+st_bit)>>3)],(8-(len_bit-i)))
    out += bf[start + ((i + st_bit) >> 3)] >> (8 - (len_bit - i));
    return out;
};
class Mp3_split {
    constructor(file, chunk_size = 2, duraction = 120, indexed_callback, remove_callback) {
        this.ended = false;
        this.m3u8 = [];
        this.file = file;
        this.chunk_size = chunk_size; // 대충 이 시간만큼 파일을 분해한다.
        this.indexed_callback = indexed_callback;
        this.get_start_pos();
        this.duraction = duraction;
        this.remove_callback = remove_callback;
        //this.timeout = [];
        //this.last_time = Number(new Date())
        this.extension_remove_deadline();
        this.remove_triger();
    }
    get_start_pos() {
        let Tag_Identifier = bf2chr(this.file, 0, 3, undefined);
        let p = 0;
        if (Tag_Identifier == 'ID3') {
            var Size_of_Tag = bf2num(this.file, 6, 4, true);
            console.log('Size_of_ID3Tag:', Size_of_Tag); // 헤더 길이(10) 미포함.
            p = Size_of_Tag + 10;
        }
        else
            p = 10;
        this.start_pos = p;
        return p;
    }
    create_m3u8() {
        return new Promise((resolve, rejects) => {
            if (!this.start_pos) {
                rejects('시작 안 됨...');
                return;
            }
            this.ended = false;
            // let time_sum:number = 0
            // let time_sum_off:number = 0
            let first_flag = true;
            let pre_p = this.start_pos;
            let pre_AAU_sizes = [];
            let chunk_dur_sizes = [];
            let pre_AAU_sizes_len = 15;
            // let ppre_AAU_size:number = 0
            let start_flag = true;
            let pre_chunk_alu_sizes = []; // 이전 chunk의 마지막 크기들
            let pre_chunk_dur_sizes = []; // 이전 chunk의 마지막 크기들
            let _frequency;
            const ct = () => { const o = []; for (let i = 0; i < pre_AAU_sizes_len; i++)
                o.push(0); return o; }; //초기화
            pre_chunk_alu_sizes = ct();
            pre_chunk_dur_sizes = ct();
            let aaucnt = 0;
            let chunk_duraction = 0;
            let total_duraction = 0;
            for (let p = pre_p; p < this.file.length;) {
                // p_stack.push(p)
                /*let {AAU_size, frequency} = this.get_AAU_len(p)
                
                console.log('[for]','p', p,'chunk내순서:', time_sum_off, AAU_size, 'f:',frequency, 'total:',this.file.length,)
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
                */
                const headerInfo = (0, mp3_def_1.frameHeaderParsing)(this.file, p);
                const { samplingRate, frameLengthInBytes, duraction } = headerInfo;
                if (aaucnt < 5)
                    console.table(headerInfo);
                if (!isNaN(samplingRate))
                    this.frequency = samplingRate;
                const time_piece = 144 / this.frequency * 8;
                const AAU_size = frameLengthInBytes;
                chunk_duraction += time_piece;
                total_duraction += time_piece;
                if (aaucnt == 1)
                    pre_p = p; // 맨 앞 frame은 이상함. 자른다.
                if (chunk_duraction > this.chunk_size) {
                    // if(time_sum_off*time_piece>this.chunk_size){
                    const pre_offset = start_flag ? 0 : pre_AAU_sizes_len; //처음이면 0, 아니면 1
                    start_flag = false;
                    // console.log(pre_chunk_alu_sizes, pre_chunk_alu_sizes.length)
                    // this.m3u8.push([pre_p-ppre_AAU_size*pre_offset, p, (time_sum-pre_offset)*time_piece, (time_sum_off)*time_piece])
                    // this.m3u8.push([p_stack[p_stack.length-1-pre_offset], p, (time_sum-pre_offset)*time_piece, (time_sum_off+pre_offset)*time_piece]) // 원본
                    let pre_offset_dur = pre_chunk_dur_sizes.length ? pre_chunk_dur_sizes.reduce((a, b) => a + b) : 0;
                    let pre_offset_p = pre_chunk_alu_sizes.length ? pre_chunk_alu_sizes.reduce((a, b) => a + b) : 0;
                    this.m3u8.push([pre_p - pre_offset_p, p, total_duraction - chunk_duraction - pre_offset_dur, chunk_duraction + pre_offset_dur]); // 원본
                    // this.m3u8.push([pre_p-pre_chunk_alu_sizes.reduce((a,b)=>a+b), p, (time_sum-pre_offset)*time_piece, (time_sum_off+pre_offset)*time_piece]) // 원본
                    // time_sum+=time_sum_off
                    // time_sum_off = 0;
                    pre_p = p;
                    if (first_flag) {
                        first_flag = false;
                        this.indexed_callback({ m3u8: this.m3u8, ended: this.ended });
                    }
                    chunk_duraction = 0;
                    pre_chunk_alu_sizes = pre_AAU_sizes;
                    pre_chunk_dur_sizes = chunk_dur_sizes;
                    pre_AAU_sizes = ct();
                    chunk_dur_sizes = ct();
                }
                else {
                    // time_sum_off++
                }
                for (let i = pre_AAU_sizes_len - 1; i > 0; i--)
                    pre_AAU_sizes[i] = pre_AAU_sizes[i - 1]; //밀기
                pre_AAU_sizes[0] = AAU_size;
                for (let i = pre_AAU_sizes_len - 1; i > 0; i--)
                    chunk_dur_sizes[i] = chunk_dur_sizes[i - 1]; //밀기
                chunk_dur_sizes[0] = time_piece;
                p += AAU_size;
                aaucnt++;
            }
            const time_piece = 144 / this.frequency * 8;
            //마지막 부분을 더함.
            console.log('마지막 부분 더함', this.file.length, 'time_piece', time_piece, '_frequency', _frequency, pre_chunk_alu_sizes.reduce((a, b) => a + b));
            let pre_offset_dur = pre_chunk_dur_sizes.length ? pre_chunk_dur_sizes.reduce((a, b) => a + b) : 0;
            let pre_offset_p = pre_chunk_alu_sizes.length ? pre_chunk_alu_sizes.reduce((a, b) => a + b) : 0;
            this.m3u8.push([pre_p - pre_offset_p, this.file.length, total_duraction - chunk_duraction - pre_offset_dur, chunk_duraction + pre_offset_dur]);
            // this.m3u8.push([pre_p-pre_chunk_alu_sizes.length?pre_chunk_alu_sizes.reduce((a,b)=>a+b):0, this.file.length, , (time_sum_off+2)*time_piece])
            this.ended = true;
            //delete this.file
            resolve({ m3u8: this.m3u8, ended: this.ended });
        });
    }
    get_AAU_len(p) {
        // if(!this.header) 
        if (this.file[p] != 0xFF) {
            console.log('해더가 아님!');
            return { AAU_size: NaN, frequency: NaN };
        }
        this.header = [this.file[p], this.file[p + 1], this.file[p + 2], this.file[p + 3]];
        const Version = (this.file[p + 1] >> 3) & 3;
        const Layer = (this.file[p + 1] >> 1) & 3;
        const Bit_rate = this.file[p + 2] >> 4;
        const Frequency = (this.file[p + 2] >> 2) & 3;
        const Padding_bit = (this.file[p + 2] >> 1) & 1;
        let Bit_rate_val = 0; // = undefined;
        if (Version == 3) {
            if (Layer == 3)
                Bit_rate_val = [NaN, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, NaN][Bit_rate];
            else if (Layer == 2)
                Bit_rate_val = [NaN, 32, 45, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, NaN][Bit_rate];
            else if (Layer == 1)
                Bit_rate_val = [NaN, 32, 40, 45, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, NaN][Bit_rate];
        }
        else if (Version == 0 || Version == 2) {
            if (Layer == 3)
                Bit_rate_val = [NaN, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, NaN][Bit_rate];
            else if (Layer == 2 || Layer == 1)
                Bit_rate_val = [NaN, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, NaN][Bit_rate];
        }
        let Frequency_val;
        if (Version == 3)
            Frequency_val = [44100, 48000, 32000, NaN][Frequency];
        else if (Version == 2)
            Frequency_val = [22050, 24000, 16000, NaN][Frequency];
        else if (Version == 0)
            Frequency_val = [11025, 12000, 8000, NaN][Frequency];
        const AAU_size = (Layer == 3) ? Math.floor((12 * Bit_rate_val * 1000 / Frequency_val + Padding_bit) * 4)
            : Math.floor(144 * Bit_rate_val * 1000 / Frequency_val + Padding_bit);
        //if(!isNaN(Frequency_val)) this.frequency = Frequency_val
        //if(isNaN(AAU_size)||!AAU_size) {
        //if(p>36023473) console.log('[mp3_size_err]',p,this.file.length,'AAU',this.AAU_size, AAU_size, 'Frequency', Frequency_val, this.frequency, 'Bit_rate_val',Bit_rate_val, this.header)
        //    return {AAU_size:this.AAU_size, frequency:this.frequency}
        //}
        // if(this.AAU_size != AAU_size) console.log('[mp3_size_ 변경점 존재]',p,this.file.length,this.AAU_size, AAU_size, Frequency_val)
        this.AAU_size = AAU_size;
        //if(!this.frequency)
        this.frequency = Frequency_val; //고정 가정
        return { AAU_size, frequency: Frequency_val };
        //l = 144/info.frequency*8
    }
    get_AAU_야매(p) {
        console.log('야매로 찍기');
        const p_s = p;
        p++;
        while (p < this.file.length) {
            if ((this.file[p] == this.header[0]) &&
                (this.file[p + 1] == this.header[1])
            // (this.file[p+2] == this.header[2]) &&
            // (this.file[p+3] == this.header[3])
            )
                return { AAU_size: p - p_s, frequency: this.frequency };
            p++;
        }
        return { AAU_size: NaN, frequency: NaN };
    }
    get_m3u8() {
        this.extension_remove_deadline();
        return { m3u8: this.m3u8, ended: this.ended };
    }
    get_file(index) {
        this.extension_remove_deadline();
        if (isNaN(index) || index < 0 || index >= this.m3u8.length)
            return;
        if (!this.m3u8[index] || !this.file)
            return;
        const start = this.m3u8[index][0];
        const end = this.m3u8[index][1];
        const currentTime = this.m3u8[index][2];
        const length = this.m3u8[index][3];
        if (end - start < 0)
            return;
        const id3 = [73, 68, 51, 4, 0, 0, 0, 0, 0, 0];
        const _file = Buffer.alloc(end - start + 10);
        id3.forEach((v, i) => _file[i] = v);
        for (let i = 10; i < _file.length; i++) {
            //console.log('[for - getfile]',typeof this.file, start, i)
            _file[i] = this.file[start + i - 10];
        }
        return _file; //{file:_file, length, currentTime}
    }
    remove_triger() {
        if (this.remove_interver)
            return;
        this.remove_interver = setInterval(() => {
            if (Number(new Date()) - this.last_time > this.duraction * 1000) { //시간이 너무 흐르면, 제거하기
                console.log('rm before', Number(new Date()) / 1000, this.last_time / 1000, (Number(new Date()) - this.last_time) / 1000, this.duraction);
                this.remove();
            }
        }, 20 * 1000); //30초마다 제가
    }
    extension_remove_deadline() {
        //console.log('[extension_remove_deadline]')
        this.last_time = Number(new Date());
    }
    remove() {
        console.log('[mp3] remove');
        clearInterval(this.remove_interver);
        delete this.file;
        this.remove_callback();
    }
}
exports.Mp3_split = Mp3_split;
class Mp3_split_manage {
    constructor() {
        this.HLS_url_list = [];
        this.HLS_list = [];
    }
    add_mp3(url, callback_index, callback_create) {
        const _url = url;
        //console.log('[Mp3_split_manage > add_Mp3_split], url:',_url);
        if (!fs.existsSync(url)) {
            console.log('[Mp3_split_manage] 없는 주소 요청함;;', _url);
            return false;
        }
        if (this.HLS_url_list.includes(_url)) {
            console.log('[Mp3_split_manage] 이미 있는 주소 요청함;;', url);
            return false;
        }
        const hls = new Mp3_split(fs.readFileSync(_url), undefined, 60, callback_index, () => {
            //삭제시 실행되는 함수임!
            let ind = this.HLS_url_list.indexOf(_url);
            if (ind < 0) {
                console.log('[mp3 > remove_callback] 이미 삭제됨- 배열에 안들음', _url);
                return false;
            }
            else
                console.log('[mp3 > remove_callback] 아직 삭제안됨- 배열에 들음', _url);
            delete this.HLS_url_list.splice(ind, 1)[0];
            delete this.HLS_list.splice(ind, 1)[0];
        });
        hls.create_m3u8().then((d) => {
            callback_create(d);
        }).catch((err) => {
            console.log('[add mp3.split err]', _url, err);
        });
        this.HLS_list.push(hls);
        this.HLS_url_list.push(_url);
    }
    get_mp3(url, index) {
        const i = this.HLS_url_list.indexOf(url);
        //console.log('[Mp3_split_manage > get_HTL_ts] url, index, i ',url, index, i, this.HLS_url_list.length)
        if (isNaN(i) || i < 0)
            return undefined;
        this.HLS_list[i].extension_remove_deadline();
        //console.log('[Mp3_split_manage > get_HTL_ts]2')
        return this.HLS_list[i].get_file(index);
    }
    get_m3u8(url) {
        const i = this.HLS_url_list.indexOf(url);
        if (isNaN(i) || i < 0)
            return;
        this.HLS_list[i].extension_remove_deadline();
        return this.HLS_list[i].get_m3u8();
    }
}
exports.default = Mp3_split_manage;
// module.exports = Mp3_split_manage
