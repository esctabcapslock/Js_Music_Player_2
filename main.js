const File_list = require('./File_list.js').File_list
const Db = require('./Db.js').Db
const Db_log = require('./Db.js').Db_log
const argv = process.argv.slice(2)
// 힌트
if (argv.includes('h')){
    try{
    const README = require('fs').readFileSync('./README.MD').toString('utf8')
    console.log(README)
    }catch{}
    console.log('\n--------------------------------------------\n')
    console.log('더 자세한 정보는 https://github.com/esctabcapslock/Js_Music_Player_2 참조바람');
    return;
}

const mylog = ((flag)=>flag?console.log:()=>{})(argv.includes('l')||argv.includes('ㅣ'));
console.log('log',mylog)
Db.setlog(mylog) //Db 모듈에, mylog 함수를 설정하자.

Db_log.setting()
File_list.readsetting()
File_list.findfile(()=>{
    Db.isnone((flag)=>{
        console.log('db is none?',flag);
        //var ins_and_update = ()=>{ Db.music_insert(File_list.file_list, (updated_urls)=>{ Db.update_music_all() }) }
        //console.log('efrgt')
        if (flag) Db.setting(()=>{ Db.music_insert(File_list.file_list, ()=>{}) } )
        else Db.music_insert(File_list.file_list, ()=>{Db.update_music_all()})
        
    })
    console.log('File_list.file_list.length',File_list.file_list.length)
})



const Server = require('./server.js')
if (argv.includes('w')){
    const exec = require('child_process').exec; 
    exec(`Explorer http://127.0.0.1:`+Server.port, {encoding: 'utf-8'},(err,result,stderr) => {})
}