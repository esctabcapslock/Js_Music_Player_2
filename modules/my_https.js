const https = require('https');
const dns = require('dns')
module.exports.my_https = my_https;

function my_https(url,callback){
    //console.log('my-http');
    dns.resolve('map0.daumcdn.net', function (err, addr) {
        if (err) {
            console.log('네트워크 연결 안 됨');
            callback(undefined);
        }
        else {
            https.get(url, (res, err) => {
                if(err) console.log('resolve err', err);
                var data=[];
                res.on('error', () => {callback(undefined) });
                res.on('data', (chunk) => { 
                    //console.log('ch')
                    //console.dir(chunk)
                    //console.log('\n\n\ndata--------------\n\n\n',data)
                    data.push(chunk) });
                res.on('end', () => { callback( Buffer.concat(data)) });
            });
        }
    });
}
