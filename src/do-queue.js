import { trace } from "./log";
import { arrLast } from "./utils";

export default class DoQueue {
  constructor(onAttachmentRemove, name, level) {
    this._doneQueue = []
    this._undoQueue = []
    this._onAttachmentRemove = onAttachmentRemove;
  }

  async clearUndo() {
    this._undoQueue.forEach(async (elem) => {
      //console.log("clear undo", elem)
      if (elem.elem?.file) {
        await this._onAttachmentRemove(elem.elem?.file);
      }
    })

    this._undoQueue = [];
  }

  pushText(elem) {
    this.add({ elem: elem, type: 'text' });
    this.clearUndo();
  }

  pushTableCellText(elem) {
    this.add({ elem: elem, type: 'tableCellText' });
    this.clearUndo();
  }

  pushTableRangeMove(tableID, moves) {
    const chagedCells = [];
    moves.forEach((m) => {
      // seach the last tableCell matching
      for (let i = this._doneQueue.length - 1; i >= 0; i--) {
        const { elem, type } = this._doneQueue[i];
        if (type === 'tableCellText' &&
          elem?.tableCell.tableID === tableID &&
          elem?.tableCell.col === m.from[0] &&
          elem?.tableCell.row === m.from[1] &&
          elem.text !== "") {

          let validCell = true;
          // verify this textElem.id was not found higher in the queue
          for (let j = this._doneQueue.length - 1; j > i; j--) {
            if (this._doneQueue[j].elem.id === elem.id) {
              // found, it means that the found cell has been moved before
              validCell = false;
              break;
            }
          }
          if (validCell) {
            m.elemIndexToMove = i;
          }
          break;
        }
      }
    });

    moves = moves.filter(m => m.elemIndexToMove !== undefined);

    moves.forEach((m) => {
      const { elem, type } = this._doneQueue[m.elemIndexToMove];
      chagedCells.push({
        type,
        elem: { ...elem, tableCell: { tableID, col: m.to[0], row: m.to[1] } }
      });

    });

    if (chagedCells.length > 0) {
      trace("push many", chagedCells);
      this.pushMany(chagedCells);
      this.clearUndo();
    }
  }


  pushMany(elemArray) {
    elemArray.forEach((elem, i) => {
      if (i > 0) {
        elem.withPrevious = true;
      }
      this.add(elem);
    });
    this.clearUndo();
  }

  pushImagePosition(elem) {
    this.add({ elem: elem, type: 'imagePosition' });
    this.clearUndo();
  }

  pushDeleteImage(elem) {
    this.add({ elem: elem, type: 'imageDelete' });
    this.clearUndo();
  }

  pushImage(elem) {
    this.add({ elem: elem, type: 'image' });
    this.clearUndo();
  }

  pushAudioPosition(elem) {
    this.add({ elem: elem, type: 'audioPosition' });
    this.clearUndo();
  }

  pushDeleteAudio(elem) {
    this.add({ elem: elem, type: 'audioDelete' });
    this.clearUndo();

  }

  pushAudio(elem) {
    this.add({ elem: elem, type: 'audio' });
    this.clearUndo();
  }

  pushPath(elem) {
    this.add({ elem: elem, type: 'path' });
    this.clearUndo();
  }

  pushTable(elem) {
    delete elem.minHeights;
    delete elem.clone;

    this.add({ elem: elem, type: 'table' });
    this.clearUndo();
  }

  pushDeleteTable(id) {
    this.add({ elemID: id, type: 'tableDelete' });
    this.clearUndo();
  }

  pushDeleteTableNew(id) {
    this.add({ elem: { id }, type: 'tableDelete' });
    this.clearUndo();
  }

  pushLine(elem) {
    this.add({ elem: elem, type: 'line' });
    this.clearUndo();
  }

  pushDeleteLine(id) {
    this.add({ elemID: id, type: 'lineDelete' });
    this.clearUndo();
  }
  pushDeleteLineNew(id) {
    this.add({ elem: { id }, type: 'lineDelete' });
    this.clearUndo();
  }

  add(queueElem) {
    this._doneQueue.push(queueElem);
  }

  undo() {
    if (this._doneQueue.length > 0) {
      const elem = this._doneQueue.pop();
      if (elem.withPrevious) {
        this.undo()
      }
      this._undoQueue.push(elem);
      return true;
    }
    return false;
  }

  redo() {
    if (this._undoQueue.length > 0) {
      const elem = this._undoQueue.pop();
      if (elem.withPrevious) {
        this.redo()
      }
      this._doneQueue.push(elem);
      return true;
    }
    return false;
  }

  popDraft() {
    if (this._doneQueue.length > 0 && arrLast(this._doneQueue).elem?.draft) {
      // trace("pop draft", arrLast(this._doneQueue).elem)
      return this._doneQueue.pop();
    }
  }

  canRedo() {
    return (this._undoQueue.length > 0);
  }

  getAll() {
    return this._doneQueue;
  }
  clear() {
    this._doneQueue = []
    this.clearUndo();
  }
}