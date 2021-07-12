module.exports.ID3v2_parse = ID3v2_parse;
function ID3v2_parse(file, callback){ // 파일 버퍼, 콟백
    let info={
        '제목':'',
        '가수':'',
        '엘범':'',
        '가사':'',
        '트렉':'',
        '연도':'',
        '장르':'',
        '엘범아트':'',
    };

    const bf2chr = (bf,start,len, encoding)=>{
        if(start<0) return undefined;
        var b=Buffer.alloc(len);
        for (var i=0; i<len; i++) b[i]=bf[start+i];
        return b.toString(encoding?encoding:'utf8');
    }

    const bf2num=(bf,start, len, encodinged)=>{
        var out=0;
        for(var i=0; i<len; i++){
            out*=(1<<(encodinged?7:8)) // Encoding된 값이라 최상위 비트 제거.
            out+=bf[start+i]
        }
        return out;
    }

    //https://clansim.tistory.com/99 : ID3v2의 구조임.
    //https://id3.org/id3v2.3.0 : 공식문서. 결국...
    //https://help.mp3tag.de/main_tags.html : Tag fields 설명.

    //ID3v2 헤더(10 bytes)
    /*
    ==========================================================
    0-2(3)               Tag Identifier (ID3가 적힌다)
    3-4 (2)              Tag Version.
    5(1)                  Flags
    6-9(4)               Size of Tag (Tag의 사이즈)
    ==========================================================
    */

    var Tag_Identifier  = bf2chr(file,0,3);
    var Tag_Version = [file[3], file[4]];
    var Flags = file[5];
    var Size_of_Tag = bf2num(file,6,4,true)
    console.log('Tag_Identifier:',Tag_Identifier)
    console.log('Tag_Version:','ID3v2.'+Tag_Version.join('.'))
    //console.log('Flags:',Flags)
    //console.log('Size_of_Tag:',Size_of_Tag) // 헤더 길이(10) 미포함.

    //프레임 찾기.
    var p=10
    while(p<Size_of_Tag+10){
        if(file[p]==0){
            //console.log('끝난 것으로 간주. 포인터는',p);
            break;
        }

        /*
        =============================
        - Header
        Byte  Content
        0-3    Frame identifier
        4-7    Size
        8-9   Flags
        =============================
        */

        let Frame_identifier = bf2chr(file,p,4);
        let Size = bf2num(file,p+4,4, Tag_Version[0]==4); // 3버전은 인코딩 x, 4버전은 인코딩 o ;;;; (by 직관)
        let Flags = bf2num(file,p+8,2);
        /*
        console.log('')
        console.log('프레임_위치, p',p)
        console.log('Frame_identifier:',Frame_identifier)
        console.log('Size:',Size)
        console.log('Flags:',Flags)
        */
        p+=10;

        //Text information frames
        if(Frame_identifier[0]=='T'){
            let Text_encoding = file[p];
            if(Text_encoding==1){//유니코드
                var text = bf2chr(file,p+1,Size-1,'utf16le');
            }
            else{
                //console.log('T -> 지원하기 귀찮은 문자열 인코딩, ISO-8859-1. 대부분 영어+숫자니 일단 utf8로 인코딩함.')
                text=bf2chr(file,p+1,Size-1);
            }
                
            text=text.replace(/[\u0000-\u0008]|[\u000b-\u001f]/g,'').trim(); // 이상한거 제거. 사이 '\n'과 '\t' 제거함.
            //console.log(text)
            if(text){
                if (Frame_identifier=='TIT2') info.제목=text;
                else if (Frame_identifier=='TPE2' || Frame_identifier=='TPE1') info.가수=text.split('/');
                else if (Frame_identifier=='TALB') info.엘범=text;
                else if (Frame_identifier=='TRCK') info.트렉 = Number(text);
                else if (Frame_identifier=='TYER' || Frame_identifier=='TDRC') info.연도 = Number(text);
                else if (Frame_identifier=='TCON') info.장르=text;
            }
        }

        //Unsychronised lyrics/text transcription
        else if(Frame_identifier=='USLT'){
            let Text_encoding = file[p];
            let Language = bf2chr(file,p+1,3);
            
            //console.log('Text_encoding:',Text_encoding)
            //console.log('Language',Language)
            if(Text_encoding==1) {//유니코드
                var text = bf2chr(file,p+4,Size-4,'utf16le');
                info.가사=text.replace(/[\u0000-\u0008]|[\u000b-\u001f]/g,'');
            }
            //else console.log('지원하기 귀찮은 문자열 인코딩, ISO-8859-1')
        }

        //Attached picture
        else if(Frame_identifier=='APIC'){
            let Text_encoding = file[p];
            let i = 0;
            for(;file[p+1+i];i++);
            let MIME_type = bf2chr(file,p+1, i);
            let Picture_type = file[p+1+i+1]
            let j = 0;
            for(;file[p+1+i+2+j]; j++);
            let Description = bf2chr(file,p+1+i+2, j);
            let Picture_data = Buffer.alloc(Size-(1+i+2+j+1));
            for (let k=0; k<Size-(1+i+2+j+1); k++) Picture_data[k]=file[p+1+i+2+j+1+k]

            info.엘범아트 = {
                'MIME_type':MIME_type,
                'Description':Description,
                'Picture_data': Picture_data,
            }
            //console.log('Text_encoding:',Text_encoding)
            //console.log('MIME_type',MIME_type)
            //console.log('Description',Description)
            //console.log('Picture_data',Picture_data)
        }
        p+=Size;
    }
    callback(info);
}

/*fs.readFile(url,null,(E,file)=>{
    ID3v2_parse(file,(v)=>{
        console.log(v)
    });
})
*/