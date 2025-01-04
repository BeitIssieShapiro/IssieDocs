import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  ImageSize,
  SafeAreaView,
  Text,
  View,
} from 'react-native';

import { Canvas } from './canvas';
import { ElementBase, ElementTypes, MoveContext, MoveTypes, Offset, SketchImage, SketchLine, SketchPath, SketchPoint, SketchTable, SketchText, TableContext, TablePart } from './types';

export function CanvasTest() {
  const [paths, setPaths] = useState<SketchPath[]>([]);
  const [lines, setLines] = useState<SketchLine[]>([]);
  const [texts, setTexts] = useState<SketchText[]>([]);
  const [images, setImages] = useState<SketchImage[]>([
    //   {
    //   id: "img1",
    //   x: 100, y: 100, width: 150, height: 100,
    //   editMode: true, src: { uri: "https://t3.ftcdn.net/jpg/01/39/42/02/240_F_139420221_jUGjHEnJ72KatSFGKJjZFOiIVyYGxXTX.jpg" }
    // }
  ]);

  const [tables, setTables] = useState<SketchTable[]>([{
    id: "t1",
    editMode: true,
    horizontalLines: [10, 40, 70],
    verticalLines: [100, 200, 300],
    color: "red",
    strokeWidth: 2,
  }]);


  const [windowSize, setWindowSize] = useState<ImageSize>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [status, setStatus] = useState<string>("");
  const [moveCanvas, setMoveCanvas] = useState<Offset>({ x: 0, y: 0 });
  const [mode, setMode] = useState<ElementTypes>(ElementTypes.Sketch);

  const currEditText = useRef<string | undefined>(undefined);
  const modeRef = useRef<ElementTypes>(ElementTypes.Sketch);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const backgroundStyle = {
    backgroundColor: "white",
    width: "100%",
    height: "100%",
  };

  const handleSketchStart = (p: SketchPoint) => {
    console.log("Sketch Start", modeRef.current)
    const color = "blue";
    const strokeWidth = 2;
    if (modeRef.current == ElementTypes.Sketch) {
      const newPath = {
        id: "S" + Math.random() * 10000,
        points: [p],
        color,
        strokeWidth,
      } as SketchPath
      setPaths(currPaths => [...currPaths, newPath]);
    } else if (modeRef.current == ElementTypes.Line) {
      const newLine = {
        id: "L" + Math.random() * 10000,
        from: p,
        to: p,
        color,
        strokeWidth,
        editMode: false,
      } as SketchLine
      setLines(currLines => [...currLines, newLine]);
    };
  }

  const handleSketchStep = (p: SketchPoint) => {
    if (modeRef.current == ElementTypes.Sketch) {
      setPaths(currPaths => {
        const lastPath = currPaths.pop();

        lastPath?.points.push(p);
        return lastPath ? [...currPaths, lastPath] : currPaths;
      })
    } else if (modeRef.current == ElementTypes.Line) {
      setLines(currLines => {
        const lastLine = currLines.pop();
        if (lastLine) {
          lastLine.to = p;
          return [...currLines, lastLine];
        }
        return currLines;
      })
    }
  }

  const handleSketchEnd = (elem: ElementBase | TableContext | undefined) => {
    console.log("Sketch End", elem)
    // if (modeRef.current == Modes.Sketch) {
    // } else if (modeRef.current == Modes.Line) {
    // }
  };

  const handleTextChanged = (id: string, newText: string) => {
    setTexts(currTexts => {
      const newTexts = currTexts.map(t => {
        if (t.id == id) {
          return { ...t, text: newText };
        }
        return t;
      })
      return newTexts;
    })
  }

  const handleCanvasClick = (p: SketchPoint, elem: ElementBase | TableContext | undefined) => {
    if (modeRef.current == ElementTypes.Text) {
      setTexts(currTexts => {
        // Find an existing text element which was click:
        let clickedId = undefined;

        if (elem) {
          if ("id" in elem) {
            clickedId = elem.id;
          } else {
            clickedId = currTexts.find(t => t.tableId && elem.cell && t.tableId == elem.elem.id && t.x == elem.cell[0] && t.y == elem.cell[1])?.id;
          }
        }
        console.log("CanvasClick text", clickedId)

        let foundExisting = false;

        const newTexts = currTexts.map(t => {
          if (t.editMode) {
            return { ...t, editMode: undefined };
          } else if (clickedId == t.id) {
            currEditText.current = clickedId;
            foundExisting = true;
            return { ...t, editMode: true };
          }
          return t;
        });

        if (!foundExisting) {
          const newTextElem = {
            id: "T" + Math.random() * 10000,
            text: "",
            color: "blue",
            rtl: false,
            fontSize: 25,
            editMode: true,
          } as SketchText

          if (elem && "cell" in elem && elem.cell && !("id" in elem)) {
            // table cell
            newTextElem.tableId = elem.elem.id;
            newTextElem.x = elem.cell[0];
            newTextElem.y = elem.cell[1];
          } else {
            newTextElem.x = p[0];
            newTextElem.y = p[1];
          }

          newTexts.push(newTextElem)
        }

        return newTexts;
      });
    } else if (modeRef.current == ElementTypes.Line && elem) {
      console.log("Line clicked", elem)
      setLines(currLines => {
        return currLines.map(line => {
          if (line.id == (elem as SketchLine).id) {
            return { ...line, editMode: true }
          } else {
            delete line.editMode;
            return line;
          }
        })
      });
    }
  }


  const handleMove = (type:MoveTypes, id:string, p: SketchPoint) => {
    console.log("Move", type, id, p)
    if (type == MoveTypes.Text) {
      setStatus("Move Text:" + (p[0]) + "," + (p[1]))

      setTexts(currTexts => {
        const newTexts = currTexts.map(t => {
          if (t.id == id) {
            return { ...t, x: p[0], y: p[1] };
          }
          return t;
        })
        return newTexts;
      })
    } else if (type == MoveTypes.LineStart || type == MoveTypes.LineEnd) {
      setLines(currLines => {
        return currLines.map(line => {
          if (line.id == id) {
            if (type == MoveTypes.LineStart) {
              line.from = [p[0], p[1]];
            } else {
              line.to = [p[0], p[1]];
            }
          }
          return line;
        });
      })
    }
  };

  const handleMoveEnd = (type:MoveTypes, id:string,) => {
    console.log("Move end", type, id)
  }

  const handleMoveTablePart = (p: SketchPoint, tableContext: TableContext) => {
    console.log("Table Part move", tableContext, p)
  }

  const handleMoveTablePartEnd = (tableContext: TableContext) => {
    console.log("Table Part move end", tableContext)
  }

  const handleDelete = (type: ElementTypes, id: string) => {
    if (type == ElementTypes.Line) {
      setLines(currLines => {
        return [...currLines.filter(l => l.id != id)];
      })
    }
  }

  const handleTextYOverflow = (elemId: string) => {
    console.log("End of page reached", elemId)
  }

  return (
    <SafeAreaView style={backgroundStyle} onLayout={(e) => {
      const { width, height } = e.nativeEvent.layout;
      setWindowSize({ width, height });
    }}>
      <Text style={{ height: 30, borderBottomColor: "black", borderBottomWidth: 1 }}>Title (h=30)</Text>
      <View style={{ height: 80, flexDirection: "row", borderBottomColor: "black", borderBottomWidth: 1 }}>
        <Text style={{ position: "absolute", right: 0, height: 40, fontSize: 18 }}>{status}mode:{mode}</Text>
        <Text>Toolbar - h=80</Text>

        <Button onPress={() => {
          setZoom(prev => prev - .25)
        }} title='-'></Button>
        <Button onPress={() => {
          setZoom(prev => prev + .25)
        }} title='+'></Button>

        <Button onPress={() => {
          setMoveCanvas(prev => ({ x: prev.x - 25, y: prev.y }))
        }} title='<-'></Button>
        <Button onPress={() => {
          setMoveCanvas(prev => ({ x: prev.x + 25, y: prev.y }))
        }} title='->'></Button>
        <Button onPress={() => {
          setMoveCanvas(prev => ({ x: prev.x, y: prev.y - 25 }))
        }} title='^'></Button>
        <Button onPress={() => {
          setMoveCanvas(prev => ({ x: prev.x, y: prev.y + 25 }))
        }} title='D'></Button>

        <Button onPress={() => {
          setMode(ElementTypes.Text)
        }} title='Text'></Button>
        <Button onPress={() => {
          setMode(ElementTypes.Sketch)
        }} title='Sketch'></Button>
        <Button onPress={() => {
          setMode(ElementTypes.Line)
        }} title='Line'></Button>
        <Button onPress={() => {
          setMode(ElementTypes.Image)
        }} title='Image'></Button>
        <Button onPress={() => {
          setMode(ElementTypes.Table)
        }} title='Table'></Button>
      </View>


      <Canvas
        style={{
          overflow: "hidden",
          backgroundColor: "gray"
        }}
        offset={moveCanvas}
        canvasWidth={windowSize.width} //without margins
        canvasHeight={windowSize.height - 200}
        zoom={zoom}
        minSideMargin={40}
        paths={paths}
        texts={texts}
        lines={lines}
        images={images}
        tables={tables}
        onTextChanged={handleTextChanged}
        onSketchStart={handleSketchStart}
        onSketchStep={handleSketchStep}
        onSketchEnd={handleSketchEnd}
        onCanvasClick={handleCanvasClick}
        onMoveElement={handleMove}
        onMoveEnd={handleMoveEnd}
        onMoveTablePart={handleMoveTablePart}
        onMoveTablePartEnd={handleMoveTablePartEnd}
        onDeleteElement={handleDelete}
        onTextYOverflow={handleTextYOverflow}
        imageSource={{ uri: "https://t3.ftcdn.net/jpg/01/39/42/02/240_F_139420221_jUGjHEnJ72KatSFGKJjZFOiIVyYGxXTX.jpg" }}
        currentElementType={mode}
      />
    </SafeAreaView>
  );
}

