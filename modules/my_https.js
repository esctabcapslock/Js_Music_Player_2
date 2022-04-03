const https = require('https');
const dns = require('dns');
const { resolve } = require('path');
const { rejects } = require('assert');
module.exports.my_https = my_https;

function my_https(url){return new Promise((resolve,rejects)=>{
        
    
    const my_ip = require('./my_ip').my_ip(); //할당된 ip가 없으면, 연결 안 된 거임!
    if(!my_ip || my_ip.length==0){
        rejects(undefined);
        return;
    }
    //console.log('my-http');
    //dns.resolve('map0.daumcdn.net', function (err, addr) {
    dns.resolve('www.melon.com', function (err, addr) {
        if (err) {
            console.log('네트워크 연결 안 됨');
            rejects('네트워크 연결 안 됨');
        }
        else {
            https.get(url, (res, err) => {
                if(err) console.log('resolve err', err);
                var data=[];
                res.on('error', () => {rejects(undefined) });
                res.on('data', (chunk) => { 
                    //console.log('ch')
                    //console.dir(chunk)
                    //console.log('\n\n\ndata--------------\n\n\n',data)
                    data.push(chunk) });
                res.on('end', () => { resolve( Buffer.concat(data)) });
            });
        }
    });
    
})}
