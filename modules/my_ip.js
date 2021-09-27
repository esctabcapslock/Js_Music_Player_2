module.exports.my_ip=my_ip
function my_ip(){
var os = require('os');
var interfaces = os.networkInterfaces();
//console.log(interfaces)
var addresses = [];
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
        }
    }
}
return(addresses)
}