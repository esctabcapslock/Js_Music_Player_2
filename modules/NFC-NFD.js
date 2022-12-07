
function NFD2NFC(input){
    const a=x=>'ᄀ'<=x&&x<='ᄒ'
    const b=x=>'ᅡ'<=x&&x<='ᅵ'
    const c=x=>'ᆨ'<=x&&x<='ᇂ'
    let output=''
    //12593: ㄱ (일반)
    //4352: ᄀ (초성)
    //4449: ᅡ
    for(var i=0; i<input.length; i++){
        if(!a(input[i])) output+=input[i];
        else if (a(input[i]) && !b(input[i+1])) {
            output += String.fromCharCode( 12593+(input[i].charCodeAt(0)-4352) )
        }
        else if(a(input[i]) && b(input[i+1]) && !c(input[i+2])){
            const aa=input[i].charCodeAt(0)-4352;
            const bb=input[i+1].charCodeAt(0)-4449;
            output +=  String.fromCharCode( 44032 + 588*aa +28*bb )
            //console.log(output, input[i], aa, bb)
            i+=1;
        }else{
            const aa=input[i].charCodeAt(0)-4352;
            const bb=input[i+1].charCodeAt(0)-4449;
            const cc=input[i+2].charCodeAt(0)-4520;
            
            output +=  String.fromCharCode( 44032 + 588*aa + 28*bb + cc + 1)
            //console.log(output, input[i], aa, bb, cc)
            
            i+=2;
        }
    }
    return output;
    }
    function NFC2NFD (input){
        const ko = x=>'가'<=x&&x<='힣'
        let output = input.split('').map(v=>{
            if (!ko(v)) return v;
            const a = v.charCodeAt(0) - 44032
            const aa = parseInt(a/588)
            const bb = parseInt(a/28)%21
            const cc = a%28
            console.log(aa,bb,cc)
            return String.fromCharCode(aa+4352)+String.fromCharCode(bb+4449)+(cc?String.fromCharCode(cc-1+4520):'')
        }).join('')
        return output
    }
    
    module.exports.NFD2NFC = NFD2NFC;
    module.exports.NFC2NFD = NFC2NFD;