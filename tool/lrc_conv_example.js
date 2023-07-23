copy(JSON.stringify(Search.data.map(v => { return { music_id: v.music_id, file_name: v.file_name } })))
// get to pre, next 

// lrc도 기존 파일어서 가저와야

new_lrc = {}
for (const id in lrc) {

    const k = pre.filter(v => v.music_id == id)
    try {
        const kk = next.filter(v => v.file_name == k[0].file_name)[0].music_id
        new_lrc[kk] = lrc[id]
    } catch (e) { console.error(id, e) }

}
copy(JSON.stringify(new_lrc))