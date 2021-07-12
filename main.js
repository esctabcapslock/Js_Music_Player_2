const File_list = require('./File_list.js').File_list
const Db = require('./Db.js').Db

File_list.readsetting()
File_list.findfile()

Db.isnone((flag)=>{
    console.log('db is none?',flag);
    if (flag){
        Db.setting(()=>{
            Db.music_insert(File_list.file_list)
            
        })
    }
    else{
        Db.music_insert(File_list.file_list)
    }

    
})

console.log(File_list.file_list.length)
