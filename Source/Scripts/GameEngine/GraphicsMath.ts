export class Point2D {
	public x: number;
	public y: number;

	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	vectorTo(point: Point2D) {
		return new Vector2D(point.x - this.x, point.y - this.y);
	}

	add(vector: Vector2D) {
		return new Point2D(this.x + vector.x, this.y + vector.y);
	}
}

export class Vector2D {
	public x: number;
	public y: number;

	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	multiplyBy(n: number) {
		return new Vector2D(this.x * n, this.y * n);
	}

	add(v: Vector2D) {
		return new Vector2D(this.x + v.x, this.y + v.y);
	}

	reverse() {
		return new Vector2D(-this.x, -this.y);
	}

	d(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	normalized(): Vector2D {
		let d = this.d();

		if (d)
			return new Vector2D(this.x / d, this.y / d);
		else
			return new Vector2D(0, 0);
	}

	normal(): Vector2D {
		return new Vector2D(-this.y, this.x).normalized();
	}
}

export class Transformation {
	public matrix: number[];

	public constructor(table: number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1]) {
		this.matrix = table
	}

	static forTranslation(x: number, y: number): Transformation {
		return new Transformation([1, 0, x, 0, 1, y, 0, 0, 1])
	}

	static forScale(x: number, y: number): Transformation {
		return new Transformation([x, 0, 0, 0, y, 0, 0, 0, 1])
	}

	static forRotation(r: number): Transformation {
		let c = Math.cos(r);
		let s = Math.sin(r);

		return new Transformation([c, -s, 0, s, c, 0, 0, 0, 1]);
	}

	public combine(second: Transformation): Transformation {
		let a = second.matrix;
		let b = this.matrix;

		return new Transformation([
			a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
			a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
			a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
			a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
			a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
			a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
			a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
			a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
			a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
		]);
	}

	public transform(point: Point2D): Point2D {
		let b = this.matrix;
		let x = point.x,
			y = point.y;

		let newX = b[0] * x + b[1] * y + b[2],
			newY = b[3] * x + b[4] * y + b[5],
			newW = b[6] * x + b[7] * y + b[8]

		return new Point2D(
			newX / newW,
			newY / newW
		);
	}

	public transformVector(v: Vector2D): Vector2D {
		let a = this.transform(new Point2D());
		let b = this.transform(new Point2D(v.x, v.y));

		return a.vectorTo(b);
	}

	private _inversed: Transformation = null;
	public get inversed(): Transformation {
		if (this._inversed)
			return this._inversed;

		let m = this.matrix;

		let det = m[0] * (m[4] * m[8] - m[7] * m[5]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);

		let invdet = 1 / det;

		this._inversed = new Transformation([
			(m[4] * m[8] - m[7] * m[5]) * invdet,
			(m[2] * m[7] - m[1] * m[8]) * invdet,
			(m[1] * m[5] - m[2] * m[4]) * invdet,
			(m[5] * m[6] - m[3] * m[8]) * invdet,
			(m[0] * m[8] - m[2] * m[6]) * invdet,
			(m[3] * m[2] - m[0] * m[5]) * invdet,
			(m[3] * m[7] - m[6] * m[4]) * invdet,
			(m[6] * m[1] - m[0] * m[7]) * invdet,
			(m[0] * m[4] - m[3] * m[1]) * invdet
		]);

		return this._inversed;
	} 

	centerPosition(): Point2D {
		return this.transform(new Point2D());
	}

	direction(): Vector2D {
		var p1 = this.transform(new Point2D());
		var p2 = this.transform(new Point2D(0, -1));

		return p1.vectorTo(p2).normalized();
	}
}