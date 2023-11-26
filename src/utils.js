


export function setNavParam(nav, name, val) {
    if (!nav) return;


    nav.setParams({ [name]: val });
}

export function PromiseAllProgress(proms, progress_cb) {
    let d = 0;
    progress_cb(0);
    for (const p of proms) {
      p.then(()=> {    
        d ++;
        progress_cb( (d * 100) / proms.length );
      });
    }
    return Promise.all(proms);
  }


