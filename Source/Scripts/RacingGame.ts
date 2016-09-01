import { NeuralNetwork, FullyConnectedNeuralNetwork } from './NN/NN'
import { GraphicalInterface } from './GameEngine/GraphicalInterface'
import { InputInterface } from './GameEngine/InputInterface'
import { GameScene, GameObject, DrawRectBehaviour, DrawLineBehaviour, DrawCircleBehaviour, DrawTextBehaviour, TransformBehaviour, ScriptBehaviour, ColliderBehaviour } from './GameEngine/GameEngine'
import { Transformation, Point2D, Vector2D } from './GameEngine/GraphicsMath'
import { HostedGame, HostedGameGenerator } from './GameHost'

class RaceBehaviour implements ScriptBehaviour {
    private allCars: CarGameObject[];
    private started = false;
	private whenToStop = Number.MAX_VALUE;

	private finalScore: number[] = null;

    constructor(
		private aiCars: CarGameObject[],
		private userCar: CarGameObject,
		private lapLength: number,
		private score: (p: Point2D) => number,
		private countDown: CounterGameObject,
		private stopCondition: (cars: { lap: number, ai: boolean, alive: boolean, active: boolean }[], gameTime: number) => boolean,
		private onEnd: (values: number[]) => void
	) {
        this.allCars = [userCar].concat(aiCars);
    }

    public onUpdate(scene: GameScene) {
        if (!this.started) {
            if (this.countDown.ready) {
                this.started = true;
                this.countDown.detach();
                for (let car of this.allCars)
                    car.carBehaviour.frozen = false;

                for (let car of this.allCars)
                    car.showMovingElements(true);
            }
        }
        else {
            for (let car of this.allCars) {
                let behaviour = car.carBehaviour;

                if (!behaviour.alive)
                    continue;

                let score = this.score(car.bodyChild.getTransformation().transform(new Point2D()));
                if (score < 1 && behaviour.lapScore > this.lapLength - 2)
                    behaviour.laps++;
                if (score > this.lapLength - 2 && behaviour.lapScore < 1)
                    behaviour.laps--;
                behaviour.lapScore = score;
                behaviour.totalScore = behaviour.laps * this.lapLength + behaviour.lapScore;
            }

			let carsData = (this.userCar ? [{ car: this.userCar.carBehaviour, ai: false }] : [])
				.concat(this.aiCars.map(c => ({ car: c.carBehaviour, ai: true })))
				.map(c => ({
					lap: c.car.laps + (c.car.lapScore >= 0 ? 1 : 0),
					alive: c.car.alive,
					ai: c.ai,
					active: c.car.isActive
				}));

			if (!this.finalScore && this.stopCondition(carsData, scene.gameTime)) {
				this.finalScore = this.aiCars.map(c => -c.carBehaviour.totalScore);
				this.whenToStop = scene.gameTime + 500;
			}
            if (this.finalScore && scene.gameTime > this.whenToStop)
                this.onEnd(this.finalScore);
        }
    }
}

class CameraBehaviour implements ScriptBehaviour {
	public zoom = 1;

	constructor(
		private aiCars: CarGameObject[],
		private userCar: CarGameObject,
		public viewport: { minX: number, minY: number, maxX: number, maxY: number }) {
	}

	public onUpdate(scene: GameScene, camera: GameObject) {
		camera.resetTransformation();

		let centerX = (this.viewport.minX + this.viewport.maxX) / 2,
			centerY = (this.viewport.minY + this.viewport.maxY) / 2;

		camera.transform(Transformation.forTranslation(-centerX, -centerY));

		let width = (this.viewport.maxX - this.viewport.minX) * this.zoom,
			height = (this.viewport.maxY - this.viewport.minY) * this.zoom;

		let screenWidth = scene.graphics.width(),
			screenHeight = scene.graphics.height();

		let carToFollow = this.userCar;

		if (!carToFollow || !carToFollow.carBehaviour.alive)
			for (let ai of this.aiCars)
				if (!carToFollow || ai.carBehaviour.totalScore > carToFollow.carBehaviour.totalScore)
					carToFollow = ai;

		let cameraX = screenWidth / 2,
			cameraY = screenHeight / 2;

		if (width > screenWidth && carToFollow)
			cameraX -= carToFollow.getTransformation().transform(new Point2D()).x * this.zoom;
		if (height > screenHeight && carToFollow)
			cameraY -= carToFollow.getTransformation().transform(new Point2D()).y * this.zoom;

		camera.transform(Transformation.forScale(this.zoom, this.zoom));
		camera.transform(Transformation.forTranslation(cameraX, cameraY));
	}
}

class UICameraBehaviour implements ScriptBehaviour {
	constructor() {
	}

	public onUpdate(scene: GameScene, camera: GameObject) {
		camera.resetTransformation();

		let screenWidth = scene.graphics.width(),
			screenHeight = scene.graphics.height();

		camera.transform(Transformation.forTranslation(screenWidth / 2, screenHeight / 2));
	}
}

class CounterGameObject extends GameObject {
    public text: DrawTextBehaviour;
	public countDownTime = 1900;
	public ready = false;

    constructor() {
        super();

        this.text = new DrawTextBehaviour("", 1000, 'white');
        this.drawBehaviour = this.text;
        this.transform(Transformation.forScale(200, 200));

		let back = new GameObject();
		back.drawBehaviour = new DrawRectBehaviour(999, 'rgba(0,0,0,0.3)');
		back.transform(Transformation.forScale(100000, 1));
		this.add(back);

		this.scriptBehaviours.add({
			onUpdate: (scene) => {
				if (scene.gameTime < this.countDownTime) {
					this.text.text = `${Math.floor((this.countDownTime - scene.gameTime) / 1000) + 1}`;
				}
				else {
					this.ready = true;
					this.detach();
				}

				back.drawBehaviour.color = `rgba(0,0,0,${0.2 + 0.4 * ((this.countDownTime - scene.gameTime) % 1000) / 1000})`
			}
		});
    }
}

class CarBehaviour implements ScriptBehaviour {
    public frozen = true;
    public alive = true;

    public totalScore: number = 0;
    public lapScore: number = 0;
    public laps: number = 0;

	private bestScore: number = Number.MIN_VALUE;
	public inactiveFrom: number = 0;
	public activeFrom: number = 0;
	public isActive: boolean = true;

    private currentSpeed: number = 0;

    private input: (scene: GameScene, car: CarGameObject) => { direction: number, speed: number };

    constructor(input: (scene: GameScene, car: CarGameObject) => { direction: number, speed: number }) {
        this.input = input;
    }

    public static kill(car: CarGameObject) {
        car.carBehaviour.alive = false;
		car.carBehaviour.isActive = false;

        for (let collider of car.bodyChild.children)
            if (collider.colliderBehaviour != null)
                collider.detach();

		car.paint(car.killedColor);
        car.bodyChild.drawBehaviour.depth = -1;
    }

    public onUpdate(scene: GameScene, gameObject: GameObject, timeDiff: number) {
        let car = <CarGameObject>gameObject;

        car.scoreTextBox.text = `${Math.round(this.totalScore * 10) / 10} m`;

		if (this.frozen) {
			this.inactiveFrom = scene.gameTime;
			this.activeFrom = Number.MIN_VALUE;
		}

        if (!this.alive || this.frozen)
            return;

		if (this.totalScore > this.bestScore + timeDiff / 10000) {
			this.bestScore = this.totalScore;
			this.inactiveFrom = scene.gameTime;
			if (!this.isActive && scene.gameTime - this.activeFrom > 500) {
				this.isActive = true;
				car.paint(car.color);
			}
		}
		else {
			this.activeFrom = scene.gameTime;
			if (this.isActive && scene.gameTime - this.inactiveFrom > 500) {
				this.isActive = false;
				car.paint(car.inactiveColor);
			}
		}

        let input = this.input(scene, car);
        input.speed = Math.max(Math.min(input.speed, 1), -1);

        let transform = car.bodyChild.getTransformation();
        let position = transform.transform(new Point2D());
        let directon = transform.transformVector(new Vector2D(0, -1)).normalized();
        let acceleration = 0.01 * timeDiff;
        this.currentSpeed += Math.max(Math.min(input.speed - this.currentSpeed, acceleration), -acceleration);
        let speed = timeDiff / 6 * this.currentSpeed;
        let rotationSpeed = timeDiff / 400 * Math.max(Math.min(input.direction, 1), -1);

        car.transform(Transformation.forTranslation(directon.x * speed, directon.y * speed));
        car.bodyChild.transform(Transformation.forRotation(rotationSpeed));

        let stillAlive = true;
        for (let collider of car.boxColliders) {
            for (let collision of collider.collisions) {
                if (collision.trigger instanceof WallCollider)
                    stillAlive = false;
            }
        }

        if (!stillAlive)
            CarBehaviour.kill(car);
    }
}

class SensorGameObject extends GameObject {
    private drawChild: GameObject;

    constructor(rotation: number, radius: number) {
        super();

        let d = 0.5 / Math.abs(Math.cos(Math.abs(rotation + Math.PI / 4) % (Math.PI / 2) - Math.PI / 4)) - 0.5;

        this.colliderBehaviour = new ColliderBehaviour(false, true);
        this.transform(Transformation.forRotation(Math.PI * 1.5));
        this.transform(Transformation.forTranslation(0, -.5));
        this.transform(Transformation.forScale(1, radius - d - 0.5));
        this.transform(Transformation.forTranslation(0, -0.5 - d));
        this.transform(Transformation.forRotation(rotation));

        this.drawChild = new GameObject();
        this.drawChild.drawBehaviour = new DrawLineBehaviour(-50, 'hsl(104, 15%, 50%)', 1);
        this.add(this.drawChild);

        this.scriptBehaviours.add({
            onUpdate: (scene: GameScene, gameObject: GameObject) => { this.updateDisplay(); }
        });
    }

    public getLength() {
        return Array.from(this.colliderBehaviour.collisions).reduce((p, c) => c.trigger instanceof WallCollider ? Math.min(p, c.position.x + 0.5) : p, 1);
    }

    public setVisible(visible: boolean) {
        this.drawChild.drawBehaviour.visible = visible;
    }

    public updateDisplay() {
        let length = this.getLength();

        this.drawChild.resetTransformation();
        this.drawChild.transform(Transformation.forScale(length, 1));
        this.drawChild.transform(Transformation.forTranslation(-0.5 + length / 2, 0));
    }
}

class CarGameObject extends GameObject {
    carBehaviour: CarBehaviour;
    bodyChild: GameObject;
    scoreTextBox: DrawTextBehaviour;
    colliders: SensorGameObject[] = [];
    boxColliders: ColliderBehaviour[] = [];
    radiusGameObject: GameObject;

	color: { main: string, additonal: string };
	inactiveColor: { main: string, additonal: string };
	killedColor: { main: string, additonal: string };

	paint(color: { main: string, additonal: string }) {
		this.bodyChild.drawBehaviour.color = color.main;
		this.scoreTextBox.color = color.additonal;

		for (let collider of this.bodyChild.children)
			if (collider.drawBehaviour)
				collider.drawBehaviour.color = color.additonal;
	}

    constructor(behaviour: CarBehaviour, inputs: number, userCar: boolean, sensorLength: number) {
        super();

		let carSize = 20;

		if (userCar)
			this.color = { main: 'hsl(195, 85%, 60%)', additonal: 'hsl(195, 85%, 20%)' };
		else
			this.color = { main: 'hsl(30, 85%, 60%)', additonal: 'hsl(30, 85%, 20%)' };

		this.killedColor = { main: 'rgb(105, 132, 95)', additonal: 'rgb(105, 132, 95)' };
		this.inactiveColor = { main: 'rgb(150, 150, 150)', additonal: 'rgb(80, 80, 80)' };

        let depth = userCar ? 10 : 0;

        this.scriptBehaviours.add(behaviour);
        this.carBehaviour = behaviour;

        this.bodyChild = new GameObject();
        this.bodyChild.drawBehaviour = new DrawRectBehaviour(depth, 'white');
        this.bodyChild.transform(Transformation.forScale(carSize, carSize));
        this.add(this.bodyChild);

        let scoreGameObject = new GameObject();
        this.scoreTextBox = new DrawTextBehaviour('', depth + 2, 'white');
        scoreGameObject.drawBehaviour = this.scoreTextBox;
        scoreGameObject.transform(Transformation.forScale(16, 16));
        scoreGameObject.transform(Transformation.forTranslation(0, 20));
        scoreGameObject.drawBehaviour.visible = false;
        this.add(scoreGameObject);

        let collidersRotations = Array(inputs).fill(0).map((v, i) => i * Math.PI / (inputs - 1) - Math.PI / 2);

        let colliderRadius = sensorLength /= carSize;

        for (let rotation of collidersRotations) {

            let d = 0.5 / Math.abs(Math.cos(Math.abs(rotation + Math.PI / 4) % (Math.PI / 2) - Math.PI / 4)) - 0.5;

            let collider = new SensorGameObject(rotation, colliderRadius);
            this.bodyChild.add(collider);
            this.colliders.push(collider);
        }

        for (let rotation of [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5]) {

            let collider = new GameObject();
            collider.colliderBehaviour = new ColliderBehaviour(false, true);
            collider.transform(Transformation.forTranslation(0, -.5));
            collider.transform(Transformation.forRotation(rotation));
            collider.drawBehaviour = new DrawLineBehaviour(depth + 1, 'white');
            this.bodyChild.add(collider);
            this.boxColliders.push(collider.colliderBehaviour);
        }

        this.showMovingElements(false);
		this.paint(this.color);
    }

    public showMovingElements(visible: boolean) {
        for (let collder of this.colliders)
            collder.setVisible(visible);

        this.scoreTextBox.visible = visible;
    }
}

class PointPointGameObject extends GameObject {
    constructor(a: Point2D, b: Point2D) {
        super();

        let position = new Point2D((a.x + b.x) / 2, (a.y + b.y) / 2);
        let length = a.vectorTo(b).d();
        let rotation = Math.atan2(a.y - b.y, a.x - b.x);

        this.transform(Transformation.forScale(length, length));
        this.transform(Transformation.forRotation(rotation));
        this.transform(Transformation.forTranslation(position.x, position.y));
    }
}

class WallCollider extends ColliderBehaviour {
    constructor() {
        super(true, false);
    }
}

class StepCollider extends ColliderBehaviour {
    distance: number;

    constructor(distance: number) {
        super(true, false);
        this.distance = distance;
    }
}

class WallGameObject extends PointPointGameObject {
    constructor(a: Point2D, b: Point2D) {
        super(a, b);

        this.colliderBehaviour = new WallCollider();
        this.drawBehaviour = new DrawLineBehaviour(10, 'rgb(85, 112, 75)', 2);
    }
}

class GroundGameObject extends GameObject {
    constructor(x: number, y: number, rotation: number, width: number, height: number) {
        super();

        this.drawBehaviour = new DrawRectBehaviour(-300, 'rgb(165, 192, 155)');
        this.transform(Transformation.forScale(width, height));
        this.transform(Transformation.forRotation(rotation));
        this.transform(Transformation.forTranslation(x, y));
    }
}

interface GameParams {
	sensorLength: number,
	maxTrackWidth: number,
	maxTrackHeight: number,
	trackSegmentSize: number,
	trackSegmentFill: number,
	trackCornerCut: number
}

export class Race implements HostedGame {
    private gameScene: GameScene;
    private end: Promise<number[]>;
    private onEnd: (values: number[]) => void;

    private static generateMap(holder: GameObject, params: GameParams) {
        enum Direction {
            Up, Down, Left, Right
        };

        let pointsDistance = params.trackSegmentSize;

        let trackFill = params.trackSegmentFill;
        let cornerFill = params.trackCornerCut;

        let columns = params.maxTrackWidth;
        let rows = params.maxTrackHeight;

        let start = {
            x: Math.floor(columns / 2),
            y: Math.floor(rows / 2)
        };

        let grid = Array(rows).fill(0).map(e => Array<boolean>(columns).fill(false));
        let flood = Array(rows).fill(0).map(e => Array<number>(columns).fill(0));
        let scores = Array(rows).fill(0).map(e => Array<(p: Point2D) => number>(columns).fill(null));

        let directions = (x, y) =>
            [{ x: 0, y: -1, d: Direction.Up }, { x: 1, y: 0, d: Direction.Right }, { x: -1, y: 0, d: Direction.Left }, { x: 0, y: 1, d: Direction.Down }]
                .map(e => ({ x: x + e.x, y: y + e.y, d: e.d }))
                .filter(e => e.x >= 0 && e.y >= 0 && e.x < columns && e.y < rows);

        let points: { x: number, y: number, direction: Direction }[] = [];
        for (let current = start, length = 0; !grid[current.y][current.x]; length++) {
            grid[current.y][current.x] = true;

            for (let queue = [start]; queue.length != 0;) {
                let top = queue.pop();
                if (flood[top.y][top.x] != length) {
                    flood[top.y][top.x] = length;
                    for (let dir of directions(top.x, top.y).filter(e => !grid[e.y][e.x] && flood[e.y][e.x] != length))
                        queue.push(dir);
                }
            }

            let dir = directions(current.x, current.y)
                .filter(d => flood[d.y][d.x] == length)
                .filter(e => length > 1 || e.d == Direction.Up)
                .map(v => ({ v: v, o: Math.random() }))
                .sort((a, b) => a.o - b.o)
                .map(e => e.v)
            [0];

            points.push({
                x: current.x,
                y: current.y,
                direction: dir.d
            });

            current = dir;
        }

        points.push(points.shift());
        let tracks = points.map((v, i, a) => ({
            x: v.x,
            y: v.y,
            realX: (0.5 + v.x) * pointsDistance,
            realY: (0.5 + v.y) * pointsDistance,
            from: a[(i == 0 ? a.length : i) - 1].direction,
            to: v.direction
        }));

		let viewport = { minX: Number.MAX_VALUE, minY: Number.MAX_VALUE, maxX: Number.MIN_VALUE, maxY: Number.MIN_VALUE };

        for (let i = 0; i < tracks.length; i++) {
            let track = tracks[i];

			viewport.minX = Math.min(viewport.minX, track.realX - pointsDistance / 2);
			viewport.minY = Math.min(viewport.minY, track.realY - pointsDistance / 2);
			viewport.maxX = Math.max(viewport.maxX, track.realX + pointsDistance / 2);
			viewport.maxY = Math.max(viewport.maxY, track.realY + pointsDistance / 2);

            let go = new GameObject();
            go.transform(Transformation.forScale(pointsDistance, pointsDistance));

            let score: (p: Point2D) => number;

            if (track.from == track.to) {
                go.add(new WallGameObject(new Point2D(-0.5 * trackFill, -0.5), new Point2D(-0.5 * trackFill, 0.5)));
                go.add(new WallGameObject(new Point2D(0.5 * trackFill, -0.5), new Point2D(0.5 * trackFill, 0.5)));

                go.add(new GroundGameObject(0, 0, 0, trackFill, 1.01));

                if (i == 0) {
                    let lineGO = new GameObject();
                    lineGO.transform(Transformation.forScale(trackFill, 0.3));
                    lineGO.drawBehaviour = new DrawRectBehaviour(-290, 'hsl(104, 15%, 60%)');
                    go.add(lineGO);
                }

                if (track.to == Direction.Right)
                    go.transform(Transformation.forRotation(Math.PI * 0.5));
                if (track.to == Direction.Down)
                    go.transform(Transformation.forRotation(Math.PI));
                if (track.to == Direction.Left)
                    go.transform(Transformation.forRotation(Math.PI * 1.5));

                go.transform(Transformation.forTranslation(track.realX, track.realY));

                let transform = go.transformBehaviour.transformation;
                score = p => i - transform.inversed.transform(p).y;
            }
            else {
                let d = trackFill,
                    c = cornerFill,
                    l = (1 - d) / 2,
                    h = l * c,
                    k = d * Math.SQRT2 - d + h;

                go.add(new WallGameObject(new Point2D(-0.5 + l, 0.5), new Point2D(-0.5 + l, 0.5 - h)));
                go.add(new WallGameObject(new Point2D(-0.5, 0.5 - l), new Point2D(-0.5 + h, 0.5 - l)));
                go.add(new WallGameObject(new Point2D(-0.5 + l, 0.5 - h), new Point2D(-0.5 + h, 0.5 - l)));

                go.add(new WallGameObject(new Point2D(0.5 - l, 0.5), new Point2D(0.5 - l, 0.5 - k)));
                go.add(new WallGameObject(new Point2D(-0.5, -0.5 + l), new Point2D(-0.5 + k, -0.5 + l)));
                go.add(new WallGameObject(new Point2D(0.5 - l, 0.5 - k), new Point2D(-0.5 + k, -0.5 + l)));

                go.add(new GroundGameObject(-0.5 + k / 2, 0, 0, k + 0.01, trackFill));
                go.add(new GroundGameObject((k + h - 1) / 4, (1 - k - h) / 4, Math.PI / 4, (1 - k - l) * Math.SQRT2, trackFill));
                go.add(new GroundGameObject(0, 0.5 - k / 2, 0, trackFill, k + 0.01));

                if (track.from == Direction.Up && track.to == Direction.Right)
                    go.transform(Transformation.forRotation(Math.PI * 1.5));
                if (track.from == Direction.Left && track.to == Direction.Up)
                    go.transform(Transformation.forRotation(Math.PI));
                if (track.from == Direction.Down && track.to == Direction.Left)
                    go.transform(Transformation.forRotation(Math.PI * 0.5));

                if (track.from == Direction.Right && track.to == Direction.Up)
                    go.transform(Transformation.forScale(1, -1));
                if (track.from == Direction.Up && track.to == Direction.Left)
                    go.transform(Transformation.forScale(1, -1).combine(Transformation.forRotation(Math.PI * 1.5)));
                if (track.from == Direction.Left && track.to == Direction.Down)
                    go.transform(Transformation.forScale(1, -1).combine(Transformation.forRotation(Math.PI * 1)));
                if (track.from == Direction.Down && track.to == Direction.Right)
                    go.transform(Transformation.forScale(1, -1).combine(Transformation.forRotation(Math.PI * 0.5)));

                go.transform(Transformation.forTranslation(track.realX, track.realY));

                let transform = go.transformBehaviour.transformation;
                score = p => {
                    p = transform.inversed.transform(p);
                    return i + 0.5 - Math.atan2(-p.y + 0.5, p.x + 0.5) / (Math.PI / 2)
                };
            }

            holder.add(go);

            scores[track.y][track.x] = score;
        }

		let background = new GameObject();
		background.drawBehaviour = new DrawRectBehaviour(-1000, 'hsl(104, 15%, 50%)');
		background.transform(Transformation.forScale(viewport.maxX - viewport.minX + 20, viewport.maxY - viewport.minY + 20));
		background.transform(Transformation.forTranslation((viewport.maxX + viewport.minX) / 2, (viewport.maxY + viewport.minY) / 2));
		holder.add(background);

        return {
			viewport: viewport,
            score: (p: Point2D): number => {
                let x = Math.floor(p.x / pointsDistance),
                    y = Math.floor(p.y / pointsDistance);

                if (scores[y] && scores[y][x])
                    return scores[y][x](p);
                else
                    return -1;
            },
            start: { x: tracks[0].realX, y: tracks[0].realY },
            length: tracks.length
        };
    }

    constructor(
		networks: NeuralNetwork[],
		input: InputInterface,
		graphics: GraphicalInterface,
		gameParams: GameParams,
		endCondition: (cars: { lap: number, ai: boolean, alive: boolean }[], gameTime: number) => boolean) {
		graphics.clear();

        let scene = new GameScene(graphics, input);

		let camera = new GameObject();
		let uiCamera = new GameObject();

		scene.add(camera);
		scene.add(uiCamera);

        let map = Race.generateMap(camera, gameParams);
        let startPoint = map.start
        let score = map.score;
        let lapLength = map.length;

		let sensorLength = gameParams.sensorLength;

        let userCar = new CarGameObject(new CarBehaviour((scene, car) => {
            let input = { speed: 0, direction: 0 };
            if (scene.input.down())
                input.speed = -1;
            if (scene.input.up())
                input.speed = 1;
            if (scene.input.left())
                input.direction = -1;
            if (scene.input.right())
                input.direction = 1;
            return input;
        }), 0, true, sensorLength);
        userCar.transform(Transformation.forTranslation(startPoint.x, startPoint.y));
        camera.add(userCar);

        var aiCars = networks.map(n => {
            let car = new CarGameObject(new CarBehaviour(((scene, car) => {
                var inputs = car.colliders.map(c => c.getLength());

                var nnOutputs = n.passValues(inputs);

                return {
                    speed: nnOutputs[0] * 2 - 1,
                    direction: nnOutputs[1] * 2 - 1
                };
            })), n.inputs, false, sensorLength);
            car.transform(Transformation.forTranslation(startPoint.x, startPoint.y));

            camera.add(car);
            return car;
        });

        let counter = new CounterGameObject();
        uiCamera.add(counter);

        this.end = new Promise<number[]>((p, r) => {
            this.onEnd = p;
        });

        let raceScript = new RaceBehaviour(aiCars, userCar, lapLength, p => score(camera.transformBehaviour.transformation.inversed.transform(p)), counter, endCondition, this.onEnd);
        scene.scriptBehaviours.add(raceScript);

		camera.scriptBehaviours.add(new CameraBehaviour(aiCars, userCar, map.viewport));
		uiCamera.scriptBehaviours.add(new UICameraBehaviour());

        this.gameScene = scene;
    }

    public async run(): Promise<number[]> {
        this.gameScene.start();

        var result = await this.end;

        this.gameScene.stop();

        return result;
    }

	public stop() {
        this.gameScene.stop();

		this.onEnd(null);
	}
}

export class RaceGenerator implements HostedGameGenerator {
	constructor(
		private gameParams: GameParams,
		private endCondition: (cars: { lap: number, ai: boolean, alive: boolean }[], gameTime: number) => boolean) {
	}

	generate = (networks: NeuralNetwork[], input: InputInterface, graphics: GraphicalInterface) => {
		return new Race(networks, input, graphics, this.gameParams, this.endCondition);
	}

	nnOutputs = 2;
}