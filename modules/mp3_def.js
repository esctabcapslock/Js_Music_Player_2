"use strict";
// https://www.codeproject.com/articles/8295/mpeg-audio-frame-header
// 임의의 프레임으로 자른다 -> 노래가 정확하게 안짤리는 문제가 있어.
// 넉넉하게 앞뒤로 자른다?
Object.defineProperty(exports, "__esModule", { value: true });
exports.frameHeaderParsing = exports.FrameLengthInBytes = exports.Channel_Mode = exports.Padding_bit = exports.Sampling_rate_frequency_parser = exports.Bitrate_index_parser = exports.Protection_bit = exports.Layer = exports.MPEG_Version = void 0;
// frame_header관련
var MPEG_Version;
(function (MPEG_Version) {
    MPEG_Version[MPEG_Version["MPEG_2_5"] = 0] = "MPEG_2_5";
    MPEG_Version[MPEG_Version["reserved"] = 1] = "reserved";
    MPEG_Version[MPEG_Version["MPEG_2"] = 2] = "MPEG_2";
    MPEG_Version[MPEG_Version["MPEG_1"] = 3] = "MPEG_1";
})(MPEG_Version = exports.MPEG_Version || (exports.MPEG_Version = {}));
// Layer description
var Layer;
(function (Layer) {
    Layer[Layer["reserved"] = 0] = "reserved";
    Layer[Layer["Layer_III"] = 1] = "Layer_III";
    Layer[Layer["Layer_II"] = 2] = "Layer_II";
    Layer[Layer["Layer_I"] = 3] = "Layer_I";
})(Layer = exports.Layer || (exports.Layer = {}));
var Protection_bit;
(function (Protection_bit) {
    Protection_bit[Protection_bit["Protected_by_CRC"] = 0] = "Protected_by_CRC";
    Protection_bit[Protection_bit["Not_protected"] = 1] = "Not_protected";
})(Protection_bit = exports.Protection_bit || (exports.Protection_bit = {}));
/**
 * 주파수를 반환한다.
 */
const Bitrate_index_parser = (MPEG_version, layer, bitrate_index) => {
    // Bitrate_index는 0~16 사이여야한다.
    if (bitrate_index < 0 || bitrate_index > 15)
        throw ("잘못된 index");
    const FREE = NaN;
    const BAD = NaN;
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
    ];
    const freq = Bitrate_index_Table[bitrate_index][(() => {
        if (MPEG_version == MPEG_Version.MPEG_1) {
            switch (layer) {
                case Layer.Layer_I: return 0;
                case Layer.Layer_II: return 1;
                case Layer.Layer_III: return 2;
                default: throw ('잘못된 Layer');
            }
        }
        else if (MPEG_version == MPEG_Version.MPEG_2 ||
            MPEG_version == MPEG_Version.MPEG_2_5) {
            switch (layer) {
                case Layer.Layer_I: return 3;
                case Layer.Layer_II: return 4;
                case Layer.Layer_III: return 4;
                default: throw ('잘못된 Layer');
            }
        }
        else {
            throw ('잘못된 MPEG_Version');
        }
    })()];
    return freq;
};
exports.Bitrate_index_parser = Bitrate_index_parser;
const Sampling_rate_frequency_parser = (MPEG_version, sampling_index) => {
    if (sampling_index < 0 || sampling_index > 3)
        throw ("잘못된 index");
    const reserv = NaN;
    const Sampling_rate_frequency_table = [
        [44100, 22050, 11025],
        [48000, 24000, 12000],
        [32000, 16000, 8000],
        [reserv, reserv, reserv],
    ];
    const freq = Sampling_rate_frequency_table[sampling_index][(() => {
        switch (MPEG_version) {
            case MPEG_Version.MPEG_1: return 0;
            case MPEG_Version.MPEG_2: return 1;
            case MPEG_Version.MPEG_2_5: return 2;
            default: throw ("잘못된 MPEG_Version");
        }
    })()];
    return freq;
};
exports.Sampling_rate_frequency_parser = Sampling_rate_frequency_parser;
var Padding_bit;
(function (Padding_bit) {
    Padding_bit[Padding_bit["not_padded"] = 0] = "not_padded";
    Padding_bit[Padding_bit["padded"] = 1] = "padded"; //frame is padded with one extra slot
})(Padding_bit = exports.Padding_bit || (exports.Padding_bit = {}));
var Channel_Mode;
(function (Channel_Mode) {
    Channel_Mode[Channel_Mode["Stereo"] = 0] = "Stereo";
    Channel_Mode[Channel_Mode["Joint_stereo"] = 1] = "Joint_stereo";
    Channel_Mode[Channel_Mode["Dual_channel"] = 2] = "Dual_channel";
    Channel_Mode[Channel_Mode["Single_channel"] = 3] = "Single_channel"; // (Mono)
})(Channel_Mode = exports.Channel_Mode || (exports.Channel_Mode = {}));
const FrameLengthInBytes = (MPEG_version, layer, bitRate, samplingRate, padding) => {
    switch (layer) {
        case Layer.Layer_I: return Math.floor((12 * bitRate * 1000 / samplingRate + padding) * 4);
        default: return Math.floor(144 * bitRate * 1000 / samplingRate + padding);
    }
};
exports.FrameLengthInBytes = FrameLengthInBytes;
function convertToEnum(enumObj, value) {
    const enumValues = Object.values(enumObj);
    if (enumValues.includes(value)) {
        return value;
    }
    return undefined;
}
function getEnumName(enumObj, value) {
    const enumKeys = Object.keys(enumObj).filter(key => typeof enumObj[key] === "number");
    const enumValues = enumKeys.map(key => enumObj[key]);
    const index = enumValues.indexOf(value);
    if (index !== -1) {
        return enumKeys[index];
    }
    return undefined;
}
function frameHeaderParsing(file, p) {
    // console.log('[frameHeaderParsing]', p, `0x${p.toString(16)}`)
    if (file[p] != 0xFF) {
        console.log('해더가 아님!');
        throw ("헤더 아님 이상함.");
    }
    const version_bit = (file[p + 1] >> 3) & 3;
    const layer_bit = (file[p + 1] >> 1) & 3;
    const bit_rate_bit = file[p + 2] >> 4;
    const frequency_bit = (file[p + 2] >> 2) & 3;
    const padding_bit = (file[p + 2] >> 1) & 1;
    // console.table({bit_rate_bit, frequency_bit})
    const MPEG_version = convertToEnum(MPEG_Version, version_bit);
    const layer = convertToEnum(Layer, layer_bit);
    const bit_rate = (0, exports.Bitrate_index_parser)(MPEG_version, layer, bit_rate_bit);
    const samplingRate = (0, exports.Sampling_rate_frequency_parser)(MPEG_version, frequency_bit);
    const padding = convertToEnum(Padding_bit, padding_bit);
    const frameLengthInBytes = (0, exports.FrameLengthInBytes)(MPEG_version, layer, bit_rate, samplingRate, padding);
    const duraction = 144 * 8 / samplingRate;
    const headerInfo = {
        p: `0x${p.toString(16)}`,
        MPEG_version_name: getEnumName(MPEG_Version, MPEG_version),
        layer_name: getEnumName(Layer, layer),
        padding: getEnumName(Padding_bit, padding)
    };
    return Object.assign({ MPEG_version, layer, bit_rate, samplingRate, padding, frameLengthInBytes, duraction }, headerInfo);
}
exports.frameHeaderParsing = frameHeaderParsing;
