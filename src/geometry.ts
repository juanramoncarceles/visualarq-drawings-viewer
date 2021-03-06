export interface Point2d {
  x: number;
  y: number;
}

export class Line {
  0: Point2d;
  1: Point2d;

  constructor(point1: Point2d, point2: Point2d) {
    this[0] = point1;
    this[1] = point2;
  }
}

export enum OrthoLineLineRelationshipType {
  Nothing,
  Intersect,
  Overlap
}

export enum RectRectRelationshipType {
  Disjoint,
  Match,
  Intersect,
  AInsideB,
  BInsideA,
  Tangent 
}

export class OrthoLineLineRelationship {
  type: OrthoLineLineRelationshipType;
  intersection: Point2d;
  overlap: Line;

  // (orthoLineLineRelationshipType, {intersection=undefined, overlap=undefined} = {})
  constructor(orthoLineLineRelationshipType: OrthoLineLineRelationshipType, intersection: Point2d = undefined, overlap: Line = undefined) {
    this.type = orthoLineLineRelationshipType;
    this.intersection = intersection;
    this.overlap = overlap;
  }
}

export class Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(x: number, y: number, width: number, height: number) {
    x = x;
    y = y;
    width = width;
    height = height;
  }
}

export class GeometryCalc {

  static ptsDistance(pt1: Point2d, pt2: Point2d) {
    return Math.sqrt(Math.pow((pt2.x - pt1.x), 2) + (Math.pow((pt2.y - pt1.y), 2)));
  }

  static lineMiddlePt(line: Line) {
    return { x: (line[0].x + line[1].x) / 2, y: (line[0].y + line[1].y) / 2 };
  }

  static areLinesEqual(line1: Line, line2: Line) {
    return (this.arePointsEqual(line1[0], line2[0]) && this.arePointsEqual(line1[1], line2[1])) || (this.arePointsEqual(line1[0], line2[1]) && this.arePointsEqual(line1[1], line2[0]));
  }

  static arePointsEqual(point1: Point2d, point2: Point2d) {
    return point1.x === point2.x && point1.y === point2.y;
  }

  /**
   * Gets the points around a point defined by an offset from the point.
   * For example for the point 0,0 and offset 1 it will return the 8 points around 0,0.
   */
  static getPointsAround(point: Point2d, offset: number): Point2d[] {
    const pixelsPerSide = offset * 2;
    let currentX = point.x + offset;
    let currentY = point.y + offset;
    const pointsAround = [];
    for (let i = 0; i < pixelsPerSide; i++)
      pointsAround.push({ x: currentX, y: currentY -= 1 });
    for (let i = 0; i < pixelsPerSide; i++)
      pointsAround.push({ x: currentX -= 1, y: currentY });
    for (let i = 0; i < pixelsPerSide; i++)
      pointsAround.push({ x: currentX, y: currentY += 1 });
    for (let i = 0; i < pixelsPerSide; i++)
      pointsAround.push({ x: currentX += 1, y: currentY });
    return pointsAround;
  }

}
