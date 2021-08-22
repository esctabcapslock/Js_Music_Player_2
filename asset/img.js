function get_color(imgEl){
    const canvas = document.createElement('canvas');
    const context = canvas.getContext && canvas.getContext('2d');

    let height = canvas.height = imgEl.naturalHeight;
    let width = canvas.width = imgEl.naturalWidth;

    console.log(height, width)

    context.drawImage(imgEl, 0, 0);
    const data = context.getImageData(0, 0, width, height).data
    const length = data.length;
    
    rrgb=[0,0,0]
    for(var i=0; i<length; i+=parseInt(length/10/10/3)*3){
        //console.log(i, data[i])
        rrgb.map((v,k)=>rrgb[k]+=data[i+k])
    }
    
    return rrgb.map(v=>parseInt(v/100))
    
}