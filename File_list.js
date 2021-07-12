const fs = require('fs')
const homedir = require("os").userInfo().homedir;
const File_list = {
    'setting':{
        '확장자':['mp3'],
        '허용':[],
        '거부':[homedir+'\\AppData'],
    },
    'readsetting':()=>{
        var dir_list = fs.readFileSync('asset/setting/dir.txt','utf-8').split('\n')
        //console.log(dir_list)
        var 모드 = false;
        
        for(var i=0; i<dir_list.length; i++){
            var tmp = dir_list[i].trim();
            //console.log('tmp',tmp, i, 모드, tmp=='확장자')
            if (tmp=='') continue;
            else if (tmp=='확장자') 모드='확장자';
            else if (tmp=='거부') 모드='거부';
            else if (tmp=='허용') 모드='허용';
            else if (모드){
                File_list.setting[모드].push(tmp)
            }
        }
        
        File_list.setting.확장자 = [...new Set(File_list.setting.확장자)]
        File_list.setting.허용 = [...new Set(File_list.setting.허용)]
        File_list.setting.거부 = [...new Set(File_list.setting.거부)]
        console.log(File_list.setting)
        
    },
    'file_list':[],
    findfile:()=>{
        stack = ['C:\\Users']
        
        while (stack.length){
            var tmp = stack.pop()
            var list = fs.readdirSync(tmp)
            //console.log(tmp, list.length);
            list.forEach(v=>{
                var new_path = tmp+'\\'+v;
                if (File_list.setting.거부.includes(new_path)) return; //거부된 파일들 해결
                if (v[0]=='.') return;
                
                try{//간혹가다가 오류남. 권한등..
                    if (fs.lstatSync(new_path).isDirectory()){
                        stack.push(new_path)
                    }else{// 일반 파일인 경우
                        var flag = false;
                        //console.log(new_path, new_path.endsWith('.mp3'))
                        
                        for(var i=0; i<File_list.setting.확장자.length; i++){
                            //console.log('for',i, new_path, new_path.endsWith('.'+i))
                            
                            if (new_path.endsWith('.'+File_list.setting.확장자[i])){
                                //console.log(new_path)
                                flag=true; 
                            }
                        }
                        if (flag) {
                            File_list.file_list.push(new_path)
                        }
                    }
                }catch{}
            })
            
        }
    }
    
}

//console.log('homedir:',homedir)






module.exports.File_list = File_list