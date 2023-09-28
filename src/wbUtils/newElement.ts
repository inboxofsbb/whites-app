import { ExcalidrawTextElement, FontString } from "@excalidraw/excalidraw/types/element/types";
import { getContainerElement, getMaxContainerWidth } from "./textElement";
import { getFontString, isTestEnv } from "./utils";

export const refreshTextDimensions = (
    textElement: ExcalidrawTextElement,
    text = textElement.text,
  ) => {
    const container = getContainerElement(textElement);
    if (container) {
      text = wrapText(
        text,
        getFontString(textElement),
        getMaxContainerWidth(container),
      );
    }
    
    return { text };
  };
  let canvas: HTMLCanvasElement | undefined;
  const getLineWidth = (text: string, font: FontString) => {
    if (!canvas) {
      canvas = document.createElement("canvas");
    }
    const canvas2dContext = canvas.getContext("2d")!;
    canvas2dContext.font = font;
    const width = canvas2dContext.measureText(text).width;
  
    // since in test env the canvas measureText algo
    // doesn't measure text and instead just returns number of
    // characters hence we assume that each letteris 10px
    if (isTestEnv()) {
      return width * 10;
    }
    return width;
  };

  export const wrapText = (text: string, font: FontString, maxWidth: number) => {
    const lines: Array<string> = [];
    const originalLines = text.split("\n");
    const spaceWidth = getLineWidth(" ", font);
    const push = (str: string) => {
      if (str.trim()) {
        lines.push(str);
      }
    };
    originalLines.forEach((originalLine) => {
      const words = originalLine.split(" ");
      // This means its newline so push it
      if (words.length === 1 && words[0] === "") {
        lines.push(words[0]);
        return; // continue
      }
      let currentLine = "";
      let currentLineWidthTillNow = 0;
  
      let index = 0;
  
      while (index < words.length) {
        const currentWordWidth = getLineWidth(words[index], font);
        // This will only happen when single word takes entire width
        if (currentWordWidth === maxWidth) {
          push(words[index]);
          index++;
        }
  
        // Start breaking longer words exceeding max width
        else if (currentWordWidth > maxWidth) {
          // push current line since the current word exceeds the max width
          // so will be appended in next line
          push(currentLine);
          currentLine = "";
          currentLineWidthTillNow = 0;
  
          while (words[index].length > 0) {
            const currentChar = String.fromCodePoint(
              words[index].codePointAt(0)!,
            );
            const width = charWidth.calculate(currentChar, font);
            currentLineWidthTillNow += width;
            words[index] = words[index].slice(currentChar.length);
  
            if (currentLineWidthTillNow >= maxWidth) {
              // only remove last trailing space which we have added when joining words
              if (currentLine.slice(-1) === " ") {
                currentLine = currentLine.slice(0, -1);
              }
              push(currentLine);
              currentLine = currentChar;
              currentLineWidthTillNow = width;
            } else {
              currentLine += currentChar;
            }
          }
          // push current line if appending space exceeds max width
          if (currentLineWidthTillNow + spaceWidth >= maxWidth) {
            push(currentLine);
            currentLine = "";
            currentLineWidthTillNow = 0;
          } else {
            // space needs to be appended before next word
            // as currentLine contains chars which couldn't be appended
            // to previous line
            currentLine += " ";
            currentLineWidthTillNow += spaceWidth;
          }
  
          index++;
        } else {
          // Start appending words in a line till max width reached
          while (currentLineWidthTillNow < maxWidth && index < words.length) {
            const word = words[index];
            currentLineWidthTillNow = getLineWidth(currentLine + word, font);
  
            if (currentLineWidthTillNow > maxWidth) {
              push(currentLine);
              currentLineWidthTillNow = 0;
              currentLine = "";
  
              break;
            }
            index++;
            currentLine += `${word} `;
  
            // Push the word if appending space exceeds max width
            if (currentLineWidthTillNow + spaceWidth >= maxWidth) {
              const word = currentLine.slice(0, -1);
              push(word);
              currentLine = "";
              currentLineWidthTillNow = 0;
              break;
            }
          }
          if (currentLineWidthTillNow === maxWidth) {
            currentLine = "";
            currentLineWidthTillNow = 0;
          }
        }
      }
      if (currentLine) {
        // only remove last trailing space which we have added when joining words
        if (currentLine.slice(-1) === " ") {
          currentLine = currentLine.slice(0, -1);
        }
        push(currentLine);
      }
    });
    return lines.join("\n");
  };


export const charWidth = (() => {
    const cachedCharWidth: { [key: FontString]: Array<number> } = {};
  
    const calculate = (char: string, font: FontString) => {
      const ascii = char.charCodeAt(0);
      if (!cachedCharWidth[font]) {
        cachedCharWidth[font] = [];
      }
      if (!cachedCharWidth[font][ascii]) {
        const width = getLineWidth(char, font);
        cachedCharWidth[font][ascii] = width;
      }
  
      return cachedCharWidth[font][ascii];
    };
  
    const getCache = (font: FontString) => {
      return cachedCharWidth[font];
    };
    return {
      calculate,
      getCache,
    };
  })();



