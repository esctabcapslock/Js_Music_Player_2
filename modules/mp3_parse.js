const fs = require('fs');
const maindata = require('./js-mp3-changed').maindata;
module.exports.Mp3_parse = Mp3_parse;



function Mp3_parse(file,callback){
    var file_len = file.length;
    //console.log('file', file_len)


    const bf2chr = (bf,start,len, encoding)=>{
        if(start<0) return undefined;
        var b=Buffer.alloc(len);
        for (var i=0; i<len; i++) b[i]=bf[start+i];
        return b.toString(encoding?encoding:'utf8');
    }
    const bf2num=(bf,start, len, encodinged)=>{
        var out=0;
        for(var i=0; i<len; i++){
            //console.log('out',out,bf[start+i])
            out*=(1<<(encodinged?7:8)) // Encoding된 값이라 최상위 비트 제거.
            out+=bf[start+i]
        }
        return out;
    }

    const bf2num_bit=(bf,start, st_bit, len_bit)=>{//st_bit = 0~7, 

        //console.log('[bf2num_bit - a] start, st_bit',start, st_bit,len_bit)
        start+=(st_bit>>3);
        st_bit%=8;
        //console.log('[bf2num_bit - b] start, st_bit',start, st_bit,len_bit)
        if (st_bit+len_bit <= 8) return (bf[start]>>(8-len_bit-st_bit))&((1<<len_bit)-1);
        
        var out=bf[start]&((1<<(8-st_bit))-1)
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


    var Tag_Identifier  = bf2chr(file,0,3);
    //console.log('Tag_Identifier:',Tag_Identifier)

    if (Tag_Identifier=='ID3'){
        var Size_of_Tag = bf2num(file,6,4,true)
        //console.log('Size_of_ID3Tag:',Size_of_Tag) // 헤더 길이(10) 미포함.
        var p=Size_of_Tag+10;
        
    }else var p=10;

    while (file[p]==0 && p<file_len) p++; //뜬금없이 비어져 있는 것들 있음 ;;; 뭐지. (바람이 불어오는곳 제이레빗)
        
    
   //console.log()

    var frame_cnt=0


    var Version = (file[p+1]>>3)&3
    var Layer = (file[p+1]>>1)&3
    var Error_Protection = (file[p+1])&1
    var Bit_rate = file[p+2]>>4
    var Frequency = (file[p+2]>>2)&3
    var Padding_bit = (file[p+2]>>1)&1
    var Channel_Mode = file[p+3]>>6
    //console.log('Version:',['MPEG 2.5','Reserved','MPEG 2','MPEG 1'][Version],Version)
    //console.log('Layer:', ['Reserved','Layer III','Layer II','Layer I'][Layer], Layer)
    //console.log('Padding_bit:',!!Padding_bit, Padding_bit)
    //console.log('Channel_Mode:',['Stereo','Joint Stereo','Dual Channel(DualMono)','Single Channel(Mono)'][Channel_Mode],Channel_Mode)
    var Bit_rate_val// = undefined;
    if (Version==3){
        if (Layer==3) Bit_rate_val = ['free',32,64,96,128,160,192,224,256,288,320,352,384,416,448,'bad'][Bit_rate];
        else if (Layer==2) Bit_rate_val = ['free',32,45,56,64,80,96,112,128,160,192,224,256,320,384,'bad'][Bit_rate];
        else if (Layer==1) Bit_rate_val = ['free',32,40,45,56,64,80,96,112,128,160,192,224,256,320,'bad'][Bit_rate];
    }
    else if (Version==0 || Version==2){
        if (Layer==3) Bit_rate_val = ['free',32,48,56,64,80,96,112,128,144,160,176,192,224,256,'bad'][Bit_rate];
        else if (Layer==2 || Layer==1) Bit_rate_val = ['free',8,16,24,32,40,48,56,64,80,96,112,128,144,160,'bad'][Bit_rate];
    }
    var Frequency_val
    if (Version==3) Frequency_val = [44100,48000,32000,'reserved'][Frequency]
    if (Version==2) Frequency_val = [22050,24000,16000,'reserved'][Frequency]
    if (Version==0) Frequency_val = [11025,12000,8000,'reserved'][Frequency]
    var AAU_size = Math.floor(144*Bit_rate_val*1000/Frequency_val+Padding_bit)
    //console.log('Frequency:',Frequency)
    //console.log('Bit_rate:',Bit_rate);
    //console.log('Bit_rate_val:',Bit_rate_val,'Kbit')
    //console.log('Frequency_val:',Frequency_val,'Hz');
    //console.log('AAU_size:',AAU_size);
    //console.log('while start!!-------\n\n')

    var prev
    var front_space = {
        length:0,
        valid:true,
        valid_check:(frame_cnt, v_max)=>{
            if (!front_space.valid) return;

            if (v_max > 10){
                front_space.valid = false
            }else{
                front_space.length=frame_cnt
            }
        }

    }
    var end_space = {
        expect_frame_cnt: Math.floor((file_len-Size_of_Tag)/AAU_size),
        length:0,
        length_start:null,
        valid:false,
        valid_check:(frame_cnt)=>{
            if (end_space.expect_frame_cnt - frame_cnt <200) end_space.valid = true
        },
        renew:(frame_cnt,v_max)=>{
            if (!end_space.valid) return;

            if (v_max>30) {
                end_space.length=0;
                end_space.length_start=null
            }
            else{
                if (end_space.length_start==null) end_space.length_start = frame_cnt
                end_space.length = frame_cnt-end_space.length_start;
            }
        }
    }



    while(p<file_len){
        var pp=0
        //console.log('\n while_start::p=',p, 'frame_cnt',frame_cnt)
        
        //https://ko.wikipedia.org/wiki/MP3
        var MP3_Sync_Word = bf2num(file,p,2,false)>>5
        //console.log('MP3_Sync_Word:',MP3_Sync_Word==2047, MP3_Sync_Word) // 2047이여야 함 (2**11-1)
        if (MP3_Sync_Word!=2047){

            //console.log('while문 종료됨','p',p,MP3_Sync_Word, file[p], file[p+1]);
            break;
        }
        var Version = (file[p+1]>>3)&3
        var Layer = (file[p+1]>>1)&3
        var Error_Protection = (file[p+1])&1

        var Bit_rate = file[p+2]>>4
        var Frequency = (file[p+2]>>2)&3
        var Padding_bit = (file[p+2]>>1)&1
        var Channel_Mode = file[p+3]>>6
        var Mode_Extension = (file[p+3]>>4)&3
        
        //console.log('Version:',['MPEG 2.5','Reserved','MPEG 2','MPEG 1'][Version],Version)
        //console.log('Layer:', ['Reserved','Layer III','Layer II','Layer I'][Layer], Layer)
        //console.log('Error_Protection:',Error_Protection)
        //console.log('Bit_rate:',Bit_rate)
        //console.log('Frequency:',Frequency)
        //console.log('Padding_bit:',!!Padding_bit, Padding_bit)
        //console.log('Channel_Mode:',['Stereo','Joint Stereo','Dual Channel(DualMono)','Single Channel(Mono)'][Channel_Mode],Channel_Mode)
        //console.log('Mode_Extension:',Mode_Extension)

        
        var Bit_rate_val// = undefined;
        if (Version==3){
            if (Layer==3) Bit_rate_val = ['free',32,64,96,128,160,192,224,256,288,320,352,384,416,448,'bad'][Bit_rate];
            else if (Layer==2) Bit_rate_val = ['free',32,45,56,64,80,96,112,128,160,192,224,256,320,384,'bad'][Bit_rate];
            else if (Layer==1) Bit_rate_val = ['free',32,40,45,56,64,80,96,112,128,160,192,224,256,320,'bad'][Bit_rate];
        }
        else if (Version==0 || Version==2){
            if (Layer==3) Bit_rate_val = ['free',32,48,56,64,80,96,112,128,144,160,176,192,224,256,'bad'][Bit_rate];
            else if (Layer==2 || Layer==1) Bit_rate_val = ['free',8,16,24,32,40,48,56,64,80,96,112,128,144,160,'bad'][Bit_rate];
        }

        var Frequency_val
        if (Version==3) Frequency_val = [44100,48000,32000,'reserved'][Frequency]
        if (Version==2) Frequency_val = [22050,24000,16000,'reserved'][Frequency]
        if (Version==0) Frequency_val = [11025,12000,8000,'reserved'][Frequency]
        
        //console.log('Bit_rate_val:',Bit_rate_val,'Kbit','Frequency_val:',Frequency_val,'Hz')
        
        
        //헤더파일 길이만큼 증가.
        pp+=4;
        
        //CRC 확인. 프레임의 오류를 검사하기 위한 데이터
        if (Error_Protection==0) pp+=2;
        

        //사이드 인포메이션(Side information) 
        if (Version==3){//Version: MPEG 1

            var main_data_begin = bf2num_bit(file, p+pp, 0, 9);
            if (Channel_Mode==3){ //모노.
                var scfsi = [bf2num_bit(file, p+pp, 14, 4)]
                
                var nch = 1 //체널의 수. MP3.js에 있어서..
                //20 - 138
                var granule_1 = [Granule(18)]
                var granule_2 = [Granule(77)]

                pp+=17;
            }else{// 스테리오
                var nch = 2 //체널의 수. MP3.js에 있어서..
                //12
                tmp_fn = x=>[(x>>3)&1,(x>>2)&1,(x>>1)&1,x&1]
                var scfsi = [tmp_fn(bf2num_bit(file, p+pp, 12, 4)), tmp_fn(bf2num_bit(file, p+pp, 16, 4))]
                //20 - 138
                var granule_1 = [Granule(20), Granule(79)]
                //138-
                var granule_2 = [Granule(138), Granule(197)]

                pp+=32;
            }
        }

        function Granule(st_bit){
            granule={
                part2_3_length: bf2num_bit(file, p+pp, st_bit, 12),
                big_values: bf2num_bit(file, p+pp, st_bit+12, 9),
                global_gain: bf2num_bit(file, p+pp, st_bit+12+9, 8),
                scalefac_compress: bf2num_bit(file, p+pp, st_bit+12+9+8, 4),
                window_switching_flag: bf2num_bit(file, p+pp, st_bit+12+9+8+4, 1),
                preflag: bf2num_bit(file, p+pp, st_bit+56, 1),
                scalefac_scale: bf2num_bit(file, p+pp, st_bit+57, 1),
                count1table_select: bf2num_bit(file, p+pp, st_bit+58, 1),
            }

            if (granule.window_switching_flag ==1){
                granule.block_type = bf2num_bit(file, p+pp, st_bit+34, 2)
                granule.mixed_block_flag = bf2num_bit(file, p+pp, st_bit+34+2, 1)
                //granule.table_select = bf2num_bit(file, p+pp, st_bit+34+2+1, 10)
                //granule.table_select = bf2num_bit(file, p+pp, st_bit+37, 10)
                granule.table_select = [bf2num_bit(file, p+pp, st_bit+37, 5), bf2num_bit(file, p+pp, st_bit+37+5, 5) ]
                granule.subblock_gain = bf2num_bit(file, p+pp, st_bit+34+13, 9)
            } else{
                //granule.table_select = bf2num_bit(file, p+pp, st_bit+34, 15)
                granule.table_select = [bf2num_bit(file, p+pp, st_bit+34, 5), bf2num_bit(file, p+pp, st_bit+34+5, 5), bf2num_bit(file, p+pp, st_bit+34+10, 5)]
                //tttmp = p+pp+((st_bit+34)>>3)
                //console.log('ergt',p+pp,st_bit,granule.table_select, tttmp , file[p+tttmp],file[tttmp+1])
                granule.region0_count = bf2num_bit(file, p+pp, st_bit+34+15, 4)
                granule.region1_count = bf2num_bit(file, p+pp, st_bit+34+19, 3)
                
            }
            return granule
        }
        //https://github.com/audiocogs/mp3.js 따라하기

        //console.log('main_data_begin',main_data_begin)
        //console.log('scfsi',scfsi)
        //console.log('granule_1',granule_1)
        //console.log('granule_2',granule_2)
        //if (frame_cnt>1000) return;

        //Bit rate: 1초당 용량.
        //AAU_size? 샘플 144개가 담긴 것 같다.
        var AAU_size = Math.floor(144*Bit_rate_val*1000/Frequency_val+Padding_bit)
        //console.log('AAU_size:',AAU_size);



        //maindata
        var Maindata = file.slice(p+pp,p+AAU_size)

        if (front_space.valid || end_space.valid){
            
            var tmp_fn = x=>[[granule_1[0][x],granule_1[1][x]],[granule_2[0][x],granule_2[1][x]]]
            var ScalefacCompress = tmp_fn('scalefac_compress')
            var WinSwitchFlag = tmp_fn('window_switching_flag')
            var Part2_3Length = tmp_fn('part2_3_length')
            
            var Region1Count = tmp_fn('region1_count')
            var BigValues = tmp_fn('big_values')
            var Count1TableSelect = tmp_fn('count1table_select')
            var Count1TableSelect = tmp_fn('count1table_select')
            var ScalefacScale = tmp_fn('scalefac_scale')
            var Preflag = tmp_fn('preflag')
            var GlobalGain = tmp_fn('global_gain')
            var BlockType = tmp_fn('block_type')
            var MixedBlockFlag = tmp_fn('mixed_block_flag')
            if (!granule_1.window_switching_flag) BlockType=[[0,0],[0,0]]
            var TableSelect = tmp_fn('table_select')

            var Region0Count = tmp_fn('region0_count')
            if(!Region0Count[0][0]){
                if (BlockType[0][0]==2 && MixedBlockFlag[0][0]==0){
                    Region0Count[0] = [8,8];
                    Region1Count[0] = [12,12];
                }else{
                    Region0Count[0] = [7,7];
                    Region1Count[0] = [13,13];
                }
                //console.log('안되늠...1',Region0Count,Region1Count)
            }if(!Region0Count[1][0]){
                if (BlockType[1][0]==2 && MixedBlockFlag[1][0]==0){
                    Region0Count[1] = [8,8];
                    Region1Count[1] = [12,12];
                }else{
                    Region0Count[1] = [7,7];
                    Region1Count[1] = [13,13];
                }
                //console.log('안되늠...2',Region0Count,Region1Count)
            }
            
            
            //console.log('Maindata',pp,Maindata.length,Maindata.slice(20))
            if (prev) prev.buf = Buffer.from(prev.buf).slice(prev.buf.length-main_data_begin, prev.buf.length)
            
            //if(pre_Maindata) console.log('---------------',Maindata,pre_Maindata,out,pre_Maindata.length-main_data_begin,pre_Maindata.length)
            out = maindata(Maindata.slice(), nch, prev, {
                samplingFrequency:Frequency,
                useMSStereo: Channel_Mode!=1 ? false : (Mode_Extension & 0x2) !== 0,
                useIntensityStereo: Channel_Mode!=1 ? false : (Mode_Extension & 0x1) !== 0,
            },
            {
                ScalefacCompress,
                WinSwitchFlag,
                Part2_3Length,
                Scfsi:scfsi,
                Region0Count,
                Region1Count,
                BigValues,
                Count1TableSelect,
                Count1:[[0,0],[0,0]],
                ScalefacScale,
                Preflag,
                GlobalGain,
                BlockType,
                TableSelect,
                main_data_begin,
                MixedBlockFlag
            },)

            //console.log('[out]',out.buf.length,out.buf.slice(0,80).toString())
            
            
            var tmp = x=> x&128 ? x-256:x
            var framdata = out.buf;
            //console.log(framdata)
            var v_max=0, v_min = 256
            var kk = Buffer.from(framdata)
            //console.log('[kk]',kk,kk.length)
            for(var i=0; i<kk.length;i++) {
                //console.log(kk[i])
                v_max = Math.max(tmp(kk[i]),v_max)
                v_min = Math.min(tmp(kk[i]),v_min)
            }

            //console.log(frame_cnt,'[v_max]',v_max,v_min)
            //if(frame_cnt%300==0) console.log('[mp3 파일 분석중]',frame_cnt)

            end_space.renew(frame_cnt, v_max)
            front_space.valid_check(frame_cnt, v_max)

            //console.log('\n\n=================================================\n\ncnt:',frame_cnt,)


        }

        end_space.valid_check(frame_cnt)
        out.buf = Maindata
        prev = out;
        p+=AAU_size;
        frame_cnt++;
    }

    var duration = frame_cnt*144/Frequency_val*8
    //console.log('frame_cnt',frame_cnt, '\nduration',duration)
    //console.log('front_space length',front_space.length,'time(sec)',front_space.length*144/Frequency_val*8)
    //console.log('end_space length',end_space.length,'time(sec)',end_space.length*144/Frequency_val*8)
    
    //console.log()
    //2.17배, 8배 차이남.

    return {
        file_len,
        duration:frame_cnt,
        frequency:Frequency_val,
        s:front_space.length,
        e:end_space.length,
    };
}



url = "../classic_01.mp3"
url = "12.mp3"
url = "스타워즈.mp3"
//console.log(url)
//console.log(Mp3_parse(fs.readFileSync(url),console.log))
