import { trace } from "./log";



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
  return table.horizontalLines[row + 1] - table.horizontalLines[row];
}

export function tableColWidth(table, col) {
  return table.verticalLines[col + 1] - table.verticalLines[col];
}

export function tableHeight(table) {
  return arrLast(table.horizontalLines) - table.horizontalLines[0];
}


export function normalizeBox(box) {
  const { from, to } = box;
  const x1 = Math.min(from[0], to[0]);
  const x2 = Math.max(from[0], to[0]);
  const y1 = Math.min(from[1], to[1]);
  const y2 = Math.max(from[1], to[1]);

  return { from: [x1, y1], to: [x2, y2] };
}

export function isCellInBox(cell, box) {
  const { from, to } = normalizeBox(box);

  return (from[0] <= cell[0] && to[0] >= cell[0] &&
    from[1] <= cell[1] && to[1] >= cell[1])
}



export function calculateTargetBox(table, normBox, moveToCell) {
  const boxCols = normBox.to[0] - normBox.from[0] + 1;
  const boxRows = normBox.to[1] - normBox.from[1] + 1;

  let offsetX = moveToCell[0] - normBox.from[0];
  let offsetY = moveToCell[1] - normBox.from[1];
  // cap with table size
  if (offsetX + normBox.from[0] + boxCols > table.verticalLines.length-1) {
    offsetX = table.verticalLines.length - normBox.from[0] - boxCols - 1;
  } else if (offsetX + normBox.from[0] < 0) {
    offsetX = -normBox.from[0];
  }

  if (offsetY + normBox.from[1] + boxRows > table.horizontalLines.length-1) {
    offsetY = table.horizontalLines.length - normBox.from[1] - boxRows - 1;
  } else if (offsetY + normBox.from[1] < 0) {
    offsetY = -normBox.from[1];
  }


  return offsetTableBox(normBox, [offsetX, offsetY])
}

export function offsetTableCell(cell, cellDelta) {
  return [cell[0]+cellDelta[0], cell[1]+cellDelta[1]]
}

export function offsetTableBox(box, cellDelta) {
  return {
    from: [box.from[0] + cellDelta[0], box.from[1] + cellDelta[1]],
    to: [box.to[0] + cellDelta[0], box.to[1] + cellDelta[1]]
  }
}

export function tableBoxToPoints(table, box, margin) {
  const x1 = table.verticalLines[box.from[0]] - margin, y1 = table.horizontalLines[box.from[1]] - margin;
  const x2 = table.verticalLines[box.to[0] + 1] + margin, y2 = table.horizontalLines[box.to[1] + 1] + margin;

  return { x1, y1, x2, y2 };
}

export function offsetTablePoints(boxPoints, pixelOffset) {
  return {
    x1: boxPoints.x1 + pixelOffset[0], y1: boxPoints.y1 + pixelOffset[1],
    x2: boxPoints.x2 + pixelOffset[0], y2: boxPoints.y2 + pixelOffset[1]
  }
}


export function isSameCell(cell1, cell2) {
  return cell1[0] === cell2[0] && cell1[1] === cell2[1];
}

export function pointOnContinuationOfLine(x1, y1, x2, y2, d, isAtStart) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  let angle = Math.atan2(dy, dx); // Calculate the angle of the line

  let x, y;
  if (isAtStart) {
    // Calculate the point towards (x1, y1)
    if (dx !== 0) {
      // Line is not vertical
      x = x1 - d * Math.cos(angle);
      y = y1 - d * Math.sin(angle);
    } else {
      // Line is vertical
      x = x1;
      y = y1 - d;
    }
  } else {
    // Calculate the point towards (x2, y2)
    if (dx !== 0) {
      // Line is not vertical
      x = x2 + d * Math.cos(angle);
      y = y2 + d * Math.sin(angle);
    } else {
      // Line is vertical
      x = x2;
      y = y2 + d;
    }
  }

  return { x, y };
}

