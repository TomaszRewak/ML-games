import { GraphicalInterface } from './GraphicalInterface'
import { InputInterface } from './InputInterface'
import { Transformation, Point2D, Vector2D } from './GraphicsMath'

export class GameObject {
    public parent: GameObject;
    public children: Set<GameObject> = new Set<GameObject>();

    public transformBehaviour: TransformBehaviour = new TransformBehaviour();
    public drawBehaviour: DrawBehaviour = null;
    public colliderBehaviour: ColliderBehaviour = null;
    public scriptBehaviours: Set<ScriptBehaviour> = new Set();

    constructor() {
    }

    public add(gameObject: GameObject) {
        gameObject.detach();
        this.children.add(gameObject);
        gameObject.parent = this;
    }

    public detach() {
        if (this.parent) {
            this.parent.children.delete(this);
            this.parent = null;
        }
    }

    public *iterator(): Iterable<GameObject> {
        yield this;
        for (let child of this.children)
            yield* child.iterator();
    }

    public *transformIterator(transform = null): Iterable<{ gameObject: GameObject, transform: Transformation }> {

        transform = transform ? this.transformBehaviour.transformation.combine(transform) : this.transformBehaviour.transformation;

        yield { gameObject: this, transform: transform }
        for (let child of this.children)
            yield* child.transformIterator(transform);
    }

    public getTransformation() {
        let transform = this.transformBehaviour.transformation;
        for (let go = this.parent; go; go = go.parent)
            transform = transform.combine(go.transformBehaviour.transformation);

        return transform ? transform : new Transformation();
    }

    public transform(transformation: Transformation) {
        this.transformBehaviour.transform(transformation);
    }

    public resetTransformation() {
        this.transformBehaviour = new TransformBehaviour();
    }
}

interface Behaviour { }

abstract class DrawBehaviour implements Behaviour {
    public depth: number;
    public color: string;
    public visible: boolean = true;

    constructor(color: string, depth: number) {
        this.depth = depth;
        this.color = color;
    }

    public abstract draw(graphicsInterface: GraphicalInterface, transform: Transformation);
}

export class DrawRectBehaviour extends DrawBehaviour {
    constructor(color: string = '', depth: number = 0) {
        super(color, depth);
    }

    public draw(graphicsInterface: GraphicalInterface, transform: Transformation) {
        graphicsInterface.fillRect(transform, this.color);
    }
}

export class DrawCircleBehaviour extends DrawBehaviour {
    constructor(color: string = '', depth: number = 0) {
        super(color, depth);
    }

    public draw(graphicsInterface: GraphicalInterface, transform: Transformation) {
        graphicsInterface.fillCircle(transform, this.color);
    }
}

export class DrawLineBehaviour extends DrawBehaviour {
    constructor(color: string = '', depth: number = 0, private width = 1) {
        super(color, depth);
    }

    public draw(graphicsInterface: GraphicalInterface, transform: Transformation) {
        graphicsInterface.drawLine(transform, this.color, this.width);
    }
}

export class DrawTextBehaviour extends DrawBehaviour {
    public color: string;
    constructor(public text: string = '', color: string = '', depth: number = 0, private align: string = undefined, private baseline: string = undefined, private font: string = undefined) {
        super(color, depth);
    }

    public draw(graphicsInterface: GraphicalInterface, transform: Transformation) {
        graphicsInterface.drawText(transform, this.text, this.color, this.align, this.baseline, this.font);
    }
}

export class TransformBehaviour implements Behaviour {
    public transformation: Transformation;

    constructor(transformation: Transformation = new Transformation()) {
        this.transformation = transformation;
    }

    public transform(transformation: Transformation) {
        this.transformation = this.transformation.combine(transformation);
    }
}

class Collision {
    position: Point2D;
    normal: Vector2D;
    trigger: ColliderBehaviour;

    constructor(position: Point2D, normal: Vector2D, trigger: Trigger) {
        this.position = position;
        this.normal = normal;
        this.trigger = trigger.collider;
    }
}

class SimpleQuadTree {
    public minX: number;
    public maxX: number;
    public minY: number;
    public maxY: number;

    private triggers: Trigger[] = [];
    private children: SimpleQuadTree[] = [];

    constructor(triggers: Trigger[]) {
        let avgX = 0,
            avgY = 0;

        this.minX = this.minY = Number.MAX_VALUE;
        this.maxX = this.maxY = Number.MIN_VALUE;

        for (let trigger of triggers) {
            avgX += trigger.center.x;
            avgY += trigger.center.y;

            this.minX = Math.min(this.minX, Math.min(trigger.pointA.x, trigger.pointB.x));
            this.maxX = Math.max(this.maxX, Math.max(trigger.pointA.x, trigger.pointB.x));
            this.minY = Math.min(this.minY, Math.min(trigger.pointA.y, trigger.pointB.y));
            this.maxY = Math.max(this.maxY, Math.max(trigger.pointA.y, trigger.pointB.y));
        }

		let splitPoint = new Point2D(avgX / triggers.length, avgY / triggers.length);

		let I: Trigger[] = [],
			II: Trigger[] = [],
			III: Trigger[] = [],
			IV: Trigger[] = [];

		for (let trigger of triggers) {
			let left = trigger.pointA.x < splitPoint.x && trigger.pointB.x < splitPoint.x,
				right = trigger.pointA.x > splitPoint.x && trigger.pointB.x > splitPoint.x,
				up = trigger.pointA.y < splitPoint.y && trigger.pointB.y < splitPoint.y,
				down = trigger.pointA.y > splitPoint.y && trigger.pointB.y > splitPoint.y;

			if (up) I.push(trigger);
			else if (down) II.push(trigger);
			else if (left) III.push(trigger);
			else if (right) IV.push(trigger);
			else this.triggers.push(trigger);
		}

		for (let tree of [I, II, III, IV]) {
			if (tree.length == triggers.length)
				this.triggers = this.triggers.concat(triggers);
			else if (tree.length) {
				this.children.push(new SimpleQuadTree(tree));
			}
		}
    }

    public *getTriggers(t: Trigger): IterableIterator<Trigger> {
        if (t.maxX < this.minX || t.maxY < this.minY || t.minX > this.maxX || t.minY > this.maxY)
            return;

        yield* this.triggers;

        for (let child of this.children)
            yield* child.getTriggers(t);
    }
}

class Trigger {
    public collider: ColliderBehaviour;
    public pointA: Point2D;
    public pointB: Point2D;
    public center: Point2D;

    public minX: number;
    public maxX: number;
    public minY: number;
    public maxY: number;

    constructor(collider: ColliderBehaviour, transform: Transformation) {
        this.collider = collider;

        this.pointA = transform.transform(new Point2D(-0.5, 0));
        this.pointB = transform.transform(new Point2D(0.5, 0));
        this.center = transform.transform(new Point2D());

        this.minX = Math.min(this.pointA.x, this.pointB.x);
        this.maxX = Math.max(this.pointA.x, this.pointB.x);
        this.minY = Math.min(this.pointA.y, this.pointB.y);
        this.maxY = Math.max(this.pointA.y, this.pointB.y);
    }
}

class Collider extends Trigger {
    public collider: ColliderBehaviour;
    public transform: Transformation;

    constructor(collider: ColliderBehaviour, transform: Transformation) {
        super(collider, transform);

        this.collider = collider;
        this.transform = transform;
    }

    public collide(trigger: Trigger) {
        if (trigger.collider == this.collider)
            return;

        let a = this.transform.inversed.transform(trigger.pointA);
        let b = this.transform.inversed.transform(trigger.pointB);

        if (a.y == b.y || a.y < 0 && b.y < 0 || a.y > 0 && b.y > 0)
            return;

        let n = a.vectorTo(b).normal();
        let t = (n.x * a.x + n.y * a.y) / n.x;

        if (t >= -0.5 && t <= 0.5)
            this.collider.collisions.add(new Collision(new Point2D(t, 0), n, trigger));
    }
}

export class ColliderBehaviour implements Behaviour {
    active: boolean = true;
    isTrigger: boolean;
    isTriggered: boolean;

    collisions: Set<Collision> = new Set();

    constructor(isTrigger: boolean = true, isTriggered: boolean = true) {
        this.isTrigger = isTrigger;
        this.isTriggered = isTriggered;
    }
}

export interface ScriptBehaviour extends Behaviour {
    onUpdate?(scene: GameScene, gameObject: GameObject, timeDiff: number);
    postUpdate?(scene: GameScene, gameObject: GameObject, timeDiff: number);
}

enum GameState {
    Running,
    Stopping,
    Stopped
}

export class GameScene extends GameObject {
    protected graphicalInterface: GraphicalInterface;
    protected inputInterface: InputInterface;
    public get input() { return this.inputInterface; }
    public get graphics() { return this.graphicalInterface; }
    public get width() { return this.graphicalInterface.width(); }
    public get height() { return this.graphicalInterface.height(); }

	private realTime: number = 0;
	public gameTime: number = 0;

    public showFPS = true;
    public debug = false;

    public constructor(graphicsInterface: GraphicalInterface, inputInterface: InputInterface) {
        super();

        this.graphicalInterface = graphicsInterface;
        this.inputInterface = inputInterface;
    }

    private debugColliders(colliders: Collider[]) {
        for (let collider of colliders) {
            for (let collision of collider.collider.collisions) {
                let p = collider.transform.transform(collision.position);
                this.graphicalInterface.fillCircle(Transformation.forScale(5, 5).combine(Transformation.forTranslation(p.x, p.y)), "rgba(0, 155, 0, 0.4)");
            }
        }
    }

    private frameBegin: number;
    private fps: number = 0;
    private framesCount: number = 0;

    private debugFrames() {
        let now = Date.now();
        if (!this.frameBegin) this.frameBegin = now;

        if (now - this.frameBegin > 100) {
            this.frameBegin = now;
            this.fps = this.framesCount * 10;
            this.framesCount = 0;
        }

        this.framesCount++;

        this.graphicalInterface.drawText(Transformation.forScale(15, 15).combine(Transformation.forTranslation(40, 20)), `${this.fps} fps`, 'black');
    }

    private frame(timestamp: number) {
        var scene = this;

		if (!this.realTime) this.realTime = timestamp;
		let timeDiff = Math.min(timestamp - this.realTime, 1000 / 30);
		this.realTime = timestamp;
		this.gameTime += timeDiff;

        this.graphicalInterface.clear();

        let triggers: Trigger[] = [];
        let colliders: Collider[] = [];
        for (let got of this.transformIterator()) {
            if (got.gameObject.colliderBehaviour) {
                got.gameObject.colliderBehaviour.collisions.clear();
                if (got.gameObject.colliderBehaviour.isTrigger)
                    triggers.push(new Trigger(got.gameObject.colliderBehaviour, got.transform));
                if (got.gameObject.colliderBehaviour.isTriggered)
                    colliders.push(new Collider(got.gameObject.colliderBehaviour, got.transform));
            }
        }
        let quadTree = new SimpleQuadTree(triggers);

        for (let collider of colliders)
            for (let trigger of quadTree.getTriggers(collider))
                collider.collide(trigger);

        for (let gameObject of this.iterator())
            for (let script of gameObject.scriptBehaviours)
				if (script.onUpdate)
					script.onUpdate(this, gameObject, timeDiff);

		for (let gameObject of this.iterator())
            for (let script of gameObject.scriptBehaviours)
				if (script.postUpdate)
					script.postUpdate(this, gameObject, timeDiff);

		let drawElements = Array.from(this.transformIterator())
			.filter(e => e.gameObject.drawBehaviour != null && e.gameObject.drawBehaviour.visible)
			.sort((a, b) => a.gameObject.drawBehaviour.depth - b.gameObject.drawBehaviour.depth);

        for (let element of drawElements)
            element.gameObject.drawBehaviour.draw(this.graphicalInterface, element.transform);

        if (this.debug)
            this.debugColliders(colliders);

        if (this.showFPS)
            this.debugFrames();
    }

    private gameState: GameState = GameState.Stopped;

    public start() {
        if (this.gameState == GameState.Stopped) {
            this.gameState = GameState.Running;
            let step = (timestamp) => {
                this.frame(timestamp);

                if (this.gameState == GameState.Running)
                    requestAnimationFrame(step);
                else this.gameState = GameState.Stopped;
            }
            requestAnimationFrame(step);
        }
    }

    public stop() {
        this.gameState = GameState.Stopped;
    }
}