// https://www.codeproject.com/articles/8295/mpeg-audio-frame-header
// 임의의 프레임으로 자른다 -> 노래가 정확하게 안짤리는 문제가 있어.
// 넉넉하게 앞뒤로 자른다?

// frame_header관련
export enum MPEG_Version{
    MPEG_2_5= 0, // 비공식 표준
    reserved= 1,
    MPEG_2= 2, //ISO/IEC 13818-3
    MPEG_1= 3, //ISO/IEC 11172-3

}

// Layer description
export enum Layer{
    reserved=0,
    Layer_III = 1,
    Layer_II = 2,
    Layer_I = 3
}

export enum Protection_bit{
    Protected_by_CRC = 0, //(16bit crc follows header)
    Not_protected = 1 
}

/**
 * 주파수를 반환한다.
 */
export const Bitrate_index_parser = (MPEG_version: MPEG_Version, layer: Layer, bitrate_index: number) => {
    // Bitrate_index는 0~16 사이여야한다.
    if (bitrate_index<0 || bitrate_index>15) throw("잘못된 index")
    const FREE = NaN
    const BAD = NaN
    const Bitrate_index_Table = [
        [FREE, FREE, FREE, FREE, FREE],
        [32, 32, 32, 32, 8],
        [64, 48, 40, 48, 16],
        [96, 56, 48, 56, 24],
        [128, 64, 56, 64, 32],
        [160, 80, 64, 80, 40],
        [192, 96, 80, 96, 48],
        [224, 112, 96, 112, 56],
        [256, 128, 112, 128, 64],
        [288, 160, 128, 144, 80],
        [320, 192, 160, 160, 96],
        [352, 224, 192, 176, 112],
        [384, 256, 224, 192, 128],
        [416, 320, 256, 224, 144],
        [448, 384, 320, 256, 160],
        [BAD, BAD, BAD, BAD, BAD],
    ]
    const freq = Bitrate_index_Table[bitrate_index][(()=>{
        if (MPEG_version == MPEG_Version.MPEG_1){
            switch (layer){
                case Layer.Layer_I: return 0;
                case Layer.Layer_II: return 1;
                case Layer.Layer_III: return 2;
                default: throw('잘못된 Layer')
            }
        }else if (MPEG_version == MPEG_Version.MPEG_2 || 
            MPEG_version == MPEG_Version.MPEG_2_5){
            switch (layer){
                case Layer.Layer_I: return 3;
                case Layer.Layer_II: return 4;
                case Layer.Layer_III: return 4;
                default: throw('잘못된 Layer')
            }
        }else{
            throw('잘못된 MPEG_Version')
        }
    })()]

    return freq
}

export const Sampling_rate_frequency_parser = (MPEG_version: MPEG_Version, sampling_index: number )=>{
    if (sampling_index<0 || sampling_index>3) throw("잘못된 index")

    const reserv = NaN
    const Sampling_rate_frequency_table = [
        [44100, 22050, 11025],
        [48000, 24000, 12000],
        [32000, 16000, 8000],
        [reserv, reserv, reserv],
    ]
    const freq = Sampling_rate_frequency_table[sampling_index][(()=>{
        switch (MPEG_version){
            case MPEG_Version.MPEG_1: return 0;
            case MPEG_Version.MPEG_2: return 1;
            case MPEG_Version.MPEG_2_5: return 2;
            default: throw("잘못된 MPEG_Version")
        }
    })()]
    return freq
}
export enum Padding_bit{
    not_padded = 0,
    padded = 1 //frame is padded with one extra slot
}

export enum Channel_Mode{
    Stereo = 0,
    Joint_stereo = 1,// (Stereo)
    Dual_channel = 2, // (Stereo)
    Single_channel = 3 // (Mono)
}

export const FrameLengthInBytes = (MPEG_version: MPEG_Version,  layer: Layer, bitRate:number, samplingRate: number, padding:Padding_bit )=>{
    switch (layer){
        case Layer.Layer_I: return Math.floor((12 * bitRate * 1000 / samplingRate + padding) * 4 ) 
        default: return Math.floor(144 * bitRate * 1000 / samplingRate + padding ) 
    } 
}


function convertToEnum<T>(enumObj: T, value: number): T[keyof T] | undefined {
    const enumValues = Object.values(enumObj) as Array<number>;
    if (enumValues.includes(value)) {
      return value as T[keyof T];
    }
    return undefined;
}

function getEnumName(enumObj: any, value: number): string | undefined {
    const enumKeys = Object.keys(enumObj).filter(key => typeof enumObj[key] === "number") as string[];
    const enumValues = enumKeys.map(key => enumObj[key]);
    const index = enumValues.indexOf(value);
    if (index !== -1) {
      return enumKeys[index];
    }
    return undefined;
  }
  

export function frameHeaderParsing (file:Buffer, p:number){
    // console.log('[frameHeaderParsing]', p, `0x${p.toString(16)}`)
    if(file[p]!=0xFF){
        console.log('해더가 아님!')
        throw("헤더 아님 이상함.")
    }
    const version_bit = (file[p+1]>>3)&3
    const layer_bit = (file[p+1]>>1)&3
    const bit_rate_bit = file[p+2]>>4
    const frequency_bit = (file[p+2]>>2)&3
    const padding_bit = (file[p+2]>>1)&1

    // console.table({bit_rate_bit, frequency_bit})

    const MPEG_version = convertToEnum(MPEG_Version, version_bit)
    const layer = convertToEnum(Layer, layer_bit)
    const bit_rate:number = Bitrate_index_parser(MPEG_version, layer, bit_rate_bit)
    const samplingRate:number = Sampling_rate_frequency_parser(MPEG_version, frequency_bit)
    const padding = convertToEnum(Padding_bit, padding_bit)
    const frameLengthInBytes:number = FrameLengthInBytes(MPEG_version, layer, bit_rate, samplingRate, padding)
    const duraction:number = 144*8/samplingRate
    
    const headerInfo = {
        p:`0x${p.toString(16)}`,
        MPEG_version_name: getEnumName(MPEG_Version, MPEG_version),
        layer_name: getEnumName(Layer, layer),
        padding: getEnumName(Padding_bit, padding)
    };
    
    return {MPEG_version, layer, bit_rate, samplingRate, padding, frameLengthInBytes, duraction, ...headerInfo}  
}