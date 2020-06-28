import { OrthoLineLineRelationship, orthoLineLineRelationshipType, rectRectRelationshipType, GeometryCalc, Rectangle, Line } from './geometry';

export default class {

  /**
  * Read the content of a file.
  * @param {Blob} file 
  */
  static readInputFile(file) {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.readAsText(file, "UTF-8");
      reader.onload = () => {
        res(reader.result);
      }
      reader.onerror = () => {
        console.log("Error reading the file.");
      }
    });
  }

  /**
  * Get the URL parameters.
  * Source: https://css-tricks.com/snippets/javascript/get-url-variables/
  * @param  {String} url The URL
  * @return {Object}     The URL parameters
  */
  static getUrlParams(url) {
    const params = {};
    const parser = document.createElement('a');
    parser.href = url;
    const vars = parser.search.substring(1).split('&');
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=');
      params[pair[0]] = decodeURIComponent(pair[1]);
    }
    return params;
  }

  /**
   * Removes all the childs of the HTML element.
   * @param {HTMLElement} node 
   */
  static emptyNode(node) {
    while (node.firstChild && node.removeChild(node.firstChild));
  }

  /**
   * Creates a fillet bounding box around the provided element.
   * @param {SVGElement} element 
   * @param {Number} offset Optional, with default 5.
   * @param {Number} fillet Optional, with default 5.
   */
  static createBBox(element, offset = 5, fillet = 5) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', element.getBBox().x - offset);
    rect.setAttribute('y', element.getBBox().y - offset);
    rect.setAttribute('width', element.getBBox().width + offset * 2);
    rect.setAttribute('height', element.getBBox().height + offset * 2);
    rect.setAttribute('rx', fillet);
    rect.setAttribute('ry', fillet);
    return rect;
  }

  // Rename the avobe as createSVGBBox
  // This one returns a rect object {x,y,width,height}
  // same as default bbox but with optional offset
  static createBBox2(element, offset = 0) {
    if (offset !== 0) {
      return {
        x: element.getBBox().x - offset,
        y: element.getBBox().y - offset,
        width: element.getBBox().width + offset * 2,
        height: element.getBBox().height + offset * 2
      };
    } else {
      return element.getBBox();
    }
  }

  /**
   * Function to get the coordinates of the mouse on the SVG canvas.
   * @param {MouseEvent} evt 
   * @param {SVGSVGElement} svgDoc 
   */
  static getRelativeCoords(evt, svgDoc) {
    const originPt = svgDoc.createSVGPoint();
    originPt.x = evt.clientX;
    originPt.y = evt.clientY;
    // The cursor point, translated into svg coordinates
    return originPt.matrixTransform(svgDoc.getScreenCTM().inverse());
  }

  // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  static uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }


  static getRectSegments(rect) {
    const cornerA = { x: rect.x, y: rect.y };
    const cornerB = { x: rect.x + rect.width, y: rect.y };
    const cornerC = { x: rect.x + rect.width, y: rect.y + rect.height };
    const cornerD = { x: rect.x, y: rect.y + rect.height };
    return [
      [cornerA, cornerB],
      [cornerB, cornerC],
      [cornerC, cornerD],
      [cornerD, cornerA]
    ];
  }

  /**
   * 
   * @param {*} rect 
   * @param {*} pt 
   * @param {*} inclusive Include points on the edges. Default true.
   */
  static isPtInRect(rect, pt, inclusive = true) {
    if (inclusive) {
      return (pt.x >= rect.x && pt.x <= (rect.x + rect.width)) && (pt.y >= rect.y && pt.y <= (rect.y + rect.height));
    } else {
      return (pt.x > rect.x && pt.x < (rect.x + rect.width)) && (pt.y > rect.y && pt.y < (rect.y + rect.height));
    }
  }

  /**
   * Checks if a line is completely inside a rectangle.
   * Even if the line is completely inside but touching a segment of the rectangle it's considered inside,
   * this includes a line that is completely overlapped with a segment of the rectangle.
   * @param {Line} line The line to test.
   * @param {Rectangle} rect The rectangle to test against.
   * @returns {boolean} Bool indicating if it is completely inside or not.
   */
  static isLineInRect(line, rect) {
    return (this.isPtInRect(rect, line[0]) && this.isPtInRect(rect, line[1]));
  }

  /**
   * Check if a numerical value is between two limits.
   * @param {Number} value Value to compare.
   * @param {Number} limit1 First limit.
   * @param {Number} limit2 Second limit, oposite to the first one.
   * @param {Boolean} inclusive Weather to include the limits in the comparison or not. Default true.
   */
  static isNumBetween(value, limit1, limit2, inclusive = true) {
    if (inclusive) {
      return value >= Math.min(limit1, limit2) && value <= Math.max(limit1, limit2);
    } else {
      return value > Math.min(limit1, limit2) && value < Math.max(limit1, limit2);
    }
  }

  static isLineHorizontal(line) {
    return line[0].y === line[1].y;
  }

  static isLineVertical(line) {
    return line[0].x === line[1].x;
  }

  // If refPt is provided will be calculated from this
  // If not provided will be calculated from the first point
  static sortPtsByDistance(pts, refPt = undefined, includeRefPt = false) {
    const referencePt = refPt !== undefined ? refPt : pts[0];
    const sortedPts = pts.sort((a, b) => {
      if (GeometryCalc.ptsDistance(referencePt, a) < GeometryCalc.ptsDistance(referencePt, b))
        return -1;
      else if (GeometryCalc.ptsDistance(referencePt, a) > GeometryCalc.ptsDistance(referencePt, b))
        return 1;
      else
        return 0;
    });
    return (refPt !== undefined && includeRefPt === true) ? [refPt, ...sortedPts] : sortedPts;
  }

  /**
   * Given an array of points returns an array of lines between the points.
   * @param {*} pts 
   */
  static linesBetweenPts(pts) {
    if (pts.length > 1) {
      const segments = [];
      for (let i = 0; i < pts.length - 1; i++) {
        segments.push([pts[i], pts[i + 1]]);
      }
      return segments;
    } else {
      return null;
    }
  }


  // if a rectangle is totaly overlapped or partially and completely inside it is not considered intersection but Inside. fullContainmentIntersections 
  // intersection includes overlaped partially but no one inside the other
  static rectRectRelationship(rect1, rect2) {
    if (rect1.x === rect2.x && rect1.y === rect2.y && rect1.width === rect2.width && rect1.height === rect2.height) {
      return rectRectRelationshipType.match;
    } else if (this.isPtInRect(rect2, { x: rect1.x, y: rect1.y }) &&
      this.isPtInRect(rect2, { x: rect1.x + rect1.width, y: rect1.y }) &&
      this.isPtInRect(rect2, { x: rect1.x + rect1.width, y: rect1.y + rect1.height }) &&
      this.isPtInRect(rect2, { x: rect1.x, y: rect1.y + rect1.height })) {
      return rectRectRelationshipType.AInsideB;
    } else if (this.isPtInRect(rect1, { x: rect2.x, y: rect2.y }) &&
      this.isPtInRect(rect1, { x: rect2.x + rect2.width, y: rect2.y }) &&
      this.isPtInRect(rect1, { x: rect2.x + rect2.width, y: rect2.y + rect2.height }) &&
      this.isPtInRect(rect1, { x: rect2.x, y: rect2.y + rect2.height })) {
      return rectRectRelationshipType.BInsideA;
    } else if (this.isPtInRect(rect2, { x: rect1.x, y: rect1.y }, false) ||
      this.isPtInRect(rect2, { x: rect1.x + rect1.width, y: rect1.y }, false) ||
      this.isPtInRect(rect2, { x: rect1.x + rect1.width, y: rect1.y + rect1.height }, false) ||
      this.isPtInRect(rect2, { x: rect1.x, y: rect1.y + rect1.height }, false) ||
      this.isPtInRect(rect1, { x: rect2.x, y: rect2.y }, false) ||
      this.isPtInRect(rect1, { x: rect2.x + rect2.width, y: rect2.y }, false) ||
      this.isPtInRect(rect1, { x: rect2.x + rect2.width, y: rect2.y + rect2.height }, false) ||
      this.isPtInRect(rect1, { x: rect2.x, y: rect2.y + rect2.height }, false) ||
      (this.isNumBetween(rect1.y, rect2.y, rect2.y + rect2.height, false) && rect1.x <= rect2.x && (rect1.x + rect1.width) >= (rect2.x + rect2.width)) || // isNumBetween(rect2.x, rect1.x, rect1.x + rect1.width) && isNumBetween()) ||
      (this.isNumBetween(rect2.y, rect1.y, rect1.y + rect1.height, false) && rect2.x <= rect1.x && (rect2.x + rect2.width) >= (rect1.x + rect1.width))) { // isNumBetween(rect1.x, rect2.x, rect2.x + rect2.width))) {
      return rectRectRelationshipType.intersect;
    } else if (this.isPtInRect(rect2, { x: rect1.x, y: rect1.y }) ||
      this.isPtInRect(rect2, { x: rect1.x + rect1.width, y: rect1.y }) ||
      this.isPtInRect(rect2, { x: rect1.x + rect1.width, y: rect1.y + rect1.height }) ||
      this.isPtInRect(rect2, { x: rect1.x, y: rect1.y + rect1.height }) ||
      this.isPtInRect(rect1, { x: rect2.x, y: rect2.y }) ||
      this.isPtInRect(rect1, { x: rect2.x + rect2.width, y: rect2.y }) ||
      this.isPtInRect(rect1, { x: rect2.x + rect2.width, y: rect2.y + rect2.height }) ||
      this.isPtInRect(rect1, { x: rect2.x, y: rect2.y + rect2.height })) {
      return rectRectRelationshipType.tangent;
    } else {
      return rectRectRelationshipType.disjoint;
    }
  }

  /**
   * Relationship between two orthogonal lines.
   * @param {*} line1 
   * @param {*} line2 
   */
  static getOrthoLineLineRelationship(line1, line2) {
    if (this.isLineHorizontal(line1) && this.isLineVertical(line2)) {
      if (this.isNumBetween(line1[0].y, line2[0].y, line2[1].y) && this.isNumBetween(line2[0].x, line1[0].x, line1[1].x)) {
        return new OrthoLineLineRelationship(orthoLineLineRelationshipType.intersect, { x: line2[0].x, y: line1[0].y });
      } else {
        return new OrthoLineLineRelationship(orthoLineLineRelationshipType.nothing);
      }
    } else if (this.isLineHorizontal(line2) && this.isLineVertical(line1)) {
      if (this.isNumBetween(line2[0].y, line1[0].y, line1[1].y) && this.isNumBetween(line1[0].x, line2[0].x, line2[1].x)) {
        return new OrthoLineLineRelationship(orthoLineLineRelationshipType.intersect, { x: line1[0].x, y: line2[0].y });
      } else {
        return new OrthoLineLineRelationship(orthoLineLineRelationshipType.nothing);
      }
    } else if (this.isLineHorizontal(line1) && this.isLineHorizontal(line2)) {
      if (line1[0].y === line2[0].y) {
        const startPointX = Math.min(Math.max(line1[0].x, line1[1].x), Math.max(line2[0].x, line2[1].x));
        const endPointX = Math.max(Math.min(line1[0].x, line1[1].x), Math.min(line2[0].x, line2[1].x));
        if (startPointX >= endPointX) {
          return new OrthoLineLineRelationship(orthoLineLineRelationshipType.overlap, undefined, [{ x: startPointX, y: line1[0].y }, { x: endPointX, y: line1[0].y }]);
        } else {
          return new OrthoLineLineRelationship(orthoLineLineRelationshipType.nothing);
        }
      } else {
        return new OrthoLineLineRelationship(orthoLineLineRelationshipType.nothing);
      }
    } else if (this.isLineVertical(line1) && this.isLineVertical(line2)) {
      if (line1[0].x === line2[0].x) {
        const startPointY = Math.min(Math.max(line1[0].y, line1[1].y), Math.max(line2[0].y, line2[1].y));
        const endPointY = Math.max(Math.min(line1[0].y, line1[1].y), Math.min(line2[0].y, line2[1].y));
        if (startPointY >= endPointY) {
          return new OrthoLineLineRelationship(orthoLineLineRelationshipType.overlap, undefined, [{ x: line1[0].x, y: startPointY }, { x: line1[0].x, y: endPointY }]);
        } else {
          return new OrthoLineLineRelationship(orthoLineLineRelationshipType.nothing);
        }
      } else {
        return new OrthoLineLineRelationship(orthoLineLineRelationshipType.nothing);
      }
    } else {
      return new OrthoLineLineRelationship(orthoLineLineRelationshipType.nothing);
    }
  }


  static rectanglesSilhouette(rects) {
    const rectsSegments = [];
    for (let i = 0; i < rects.length; i++)
      rectsSegments.push(this.getRectSegments(rects[i]));
    const finalSegments = [];
    const overlappedSegments = [];
    for (let i = 0; i < rects.length; i++) {
      let currentRectSegments = this.getRectSegments(rects[i]);
      for (let b = 0; b < rects.length; b++) {
        // Skip checking with the rectangle itself.
        if (b != i) {
          const newCurrentRectSegments = [];
          const rectsRelation = this.rectRectRelationship(rects[b], rects[i]);
          // If the 'i' rectangle is inside of the 'b' or if the 'i' is equal to a previous 'b' then skip its segments.
          if (rectsRelation === rectRectRelationshipType.BInsideA || (i > b && rectsRelation === rectRectRelationshipType.match)) {
            currentRectSegments.length = 0;
            break;
          } else if (rectsRelation === rectRectRelationshipType.intersect || rectsRelation === rectRectRelationshipType.tangent) {
            const tempOverlappedSegments = [];
            for (let k = 0; k < currentRectSegments.length; k++) {
              const segmentIntersections = [];
              const line1 = currentRectSegments[k];
              if (!this.isLineInRect(line1, rects[b])) {
                for (let n = 0; n < rectsSegments[b].length; n++) {
                  const line2 = rectsSegments[b][n];
                  const linesRelationship = this.getOrthoLineLineRelationship(line1, line2);
                  if (linesRelationship.type === orthoLineLineRelationshipType.intersect) {
                    if (linesRelationship.intersection)
                      segmentIntersections.push(linesRelationship.intersection);
                  } else if (linesRelationship.type === orthoLineLineRelationshipType.overlap) {
                    if (linesRelationship.overlap)
                      tempOverlappedSegments.push(linesRelationship.overlap);
                  }
                }
                if (segmentIntersections.length > 0) {
                  const sortedIntersections = this.sortPtsByDistance(segmentIntersections, currentRectSegments[k][0], true);
                  const splitedSegments = this.linesBetweenPts([...sortedIntersections, currentRectSegments[k][1]]);
                  for (let p = 0; p < splitedSegments.length; p++) {
                    if (!this.isPtInRect(rects[b], GeometryCalc.lineMiddlePt(splitedSegments[p])))
                      newCurrentRectSegments.push(splitedSegments[p]);
                  }
                } else {
                  newCurrentRectSegments.push(currentRectSegments[k]);
                }
              }
            }
            if (tempOverlappedSegments.length > 0 && rectsRelation !== rectRectRelationshipType.tangent) {
              for (let m = 0; m < tempOverlappedSegments.length; m++) {
                if (!overlappedSegments.find(segment => GeometryCalc.areLinesEqual(segment, tempOverlappedSegments[m])))
                  overlappedSegments.push(tempOverlappedSegments[m]);
              }
            }
            // Update the segments after processing them with this iteration rectangle.
            currentRectSegments = newCurrentRectSegments;
          }
        }
      }
      if (currentRectSegments.length > 0)
        finalSegments.push(...currentRectSegments);
    }
    if (overlappedSegments.length > 0)
      finalSegments.push(...overlappedSegments);
    return finalSegments;
  }


  static svgPathFromLines(segments) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathContent = [];
    const precision = 3; // TODO Take from the document?
    for (let i = 0; i < segments.length; i++) {
      pathContent.push(`M${segments[i][0].x.toFixed(precision)},${segments[i][0].y.toFixed(precision)} ${segments[i][1].x.toFixed(precision)},${segments[i][1].y.toFixed(precision)}`);
    }
    path.setAttribute('d', pathContent.join(''));
    return path;
  }
}