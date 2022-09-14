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
      //once new item added redo is reset
      this._undoQueue = [];
    }
  
    pushPath(elem) {
      this.add({ elem: elem, type: 'path' });
      //once new item added redo is reset
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