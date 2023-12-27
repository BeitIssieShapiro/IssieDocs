


export function setNavParam(nav, name, val) {
  if (!nav) return;


  nav.setParams({ [name]: val });
}

export function PromiseAllProgress(proms, progress_cb) {
  let d = 0;
  progress_cb(0);
  for (const p of proms) {
    p.then(() => {
      d++;
      progress_cb((d * 100) / proms.length);
    });
  }
  return Promise.all(proms);
}

export function isTooWhite(color) {
  try {
    const limit = 210;
    let borderStyle = {};
    const bigint = parseInt(color.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return (r > limit && g > limit && b > limit);
  } catch (e) {
  }
  return false;
}

export function arrLast(arr) {
  return arr ? arr[arr.length - 1] : undefined
}

export function genID() {
  //return Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, 5);
  return Math.floor(Math.random() * 1000000000);
}

export function tableRowHeight(table, row) {
  return table.horizontalLines[row+1] - table.horizontalLines[row];
}

export function tableHeight(table) {
  return arrLast(table.horizontalLines) - table.horizontalLines[0];
}