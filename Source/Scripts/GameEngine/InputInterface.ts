export interface InputInterface {
	up(): boolean;
	down(): boolean;
	left(): boolean;
	right(): boolean;
}

export class StandardInputInterface implements InputInterface {
	pressedButtons: Set<number> = new Set();

	up() { return this.pressedButtons.has(38); }
	down() { return this.pressedButtons.has(40); }
	left() { return this.pressedButtons.has(37); }
	right() { return this.pressedButtons.has(39); }

	constructor(element: HTMLElement = document.body) {
		element.addEventListener('keydown', e => this.pressedButtons.add(e.keyCode), false);
		element.addEventListener('keyup', e => this.pressedButtons.delete(e.keyCode), false);
	}
}