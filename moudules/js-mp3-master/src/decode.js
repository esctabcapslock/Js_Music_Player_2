var Frame = require('./frame');
var util = require('./util');
var consts = require('./consts');
var Frameheader = require('./frameheader');

const invalidLength = -1;

var Mp3 = {
    // Create new source object with specified ArrayBuffer
    newSource: function(buf) {
        var source = {
            buf: buf,
            pos: 0
        };

        /**
         * Seek the buffer position
         *
         * @param position
         * @param whence
         */
        source.seek = function (position) {
            if (position < 0 || position > source.buf.byteLength) {
                return {
                    err: "position not correct"
                }
            }
            source.pos = position;
            return {
                pos: source.pos
            };
        };

        source.readFull = function (length) {
            try {
                var l = Math.min(source.buf.byteLength - source.pos, length);
                //var buf = new Uint8Array(source.buf, source.pos, l);
                var buf = new Uint8Array(source.buf.slice(source.pos, source.pos+l));
                //console.log('[reqdfull]',source.buf.slice(0,10),'[buf.byteLength]',source.buf.byteLength, '[pos]',source.pos, source.buf.byteLength-source.pos,'[length]',length,'[l]',l)
                source.pos += buf.byteLength;
                //console.log('[preqdfull-source.pos]',source.pos)
                return {
                    buf: buf,
                    err: null
                };
            } catch (e) {
                return {
                    buf: null,
                    err: e.toString()
                }
            }
        };

        source.getPos = function () {
            if (source.pos > 3) {
                return source.pos - 3; // skip tags
            }
            return source.pos;
        };

        source.skipTags = function () {
            var result = source.readFull(3);
            if (result.err) {
                return {
                    err: result.err
                }
            }
            var buf = result.buf;

            // decode UTF-8
            var t = String.fromCharCode.apply(null, buf.slice(0,3));
            console.log('[String.fromCharCode.apply(null, buf.slice(0,3));]',t,buf.slice(0,3))
            switch (t) {
                case "TAG":
                    result = source.readFull(125);
                    if (result.err) {
                        return {
                            err: result.err
                        }
                    }
                    buf = result.buf;
                    break;
                case 'ID3':
                    // Skip version (2 bytes) and flag (1 byte)
                    console.log('[case ID3]')
                    result = source.readFull(3);
                    console.log('[source.readFull(3);]',result)
                    if (result.err) {
                        return {
                            err: result.err
                        }
                    }

                    result = source.readFull(4);
                    if (result.err) {
                        return {
                            err: result.err
                        }
                    }
                    buf = result.buf;
                    console.log('[data not enough -before]',result)
                    if (buf.byteLength !== 4) {
                        return {
                            err: "data not enough."
                        };
                    }
                    var size = (((buf[0] >>> 0) << 21) >>> 0) | (((buf[1] >>> 0) << 14) >>> 0) | (((buf[2] >>> 0) << 7) >>> 0) | (buf[3] >>> 0);
                    result = source.readFull(size);
                    if (result.err) {
                        return {
                            err: result.err
                        }
                    }
                    buf = result.buf;
                    break;
                default:
                    source.unread(buf);
                    break;
            }
            return {};
        };

        source.unread = function (buf) {
            source.pos -= buf.byteLength
        };

        source.rewind = function() {
            source.pos = 0;
        };

        return source;
    },

    newDecoder: function (buf) {
        var s = Mp3.newSource(buf);

        var decoder = {
            source: s,
            sampleRate: 0,
            frame: null,
            frameStarts: [],
            buf: null,
            pos: 0,
            length: invalidLength,
            my_cnt:0, //내가 임의로 추가함.
        };

        // ======= Methods of decoder :: start =========
        decoder.readFrame = function () {
            var result = Frame.read(decoder.source, decoder.source.pos, decoder.frame);
            if (result.err) {
                return {
                    err: result.err
                }
            }
            decoder.frame = result.f;
            //console.log('[decoder.frame - 마지막 디코드 직전 데이터]',decoder.frame.mainDataBits.vec)
            var pcm_buf = decoder.frame.decode();
            console.log('[decoder.frame - 디코드 후 데이터]',pcm_buf.buffer)
            decoder.buf = util.concatBuffers(decoder.buf, pcm_buf);
            console.log('\n\n=================================================\n\ncnt',decoder.my_cnt)
            if (decoder.my_cnt>2)throw{};
            decoder.my_cnt++;
            return {};
        };

        decoder.decode = function () {
            var result;
            while(true) {
                result = decoder.readFrame();
                if (result.err) {
                    break;
                }
            }
            return decoder.buf;
        };

        decoder.ensureFrameStartsAndLength = function () {
            if (decoder.length !== invalidLength) {
                return {}
            }

            var pos = decoder.source.pos;

            decoder.source.rewind();

            var r = decoder.source.skipTags();
            if (r.err) {
                return {
                    err: r.err
                }
            }

            var l = 0;
            while(true) {
                var result = Frameheader.read(decoder.source, decoder.source.pos);
                if (result.err) {
                    if (result.err.toString().indexOf("UnexpectedEOF") > -1) {
                        break;
                    }
                    return {
                        err: result.err
                    };
                }
                decoder.frameStarts.push(result.position);
                l += consts.BytesPerFrame;

                result = decoder.source.readFull(result.h.frameSize() - 4); // move to next frame position
                if (result.err) {
                    break;
                }
            }
            decoder.length = l;

            var result = decoder.source.seek(pos); // reset to beginning position
            if (result.err) {
                return result;
            }

            return {};
        };
        // ======= Methods of decoder :: end =========

        var r = s.skipTags();
        console.log('result - r',r,r && r.err)
        if (r && r.err) {
            return null;
        }
        
        var result = decoder.readFrame();
        console.log('result - r2',result)
        if (result.err) {
            return null;
        }

        decoder.sampleRate = decoder.frame.samplingFrequency();

        result = decoder.ensureFrameStartsAndLength();
        if (result.err) {
            
            return null;
        }

        return decoder;
    }
};

module.exports = Mp3;
