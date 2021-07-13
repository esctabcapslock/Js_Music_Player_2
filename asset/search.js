Search={
    setting:()=>{
        Search.dom.input = document.getElementById('search_quray')
        Search.dom.show = document.getElementById('search') 
        document.getElementById('search_btn').addEventListener('click',Search.search)
    },
    dom:{

    },
    search:()=>{
        var value = Search.dom.input.value
        console.log('Search.search',value);

        fetch("./search", {
            method: "POST",
            body: JSON.stringify({
                body: value.split(' ')
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then(d=>d.text()).then(data=>{
            Search.data = data = JSON.parse(data)
            console.log(data)
            Search.show()

        })
    },
    show:()=>{
        if(!Search.data) return;

        var out = Search.data.map((music,ind)=>{
            return `<div onclick = "Search.click(${ind})">  ${music.file_name} </div>`
        })
        
        Search.dom.show.innerHTML =  out.join('')
    },
    click:(id)=>{
        console.log(id)
        Queue.list.push(Search.data[id])

        if (Player.is_not_played()) Player.playmusic()
    }
}