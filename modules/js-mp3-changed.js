var util = require('./js-mp3-master/src/util');
var consts = require('./js-mp3-master/src/consts');
var huffman = require('./js-mp3-master/src/huffman');
var bits = require('./js-mp3-master/src/bits');
var frame = require('./js-mp3-master/src/frame-changed');

module.exports.maindata = maindata;


var createNew =  function () {
    // A MainData is MPEG1 Layer 3 Main Data.
    var mainData = {
    };

    util.init3dArray(mainData, 'ScalefacL', 2, 2, 22);      // 0-4 bits
    util.init4dArray(mainData, 'ScalefacS', 2, 2, 13, 3);   // 0-4 bits
    util.init3dArray(mainData, 'Is', 2, 2, 576);            // Huffman coded freq. lines

    return mainData;
}

var readHuffman = function (m, header, sideInfo, mainData, part_2_start, gr, ch) {
    if(!sideInfo.Region0Count[1][0]) console.log('[l - up]',l,j,sideInfo)
    //if(gr+ch==0)console.log('[mainData-readHuffman]',gr, ch,mainData.Is[0][0]);
    // Check that there is any data to decode. If not, zero the array.
    if (sideInfo.Part2_3Length[gr][ch] === 0) {
        for (var i = 0; i < consts.SamplesPerGr; i++) {
            mainData.Is[gr][ch][i] = 0.0;
        }
        return null;
    }

    // Calculate bit_pos_end which is the index of the last bit for this part.
    var bit_pos_end = part_2_start + sideInfo.Part2_3Length[gr][ch] - 1;
    // Determine region boundaries
    var region_1_start = 0;
    var region_2_start = 0;


    if ((sideInfo.WinSwitchFlag[gr][ch] === 1) && (sideInfo.BlockType[gr][ch] === 2)) {
        region_1_start = 36;                  // sfb[9/3]*3=36
        region_2_start = consts.SamplesPerGr; // No Region2 for short block case.
    } else {
        var sfreq = header.samplingFrequency;
        var l = consts.SfBandIndicesSet[sfreq].L;
        var i = sideInfo.Region0Count[gr][ch] + 1;
        if (i < 0 || util.len(l) <= i) {
            // TODO: Better error messages (#3)
            return "mp3: readHuffman failed: invalid index i: " + i;
        }
        region_1_start = l[i];
        var j = sideInfo.Region0Count[gr][ch] + sideInfo.Region1Count[gr][ch] + 2;
        if (j < 0 || util.len(l) <= j) {
            // TODO: Better error messages (#3)
            return "mp3: readHuffman failed: invalid index j: " + j;
        }
        region_2_start = l[j];
        if(!region_1_start) console.log('[l]',l,j,sideInfo)
    }
    // Read big_values using tables according to region_x_start
    for (var is_pos = 0; is_pos < sideInfo.BigValues[gr][ch]*2; is_pos++) {
        // #22
        //if (is_pos >= util.len(mainData.Is[gr][ch])) {
        //    return "mp3: is_pos was too big: " + is_pos;
        //}
        var table_num = 0;
        if (is_pos < region_1_start) {
            table_num = sideInfo.TableSelect[gr][ch][0];
        } else if (is_pos < region_2_start) {
            table_num = sideInfo.TableSelect[gr][ch][1];
        } else {
            table_num = sideInfo.TableSelect[gr][ch][2];
        }
        // Get next Huffman coded words
        //if(!table_num) console.log('table_num',table_num,sideInfo.TableSelect, gr,ch,is_pos, region_1_start, region_2_start)
        var result = huffman.decode(m, table_num);
        if (result.err) {
            return err;
        }
        // In the big_values area there are two freq lines per Huffman word
        mainData.Is[gr][ch][is_pos] =result .x;
        //if(gr==0&& ch==0) console.log('mainData.Is['+gr+']['+ch+']['+is_pos+'] = '+result.x+';',)
        is_pos++;
        mainData.Is[gr][ch][is_pos] = result.y;
        //if(gr==0&& ch==0) console.log('mainData.Is['+gr+']['+ch+']['+is_pos+'] = '+result.y+';',)
    }

    //console.log('[mainData-readHuffman-middle]',gr, ch,mainData.Is);
    // Read small values until is_pos = 576 or we run out of huffman data
    // TODO: Is this comment wrong?
    var table_num = sideInfo.Count1TableSelect[gr][ch] + 32;
    var is_pos = sideInfo.BigValues[gr][ch] * 2;
    for (;is_pos <= 572 && m.BitPos() <= bit_pos_end;) {
        // Get next Huffman coded words
        var result = huffman.decode(m, table_num);
        if (result.err) {
            return err;
        }
        mainData.Is[gr][ch][is_pos] = result.v;
        is_pos++;
        if (is_pos >= consts.SamplesPerGr) {
            break;
        }
        mainData.Is[gr][ch][is_pos] = result.w;
        is_pos++;
        if (is_pos >= consts.SamplesPerGr) {
            break;
        }
        mainData.Is[gr][ch][is_pos] = result.x;
        is_pos++;
        if (is_pos >= consts.SamplesPerGr) {
            break;
        }
        mainData.Is[gr][ch][is_pos] = result.y;
        is_pos++;
    }
    // Check that we didn't read past the end of this section
    if (m.BitPos() > (bit_pos_end + 1)) {
        // Remove last words read
        is_pos -= 4;
    }

    // Setup count1 which is the index of the first sample in the rzero reg.
    sideInfo.Count1[gr][ch] = is_pos;

    // Zero out the last part if necessary
    for (;is_pos < consts.SamplesPerGr;) {
        mainData.Is[gr][ch][is_pos] = 0.0;
        is_pos++;
    }
    // Set the bitpos to point to the next part to read
    m.SetPos(bit_pos_end + 1);
    return null;
}

function maindata(maindata,nch, prev, fh, si){
    ////// maindata.js //////////
    var scalefacSizes = [
        [0, 0], [0, 1], [0, 2], [0, 3], [3, 0], [1, 1], [1, 2], [1, 3],
        [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 3], [4, 2], [4, 3]
    ];

    var buf = maindata
    var vec = prev?prev.buf:prev
    var b = bits.createNew(util.concatBuffers(new Uint8Array(vec), new Uint8Array(buf.slice()).buffer))

    //console.log('[maindata.js > read  - 갓 읽은 데이터]',buf.length, '+',vec?vec.length:vec,buf)
    //console.log('[maindata.js > read(big)  - 합친 데이터]',b.vec.byteLength, b, )
    //console.log('jjjk',b,'k;',vec,buf)
    //console.log('[maindata]: b',b)
    var md = createNew();
    
    
    for (var gr = 0; gr < 2; gr++) {
        for (var ch = 0; ch < nch; ch++) {
            var part_2_start = b.BitPos();
            // Number of bits in the bitstream for the bands
            var slen1 = scalefacSizes[si.ScalefacCompress[gr][ch]][0];
            var slen2 = scalefacSizes[si.ScalefacCompress[gr][ch]][1];
            if (si.WinSwitchFlag[gr][ch] === 1 && si.BlockType[gr][ch] === 2) {
                if (si.MixedBlockFlag[gr][ch] !== 0) {
                    for (var sfb = 0; sfb < 8; sfb++) {
                        md.ScalefacL[gr][ch][sfb] = b.Bits(slen1)
                    }
                    for (var sfb = 3; sfb < 12; sfb++) {
                        //slen1 for band 3-5,slen2 for 6-11
                        var nbits = slen2;
                        if (sfb < 6) {
                            nbits = slen1;
                        }
                        for (var win = 0; win < 3; win++) {
                            md.ScalefacS[gr][ch][sfb][win] = b.Bits(nbits);
                        }
                    }
                } else {
                    for (var sfb = 0; sfb < 12; sfb++) {
                        //slen1 for band 3-5,slen2 for 6-11
                        var nbits = slen2;
                        if (sfb < 6) {
                            nbits = slen1;
                        }
                        for (var win = 0; win < 3; win++) {
                            md.ScalefacS[gr][ch][sfb][win] = b.Bits(nbits);
                        }
                    }
                }
            } else {
                // Scale factor bands 0-5
                if (si.Scfsi[ch][0] === 0 || gr === 0) {
                    for (var sfb = 0; sfb < 6; sfb++) {
                        md.ScalefacL[gr][ch][sfb] = b.Bits(slen1);
                    }
                } else if (si.Scfsi[ch][0] === 1 && gr === 1) {
                    // Copy scalefactors from granule 0 to granule 1
                    // TODO: This is not listed on the spec.
                    for (var sfb = 0; sfb < 6; sfb++) {
                        md.ScalefacL[1][ch][sfb] = md.ScalefacL[0][ch][sfb];
                    }
                }
                // Scale factor bands 6-10
                if (si.Scfsi[ch][1] === 0 || gr === 0) {
                    for (var sfb = 6; sfb < 11; sfb++) {
                        md.ScalefacL[gr][ch][sfb] = b.Bits(slen1);
                    }
                } else if (si.Scfsi[ch][1] === 1 && gr === 1) {
                    // Copy scalefactors from granule 0 to granule 1
                    for (var sfb = 6; sfb < 11; sfb++) {
                        md.ScalefacL[1][ch][sfb] = md.ScalefacL[0][ch][sfb];
                    }
                }
                // Scale factor bands 11-15
                if (si.Scfsi[ch][2] === 0 || gr === 0) {
                    for (var sfb = 11; sfb < 16; sfb++) {
                        md.ScalefacL[gr][ch][sfb] = b.Bits(slen2);
                    }
                } else if (si.Scfsi[ch][2] === 1 && gr === 1) {
                    // Copy scalefactors from granule 0 to granule 1
                    for (var sfb = 11; sfb < 16; sfb++) {
                        md.ScalefacL[1][ch][sfb] = md.ScalefacL[0][ch][sfb];
                    }
                }
                // Scale factor bands 16-20
                if (si.Scfsi[ch][3] === 0 || gr === 0) {
                    for (var sfb = 16; sfb < 21; sfb++) {
                        md.ScalefacL[gr][ch][sfb] = b.Bits(slen2);
                    }
                } else if (si.Scfsi[ch][3] === 1 && gr === 1) {
                    // Copy scalefactors from granule 0 to granule 1
                    for (var sfb = 16; sfb < 21; sfb++) {
                        md.ScalefacL[1][ch][sfb] = md.ScalefacL[0][ch][sfb];
                    }
                }
            }
            
            var err = readHuffman(b, fh, si, md, part_2_start, gr, ch);
            if (err) {
                return {
                    v: null,
                    bits: null,
                    err: err
                }
            }
        }
    }
    //console.log('[maindata]: md.Is',md.Is[0][0])
    //console.log(si.TableSelect)
    //console.log('[b]',b);
    var result =  {
        v: md,
        bits: b,
        err: null
    }


    ////// frame.js  >   read: function (source, position, prev) {///////////

    //console.log('chn-1    ',result.v, result.bits)
    //console.log('[frame.js > read  - 읽고 허프만한 데이터]',result.bits.vec)
    var f = frame.createNew(fh, si, result.v, result.bits);
    //console.log('[frame.js  >   read - chn    ]',f)
    if (prev) {
        f.store = prev.store;
        f.v_vec = prev.v_vec;
    }

    /*return {
        f: f,
        position: pos,
        err: null
    };*/
    var pcm_buf = f.decode(nch)
    //console.log('[decoder.frame - 디코드 후 데이터]',pcm_buf.buffer)
    return {
        buf:pcm_buf,
        store:f.store,
        v_vec:f.v_vec
    }

}




    