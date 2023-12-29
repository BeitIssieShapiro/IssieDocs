import { trace } from "./log";
import { arrLast } from "./utils";

export default class DoQueue {
  constructor(name, level) {
    this._doneQueue = []
    this._undoQueue = []
  }

  pushText(elem) {
    this.add({ elem: elem, type: 'text' });
    //once new item added redo is reset
    this._undoQueue = [];
  }

  pushTableCellText(elem) {
    this.add({ elem: elem, type: 'tableCellText' });
    //once new item added redo is reset
    this._undoQueue = [];

  }
  pushImagePosition(elem) {
    this.add({ elem: elem, type: 'imagePosition' });
    this._undoQueue = [];
  }

  pushDeleteImage(elem) {
    this.add({ elem: elem, type: 'imageDelete' });
    this._undoQueue = [];

  }

  pushImage(elem) {
    this.add({ elem: elem, type: 'image' });
    this._undoQueue = [];
  }

  pushPath(elem) {
    this.add({ elem: elem, type: 'path' });
    this._undoQueue = [];
  }

  pushTable(elem) {
    delete elem.minHeights;
    delete elem.clone;

    this.add({ elem: elem, type: 'table' });
    this._undoQueue = [];
  }

  pushColumnWidth(id, colIndex, width) {
    this.add({ elemID: id, type: 'tableColWidth', colIndex, width });
    this._undoQueue = [];
  }

  pushDeleteTable(id) {
    this.add({ elemID: id, type: 'tableDelete' });
    this._undoQueue = [];
  }

  pushLine(elem) {
    this.add({ elem: elem, type: 'line' });
    this._undoQueue = [];

  }

  add(queueElem) {
    this._doneQueue.push(queueElem);
  }

  undo() {
    if (this._doneQueue.length > 0) {
      this._undoQueue.push(this._doneQueue.pop());
    }
  }

  redo() {
    if (this._undoQueue.length > 0) {
      this._doneQueue.push(this._undoQueue.pop());
    }
  }

  popDraft() {
    if (this._doneQueue.length > 0 && arrLast(this._doneQueue).elem?.draft) {
      trace("pop draft", arrLast(this._doneQueue).elem)
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
    this._undoQueue = []
  }
}