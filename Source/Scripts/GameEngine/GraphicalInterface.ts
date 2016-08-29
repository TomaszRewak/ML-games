import {Point2D, Vector2D, Transformation} from './GraphicsMath'

export interface GraphicalInterface {
	clear(): void;
	fillRect(transformation: Transformation, color: string): void;
    fillCircle(transformation: Transformation, color: string): void;
    drawLine(transformation: Transformation, color: string): void;
    drawLine(transformation: Transformation, color: string, width: number): void;
    drawText(transformation: Transformation, content: string, color: string): void;
    drawText(transformation: Transformation, content: string, color: string, align: string): void;
    drawText(transformation: Transformation, content: string, color: string, align: string, baseline: string): void;
    drawText(transformation: Transformation, content: string, color: string, align: string, baseline: string, font: string): void;
	width(): number;
	height(): number;
}

export class CanvasGraphicalInterface implements GraphicalInterface {
	private canvas: HTMLCanvasElement;
    private get context() { return this.canvas.getContext("2d"); }
    public defalutFont = 'Georgia';

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
	}

	private clearTransformation() {
		this.setTransformation(new Transformation());
	}

	private setTransformation(transformation: Transformation) {
		var m = transformation.matrix;
		this.context.setTransform(m[0], m[3], m[1], m[4], m[2], m[5]);
	}

	clear() {
		this.clearTransformation();
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.canvas.width = this.canvas.clientWidth;
		this.context.canvas.height = this.canvas.clientHeight;
	}

	fillRect(transformation: Transformation, color: string) {
		this.setTransformation(transformation);
		this.context.fillStyle = color;
		this.context.fillRect(-.5, -.5, 1, 1);
	}

	fillCircle(transformation: Transformation, color: string) {
		this.setTransformation(transformation);
		this.context.fillStyle = color;
		this.context.beginPath();
		this.context.arc(0, 0, 0.5, 0, 2 * Math.PI);
		this.context.fill();
	}

    drawLine(transformation: Transformation, color: string, width: number = 1) {
		this.setTransformation(transformation);
		this.context.strokeStyle = color;
		this.context.beginPath();
		this.context.moveTo(-0.5, 0);
		this.context.lineTo(0.5, 0);
        this.context.lineWidth = width / transformation.transformVector(new Vector2D(0, 1)).d();
		this.context.stroke();
	}

    drawText(transformation: Transformation, content: string, color: string, align = 'center', baseline = 'middle', font: string = this.defalutFont) {
		this.setTransformation(Transformation.forScale(0.05, 0.05).combine(transformation));
        this.context.font = `20px ${font}`;
        this.context.fillStyle = color;
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
		this.context.fillText(content, 0, 0);
	}

	width(): number {
		return this.canvas.width;
	}

	height(): number {
		return this.canvas.height;
	}
}