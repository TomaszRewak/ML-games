// ******************************************** 
// * By Tomasz Rewak (tomasz-rewak.com, linkedin.com/in/tomaszrewak) 
// * Copyright (c) 2016 Tomasz Rewak 
// * Released under the The MIT License (MIT). 
// ******************************************** 


(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
class GeneticAlgorithm {
    constructor(initialPopulation, fitnessFunction, stopCondition, selectFunction, mutateFunction, crossFunction, mutationRate, crossRate, onNewGeneration) {
        this.onNewGeneration = onNewGeneration;
        this._bestSpecimen = { specimen: null, score: Number.MAX_VALUE };
        this._generation = 0;
        this.population = initialPopulation.map(v => v.slice());
        this.fitnessFunction = fitnessFunction;
        this.stopCondition = stopCondition;
        this.selectFunction = selectFunction;
        this.mutateFunction = mutateFunction;
        this.crossFunction = crossFunction;
        this.mutationRate = mutationRate;
        this.crossRate = crossRate;
    }
    get bestSpecimen() { return this._bestSpecimen; }
    get generation() { return this._generation; }
    run() {
        return __awaiter(this, void 0, Promise, function* () {
            while (!this.stopCondition()) {
                if (this.onNewGeneration)
                    this.onNewGeneration(this._generation);
                var oldPopulation = this.population;
                var newPopulation = [];
                var popSize = oldPopulation.length;
                var fitness = yield this.fitnessFunction(oldPopulation);
                if (!fitness)
                    return;
                var bestSpecimen = fitness.map((v, i) => ({ specimen: oldPopulation[i], score: v })).reduce((p, c) => p.score < c.score ? p : c);
                if (bestSpecimen.score < this._bestSpecimen.score)
                    this._bestSpecimen = bestSpecimen;
                let selector = this.selectFunction(fitness);
                while (newPopulation.length < popSize) {
                    let specimen = oldPopulation[selector.next().value];
                    if (this.crossRate())
                        specimen = this.crossFunction(specimen, oldPopulation[selector.next().value]);
                    if (this.mutationRate())
                        specimen = this.mutateFunction(specimen);
                    newPopulation.push(specimen);
                }
                this.population = newPopulation;
                this._generation++;
            }
        });
    }
}
exports.GeneticAlgorithm = GeneticAlgorithm;
;

},{}],2:[function(require,module,exports){
"use strict";
const GraphicsMath_1 = require('./GraphicsMath');
class GameObject {
    constructor() {
        this.children = new Set();
        this.transformBehaviour = new TransformBehaviour();
        this.drawBehaviour = null;
        this.colliderBehaviour = null;
        this.scriptBehaviours = new Set();
    }
    add(gameObject) {
        gameObject.detach();
        this.children.add(gameObject);
        gameObject.parent = this;
    }
    detach() {
        if (this.parent) {
            this.parent.children.delete(this);
            this.parent = null;
        }
    }
    *iterator() {
        yield this;
        for (let child of this.children)
            yield* child.iterator();
    }
    *transformIterator(transform = null) {
        transform = transform ? this.transformBehaviour.transformation.combine(transform) : this.transformBehaviour.transformation;
        yield { gameObject: this, transform: transform };
        for (let child of this.children)
            yield* child.transformIterator(transform);
    }
    getTransformation() {
        let transform = this.transformBehaviour.transformation;
        for (let go = this.parent; go; go = go.parent)
            transform = transform.combine(go.transformBehaviour.transformation);
        return transform ? transform : new GraphicsMath_1.Transformation();
    }
    transform(transformation) {
        this.transformBehaviour.transform(transformation);
    }
    resetTransformation() {
        this.transformBehaviour = new TransformBehaviour();
    }
}
exports.GameObject = GameObject;
class DrawBehaviour {
    constructor(color, depth) {
        this.visible = true;
        this.depth = depth;
        this.color = color;
    }
}
class DrawRectBehaviour extends DrawBehaviour {
    constructor(color = '', depth = 0) {
        super(color, depth);
    }
    draw(graphicsInterface, transform) {
        graphicsInterface.fillRect(transform, this.color);
    }
}
exports.DrawRectBehaviour = DrawRectBehaviour;
class DrawCircleBehaviour extends DrawBehaviour {
    constructor(color = '', depth = 0) {
        super(color, depth);
    }
    draw(graphicsInterface, transform) {
        graphicsInterface.fillCircle(transform, this.color);
    }
}
exports.DrawCircleBehaviour = DrawCircleBehaviour;
class DrawLineBehaviour extends DrawBehaviour {
    constructor(color = '', depth = 0, width = 1) {
        super(color, depth);
        this.width = width;
    }
    draw(graphicsInterface, transform) {
        graphicsInterface.drawLine(transform, this.color, this.width);
    }
}
exports.DrawLineBehaviour = DrawLineBehaviour;
class DrawTextBehaviour extends DrawBehaviour {
    constructor(text = '', color = '', depth = 0, align = undefined, baseline = undefined, font = undefined) {
        super(color, depth);
        this.text = text;
        this.align = align;
        this.baseline = baseline;
        this.font = font;
    }
    draw(graphicsInterface, transform) {
        graphicsInterface.drawText(transform, this.text, this.color, this.align, this.baseline, this.font);
    }
}
exports.DrawTextBehaviour = DrawTextBehaviour;
class TransformBehaviour {
    constructor(transformation = new GraphicsMath_1.Transformation()) {
        this.transformation = transformation;
    }
    transform(transformation) {
        this.transformation = this.transformation.combine(transformation);
    }
}
exports.TransformBehaviour = TransformBehaviour;
class Collision {
    constructor(position, normal, trigger) {
        this.position = position;
        this.normal = normal;
        this.trigger = trigger.collider;
    }
}
class SimpleQuadTree {
    constructor(triggers) {
        this.triggers = [];
        this.children = [];
        let avgX = 0, avgY = 0;
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
        let splitPoint = new GraphicsMath_1.Point2D(avgX / triggers.length, avgY / triggers.length);
        let I = [], II = [], III = [], IV = [];
        for (let trigger of triggers) {
            let left = trigger.pointA.x < splitPoint.x && trigger.pointB.x < splitPoint.x, right = trigger.pointA.x > splitPoint.x && trigger.pointB.x > splitPoint.x, up = trigger.pointA.y < splitPoint.y && trigger.pointB.y < splitPoint.y, down = trigger.pointA.y > splitPoint.y && trigger.pointB.y > splitPoint.y;
            if (up)
                I.push(trigger);
            else if (down)
                II.push(trigger);
            else if (left)
                III.push(trigger);
            else if (right)
                IV.push(trigger);
            else
                this.triggers.push(trigger);
        }
        for (let tree of [I, II, III, IV]) {
            if (tree.length == triggers.length)
                this.triggers = this.triggers.concat(triggers);
            else if (tree.length) {
                this.children.push(new SimpleQuadTree(tree));
            }
        }
    }
    *getTriggers(t) {
        if (t.maxX < this.minX || t.maxY < this.minY || t.minX > this.maxX || t.minY > this.maxY)
            return;
        yield* this.triggers;
        for (let child of this.children)
            yield* child.getTriggers(t);
    }
}
class Trigger {
    constructor(collider, transform) {
        this.collider = collider;
        this.pointA = transform.transform(new GraphicsMath_1.Point2D(-0.5, 0));
        this.pointB = transform.transform(new GraphicsMath_1.Point2D(0.5, 0));
        this.center = transform.transform(new GraphicsMath_1.Point2D());
        this.minX = Math.min(this.pointA.x, this.pointB.x);
        this.maxX = Math.max(this.pointA.x, this.pointB.x);
        this.minY = Math.min(this.pointA.y, this.pointB.y);
        this.maxY = Math.max(this.pointA.y, this.pointB.y);
    }
}
class Collider extends Trigger {
    constructor(collider, transform) {
        super(collider, transform);
        this.collider = collider;
        this.transform = transform;
    }
    collide(trigger) {
        if (trigger.collider == this.collider)
            return;
        let a = this.transform.inversed.transform(trigger.pointA);
        let b = this.transform.inversed.transform(trigger.pointB);
        if (a.y == b.y || a.y < 0 && b.y < 0 || a.y > 0 && b.y > 0)
            return;
        let n = a.vectorTo(b).normal();
        let t = (n.x * a.x + n.y * a.y) / n.x;
        if (t >= -0.5 && t <= 0.5)
            this.collider.collisions.add(new Collision(new GraphicsMath_1.Point2D(t, 0), n, trigger));
    }
}
class ColliderBehaviour {
    constructor(isTrigger = true, isTriggered = true) {
        this.active = true;
        this.collisions = new Set();
        this.isTrigger = isTrigger;
        this.isTriggered = isTriggered;
    }
}
exports.ColliderBehaviour = ColliderBehaviour;
var GameState;
(function (GameState) {
    GameState[GameState["Running"] = 0] = "Running";
    GameState[GameState["Stopping"] = 1] = "Stopping";
    GameState[GameState["Stopped"] = 2] = "Stopped";
})(GameState || (GameState = {}));
class GameScene extends GameObject {
    constructor(graphicsInterface, inputInterface) {
        super();
        this.realTime = 0;
        this.gameTime = 0;
        this.showFPS = true;
        this.debug = false;
        this.fps = 0;
        this.framesCount = 0;
        this.gameState = GameState.Stopped;
        this.graphicalInterface = graphicsInterface;
        this.inputInterface = inputInterface;
    }
    get input() { return this.inputInterface; }
    get graphics() { return this.graphicalInterface; }
    get width() { return this.graphicalInterface.width(); }
    get height() { return this.graphicalInterface.height(); }
    debugColliders(colliders) {
        for (let collider of colliders) {
            for (let collision of collider.collider.collisions) {
                let p = collider.transform.transform(collision.position);
                this.graphicalInterface.fillCircle(GraphicsMath_1.Transformation.forScale(5, 5).combine(GraphicsMath_1.Transformation.forTranslation(p.x, p.y)), "rgba(0, 155, 0, 0.4)");
            }
        }
    }
    debugFrames() {
        let now = Date.now();
        if (!this.frameBegin)
            this.frameBegin = now;
        if (now - this.frameBegin > 100) {
            this.frameBegin = now;
            this.fps = this.framesCount * 10;
            this.framesCount = 0;
        }
        this.framesCount++;
        this.graphicalInterface.drawText(GraphicsMath_1.Transformation.forScale(15, 15).combine(GraphicsMath_1.Transformation.forTranslation(40, 20)), `${this.fps} fps`, 'black');
    }
    frame(timestamp) {
        var scene = this;
        if (!this.realTime)
            this.realTime = timestamp;
        let timeDiff = Math.min(timestamp - this.realTime, 1000 / 30);
        this.realTime = timestamp;
        this.gameTime += timeDiff;
        this.graphicalInterface.clear();
        let triggers = [];
        let colliders = [];
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
    start() {
        if (this.gameState == GameState.Stopped) {
            this.gameState = GameState.Running;
            let step = (timestamp) => {
                this.frame(timestamp);
                if (this.gameState == GameState.Running)
                    requestAnimationFrame(step);
                else
                    this.gameState = GameState.Stopped;
            };
            requestAnimationFrame(step);
        }
    }
    stop() {
        this.gameState = GameState.Stopped;
    }
}
exports.GameScene = GameScene;

},{"./GraphicsMath":4}],3:[function(require,module,exports){
"use strict";
const GraphicsMath_1 = require('./GraphicsMath');
class CanvasGraphicalInterface {
    constructor(canvas) {
        this.defalutFont = 'Georgia';
        this.canvas = canvas;
    }
    get context() { return this.canvas.getContext("2d"); }
    clearTransformation() {
        this.setTransformation(new GraphicsMath_1.Transformation());
    }
    setTransformation(transformation) {
        var m = transformation.matrix;
        this.context.setTransform(m[0], m[3], m[1], m[4], m[2], m[5]);
    }
    clear() {
        this.clearTransformation();
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.canvas.width = this.canvas.clientWidth;
        this.context.canvas.height = this.canvas.clientHeight;
    }
    fillRect(transformation, color) {
        this.setTransformation(transformation);
        this.context.fillStyle = color;
        this.context.fillRect(-.5, -.5, 1, 1);
    }
    fillCircle(transformation, color) {
        this.setTransformation(transformation);
        this.context.fillStyle = color;
        this.context.beginPath();
        this.context.arc(0, 0, 0.5, 0, 2 * Math.PI);
        this.context.fill();
    }
    drawLine(transformation, color, width = 1) {
        this.setTransformation(transformation);
        this.context.strokeStyle = color;
        this.context.beginPath();
        this.context.moveTo(-0.5, 0);
        this.context.lineTo(0.5, 0);
        this.context.lineWidth = width / transformation.transformVector(new GraphicsMath_1.Vector2D(0, 1)).d();
        this.context.stroke();
    }
    drawText(transformation, content, color, align = 'center', baseline = 'middle', font = this.defalutFont) {
        this.setTransformation(GraphicsMath_1.Transformation.forScale(0.05, 0.05).combine(transformation));
        this.context.font = `20px ${font}`;
        this.context.fillStyle = color;
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
        this.context.fillText(content, 0, 0);
    }
    width() {
        return this.canvas.width;
    }
    height() {
        return this.canvas.height;
    }
}
exports.CanvasGraphicalInterface = CanvasGraphicalInterface;

},{"./GraphicsMath":4}],4:[function(require,module,exports){
"use strict";
class Point2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    vectorTo(point) {
        return new Vector2D(point.x - this.x, point.y - this.y);
    }
    add(vector) {
        return new Point2D(this.x + vector.x, this.y + vector.y);
    }
}
exports.Point2D = Point2D;
class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    multiplyBy(n) {
        return new Vector2D(this.x * n, this.y * n);
    }
    add(v) {
        return new Vector2D(this.x + v.x, this.y + v.y);
    }
    reverse() {
        return new Vector2D(-this.x, -this.y);
    }
    d() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    normalized() {
        let d = this.d();
        if (d)
            return new Vector2D(this.x / d, this.y / d);
        else
            return new Vector2D(0, 0);
    }
    normal() {
        return new Vector2D(-this.y, this.x).normalized();
    }
}
exports.Vector2D = Vector2D;
class Transformation {
    constructor(table = [1, 0, 0, 0, 1, 0, 0, 0, 1]) {
        this._inversed = null;
        this.matrix = table;
    }
    static forTranslation(x, y) {
        return new Transformation([1, 0, x, 0, 1, y, 0, 0, 1]);
    }
    static forScale(x, y) {
        return new Transformation([x, 0, 0, 0, y, 0, 0, 0, 1]);
    }
    static forRotation(r) {
        let c = Math.cos(r);
        let s = Math.sin(r);
        return new Transformation([c, -s, 0, s, c, 0, 0, 0, 1]);
    }
    combine(second) {
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
    transform(point) {
        let b = this.matrix;
        let x = point.x, y = point.y;
        let newX = b[0] * x + b[1] * y + b[2], newY = b[3] * x + b[4] * y + b[5], newW = b[6] * x + b[7] * y + b[8];
        return new Point2D(newX / newW, newY / newW);
    }
    transformVector(v) {
        let a = this.transform(new Point2D());
        let b = this.transform(new Point2D(v.x, v.y));
        return a.vectorTo(b);
    }
    get inversed() {
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
    centerPosition() {
        return this.transform(new Point2D());
    }
    direction() {
        var p1 = this.transform(new Point2D());
        var p2 = this.transform(new Point2D(0, -1));
        return p1.vectorTo(p2).normalized();
    }
}
exports.Transformation = Transformation;

},{}],5:[function(require,module,exports){
"use strict";
class StandardInputInterface {
    constructor(element = document.body) {
        this.pressedButtons = new Set();
        element.addEventListener('keydown', e => this.pressedButtons.add(e.keyCode), false);
        element.addEventListener('keyup', e => this.pressedButtons.delete(e.keyCode), false);
    }
    up() { return this.pressedButtons.has(38); }
    down() { return this.pressedButtons.has(40); }
    left() { return this.pressedButtons.has(37); }
    right() { return this.pressedButtons.has(39); }
}
exports.StandardInputInterface = StandardInputInterface;

},{}],6:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const GA_1 = require('./GA/GA');
const NN_1 = require('./NN/NN');
const SoftLogic_1 = require('./SoftLogic');
class GameHost {
    constructor(nnParams, gaParams, mutate, cross, select, activarionFunction, graphics, input, gameGenerator, onNewGeneration) {
        this.mutate = mutate;
        this.cross = cross;
        this.select = select;
        this.stop = false;
        this.inputs = nnParams.inputs;
        this.hiddenLayers = nnParams.hiddenLayers;
        this.outputs = gameGenerator.nnOutputs;
        let layersDefinition = [this.inputs].concat(this.hiddenLayers.concat([this.outputs]));
        this.activarionFunction = (l, n) => activarionFunction(l, n, layersDefinition);
        this.gameGenerator = gameGenerator;
        var initialPopulation = new Array(gaParams.populationSize)
            .fill([])
            .map(v => new Array(SoftLogic_1.SoftLogic.genotypeLength(this.inputs, this.hiddenLayers, this.outputs))
            .fill(0)
            .map(v => Math.random() * 1 - 0.5));
        this.ga = new GA_1.GeneticAlgorithm(initialPopulation, specimens => this.race(specimens), () => false, this.select, this.mutate, this.cross, () => Math.random() < gaParams.mutationRate, () => Math.random() < gaParams.crossingRate, onNewGeneration);
        this.input = input;
        this.graphics = graphics;
    }
    race(specimens) {
        return __awaiter(this, void 0, Promise, function* () {
            if (this.stop)
                return null;
            var networks = specimens
                .map(v => SoftLogic_1.SoftLogic.decodeGenotype(this.inputs, this.hiddenLayers, this.outputs, v))
                .map(v => new NN_1.FullyConnectedNeuralNetwork(this.inputs, this.hiddenLayers, this.outputs, (l, n, i) => v[l - 1][n][i], this.activarionFunction));
            this.game = this.gameGenerator.generate(networks, this.input, this.graphics);
            let result = yield this.game.run();
            this.game = null;
            return result;
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ga.run();
        });
    }
    kill() {
        return __awaiter(this, void 0, void 0, function* () {
            this.stop = true;
            if (this.game)
                this.game.stop();
        });
    }
}
exports.GameHost = GameHost;

},{"./GA/GA":1,"./NN/NN":7,"./SoftLogic":9}],7:[function(require,module,exports){
"use strict";
class NeuralNetworkNode {
    constructor(inputNodes, weightsDistribution, activationFunction, connectionsDistribution) {
        this.activationFunction = activationFunction;
        this.connections = Array(inputNodes).fill(0).map((v, i) => i).filter(v => connectionsDistribution(v));
        this.weights = Array(inputNodes).fill(0).map((v, i) => connectionsDistribution(i) ? weightsDistribution(i) : 0);
    }
    passValues(values) {
        var totalInput = 0;
        this.connections.forEach(connection => {
            totalInput += values[connection] * this.weights[connection];
        });
        return this.activationFunction(totalInput);
    }
    getWeights() {
        return this.weights.slice();
    }
}
;
class NeuralNetworkLayer {
    constructor(layerSize, inputNodes, weightsDistribution, activationFunctionsDistribution, connectionsDistribution) {
        this.nodes = Array(layerSize).fill(0).map((v, i) => new NeuralNetworkNode(inputNodes, (input) => weightsDistribution(i, input), activationFunctionsDistribution(i), (input) => connectionsDistribution(i, input)));
    }
    get size() { return this.nodes.length; }
    passValues(values) {
        return this.nodes.map(node => node.passValues(values));
    }
    getWeights() {
        return this.nodes.map(n => n.getWeights());
    }
}
;
class NeuralNetwork {
    constructor(inputs, hiddenLayers, outputs, weightsDistribution, activationFunctionsDistribution, connectionsDistribution) {
        this._inputs = inputs;
        this.inputMapping = Array(inputs).fill(0).map((v, i) => activationFunctionsDistribution(0, i));
        var layersSizes = hiddenLayers.concat([outputs]);
        this.layers = layersSizes.map((layerSize, layerNumber) => new NeuralNetworkLayer(layersSizes[layerNumber], (layerNumber == 0 ? inputs : layersSizes[layerNumber - 1]) + 1, (node, input) => weightsDistribution(layerNumber + 1, node, input), (node) => activationFunctionsDistribution(layerNumber + 1, node), (node, input) => connectionsDistribution(layerNumber + 1, node, input)));
    }
    get inputs() { return this._inputs; }
    passValues(values) {
        values = values.map((v, i) => this.inputMapping[i](v));
        for (var i = 0; i < this.layers.length; i++) {
            values.push(1);
            values = this.layers[i].passValues(values);
        }
        return values;
    }
    getWeights() {
        return this.layers.map(l => l.getWeights());
    }
}
exports.NeuralNetwork = NeuralNetwork;
;
class FullyConnectedNeuralNetwork extends NeuralNetwork {
    constructor(inputs, hiddenLayers, outputs, weightsDistribution, activationFunctionsDistribution) {
        super(inputs, hiddenLayers, outputs, weightsDistribution, activationFunctionsDistribution, () => true);
    }
}
exports.FullyConnectedNeuralNetwork = FullyConnectedNeuralNetwork;

},{}],8:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const GameEngine_1 = require('./GameEngine/GameEngine');
const GraphicsMath_1 = require('./GameEngine/GraphicsMath');
class RaceBehaviour {
    constructor(aiCars, userCar, lapLength, score, countDown, stopCondition, onEnd) {
        this.aiCars = aiCars;
        this.userCar = userCar;
        this.lapLength = lapLength;
        this.score = score;
        this.countDown = countDown;
        this.stopCondition = stopCondition;
        this.onEnd = onEnd;
        this.started = false;
        this.whenToStop = Number.MAX_VALUE;
        this.finalScore = null;
        this.allCars = [userCar].concat(aiCars);
    }
    onUpdate(scene) {
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
                let score = this.score(car.bodyChild.getTransformation().transform(new GraphicsMath_1.Point2D()));
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
            if (!this.finalScore) {
                let score = this.aiCars.map(c => c.carBehaviour.totalScore);
                score.map((v, i) => ({
                    score: v,
                    car: this.aiCars[i]
                })).sort((a, b) => b.score - a.score).forEach((v, i) => v.car.setPlace(i + 1, this.aiCars.length));
                if (this.stopCondition(carsData, scene.gameTime)) {
                    this.finalScore = score;
                    this.whenToStop = scene.gameTime + 1000;
                }
            }
            if (this.finalScore && scene.gameTime > this.whenToStop)
                this.onEnd(this.finalScore);
        }
    }
}
class CameraBehaviour {
    constructor(aiCars, userCar, viewport) {
        this.aiCars = aiCars;
        this.userCar = userCar;
        this.viewport = viewport;
        this.zoom = 1;
    }
    postUpdate(scene, camera) {
        camera.resetTransformation();
        let centerX = (this.viewport.minX + this.viewport.maxX) / 2, centerY = (this.viewport.minY + this.viewport.maxY) / 2;
        camera.transform(GraphicsMath_1.Transformation.forTranslation(-centerX, -centerY));
        let width = (this.viewport.maxX - this.viewport.minX) * this.zoom, height = (this.viewport.maxY - this.viewport.minY) * this.zoom;
        let screenWidth = scene.graphics.width(), screenHeight = scene.graphics.height();
        let carToFollow = this.userCar;
        if (!carToFollow || !carToFollow.carBehaviour.alive)
            for (let ai of this.aiCars)
                if (!carToFollow || ai.carBehaviour.totalScore > carToFollow.carBehaviour.totalScore)
                    carToFollow = ai;
        let cameraX = screenWidth / 2, cameraY = screenHeight / 2;
        if (width > screenWidth && carToFollow)
            cameraX -= carToFollow.getTransformation().transform(new GraphicsMath_1.Point2D()).x * this.zoom;
        if (height > screenHeight && carToFollow)
            cameraY -= carToFollow.getTransformation().transform(new GraphicsMath_1.Point2D()).y * this.zoom;
        camera.transform(GraphicsMath_1.Transformation.forScale(this.zoom, this.zoom));
        camera.transform(GraphicsMath_1.Transformation.forTranslation(cameraX, cameraY));
    }
}
class UICameraBehaviour {
    constructor() {
    }
    postUpdate(scene, camera) {
        camera.resetTransformation();
        let screenWidth = scene.graphics.width(), screenHeight = scene.graphics.height();
        camera.transform(GraphicsMath_1.Transformation.forTranslation(screenWidth / 2, screenHeight / 2));
    }
}
class CounterGameObject extends GameEngine_1.GameObject {
    constructor() {
        super();
        this.countDownTime = 1900;
        this.ready = false;
        this.text = new GameEngine_1.DrawTextBehaviour('', 'white', 1000);
        this.drawBehaviour = this.text;
        this.transform(GraphicsMath_1.Transformation.forScale(200, 200));
        let back = new GameEngine_1.GameObject();
        back.drawBehaviour = new GameEngine_1.DrawRectBehaviour('rgba(0,0,0,0.3)', 999);
        back.transform(GraphicsMath_1.Transformation.forScale(100000, 1));
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
                back.drawBehaviour.color = `rgba(0,0,0,${0.2 + 0.4 * ((this.countDownTime - scene.gameTime) % 1000) / 1000})`;
            }
        });
    }
}
class CarBehaviour {
    constructor(input) {
        this.frozen = true;
        this.alive = true;
        this.totalScore = 0;
        this.lapScore = 0;
        this.laps = 0;
        this.bestScore = Number.MIN_VALUE;
        this.inactiveFrom = 0;
        this.activeFrom = 0;
        this.isActive = true;
        this.currentSpeed = 0;
        this.input = input;
    }
    static kill(car) {
        car.carBehaviour.alive = false;
        car.carBehaviour.isActive = false;
        for (let collider of car.bodyChild.children)
            if (collider.colliderBehaviour != null)
                collider.detach();
        car.paint(car.killedColor);
        car.bodyChild.drawBehaviour.depth = -1;
    }
    onUpdate(scene, gameObject, timeDiff) {
        let car = gameObject;
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
        let position = transform.transform(new GraphicsMath_1.Point2D());
        let directon = transform.transformVector(new GraphicsMath_1.Vector2D(0, -1)).normalized();
        let acceleration = 0.01 * timeDiff;
        this.currentSpeed += Math.max(Math.min(input.speed - this.currentSpeed, acceleration), -acceleration);
        let speed = timeDiff / 6 * this.currentSpeed;
        let rotationSpeed = timeDiff / 400 * Math.max(Math.min(input.direction, 1), -1);
        car.transform(GraphicsMath_1.Transformation.forTranslation(directon.x * speed, directon.y * speed));
        car.bodyChild.transform(GraphicsMath_1.Transformation.forRotation(rotationSpeed));
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
class SensorGameObject extends GameEngine_1.GameObject {
    constructor(rotation, radius) {
        super();
        let d = 0.5 / Math.abs(Math.cos(Math.abs(rotation + Math.PI / 4) % (Math.PI / 2) - Math.PI / 4)) - 0.5;
        this.colliderBehaviour = new GameEngine_1.ColliderBehaviour(false, true);
        this.transform(GraphicsMath_1.Transformation.forRotation(Math.PI * 1.5));
        this.transform(GraphicsMath_1.Transformation.forTranslation(0, -.5));
        this.transform(GraphicsMath_1.Transformation.forScale(1, radius - d - 0.5));
        this.transform(GraphicsMath_1.Transformation.forTranslation(0, -0.5 - d));
        this.transform(GraphicsMath_1.Transformation.forRotation(rotation));
        this.drawChild = new GameEngine_1.GameObject();
        this.drawChild.drawBehaviour = new GameEngine_1.DrawLineBehaviour('hsl(104, 15%, 50%)', -50, 1);
        this.add(this.drawChild);
        this.scriptBehaviours.add({
            onUpdate: (scene, gameObject) => { this.updateDisplay(); }
        });
    }
    getLength() {
        return Array.from(this.colliderBehaviour.collisions).reduce((p, c) => c.trigger instanceof WallCollider ? Math.min(p, c.position.x + 0.5) : p, 1);
    }
    setVisible(visible) {
        this.drawChild.drawBehaviour.visible = visible;
    }
    updateDisplay() {
        let length = this.getLength();
        this.drawChild.resetTransformation();
        this.drawChild.transform(GraphicsMath_1.Transformation.forScale(length, 1));
        this.drawChild.transform(GraphicsMath_1.Transformation.forTranslation(-0.5 + length / 2, 0));
    }
}
class CarGameObject extends GameEngine_1.GameObject {
    constructor(behaviour, inputs, userCar, sensorLength) {
        super();
        this.colliders = [];
        this.boxColliders = [];
        this.place = undefined;
        let carSize = 20;
        if (userCar)
            this.color = { main: 'hsl(195, 85%, 60%)', additonal: 'hsl(195, 85%, 20%)' };
        else
            this.color = { main: 'hsl(30, 85%, 60%)', additonal: 'hsl(30, 85%, 20%)' };
        this.killedColor = { main: 'rgb(105, 132, 95)', additonal: 'rgb(85, 112, 75)' };
        this.inactiveColor = { main: 'rgb(150, 150, 150)', additonal: 'rgb(80, 80, 80)' };
        this.scriptBehaviours.add(behaviour);
        this.carBehaviour = behaviour;
        this.bodyChild = new GameEngine_1.GameObject();
        this.bodyChild.drawBehaviour = new GameEngine_1.DrawRectBehaviour();
        this.bodyChild.transform(GraphicsMath_1.Transformation.forScale(carSize, carSize));
        this.add(this.bodyChild);
        let scoreGameObject = new GameEngine_1.GameObject();
        this.scoreTextBox = new GameEngine_1.DrawTextBehaviour();
        scoreGameObject.drawBehaviour = this.scoreTextBox;
        scoreGameObject.transform(GraphicsMath_1.Transformation.forScale(16, 16));
        scoreGameObject.transform(GraphicsMath_1.Transformation.forTranslation(0, 20));
        scoreGameObject.drawBehaviour.visible = false;
        this.add(scoreGameObject);
        let placeGameObject = new GameEngine_1.GameObject();
        this.placeTextBox = new GameEngine_1.DrawTextBehaviour();
        placeGameObject.drawBehaviour = this.placeTextBox;
        placeGameObject.transform(GraphicsMath_1.Transformation.forScale(14, 14));
        placeGameObject.drawBehaviour.visible = false;
        this.add(placeGameObject);
        let collidersRotations = Array(inputs).fill(0).map((v, i) => i * Math.PI / (inputs - 1) - Math.PI / 2);
        let colliderRadius = sensorLength /= carSize;
        for (let rotation of collidersRotations) {
            let d = 0.5 / Math.abs(Math.cos(Math.abs(rotation + Math.PI / 4) % (Math.PI / 2) - Math.PI / 4)) - 0.5;
            let collider = new SensorGameObject(rotation, colliderRadius);
            this.bodyChild.add(collider);
            this.colliders.push(collider);
        }
        for (let rotation of [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5]) {
            let collider = new GameEngine_1.GameObject();
            collider.colliderBehaviour = new GameEngine_1.ColliderBehaviour(false, true);
            collider.transform(GraphicsMath_1.Transformation.forTranslation(0, -.5));
            collider.transform(GraphicsMath_1.Transformation.forRotation(rotation));
            collider.drawBehaviour = new GameEngine_1.DrawLineBehaviour();
            this.bodyChild.add(collider);
            this.boxColliders.push(collider.colliderBehaviour);
        }
        this.showMovingElements(false);
        this.paint(this.color);
        this.setDepth(userCar ? -1 : 0, 1);
    }
    paint(color) {
        this.bodyChild.drawBehaviour.color = color.main;
        this.scoreTextBox.color = color.additonal;
        this.placeTextBox.color = color.additonal;
        for (let collider of this.bodyChild.children)
            if (collider.drawBehaviour)
                collider.drawBehaviour.color = color.additonal;
    }
    showMovingElements(visible) {
        for (let collder of this.colliders)
            collder.setVisible(visible);
        this.scoreTextBox.visible = visible;
        this.placeTextBox.visible = visible;
    }
    setDepth(no, on) {
        let depth = -no / on;
        let diff = 1 / on;
        this.bodyChild.drawBehaviour.depth = depth;
        this.scoreTextBox.depth = depth + diff / 2 - 3;
        this.placeTextBox.depth = depth + diff / 2;
        for (let collider of this.bodyChild.children)
            if (collider.drawBehaviour)
                collider.drawBehaviour.depth = depth + diff / 2;
    }
    setPlace(place, on) {
        if (place != this.place) {
            this.placeTextBox.text = place.toString();
            this.setDepth(place, on);
        }
    }
}
class PointPointGameObject extends GameEngine_1.GameObject {
    constructor(a, b) {
        super();
        let position = new GraphicsMath_1.Point2D((a.x + b.x) / 2, (a.y + b.y) / 2);
        let length = a.vectorTo(b).d();
        let rotation = Math.atan2(a.y - b.y, a.x - b.x);
        this.transform(GraphicsMath_1.Transformation.forScale(length, length));
        this.transform(GraphicsMath_1.Transformation.forRotation(rotation));
        this.transform(GraphicsMath_1.Transformation.forTranslation(position.x, position.y));
    }
}
class WallCollider extends GameEngine_1.ColliderBehaviour {
    constructor() {
        super(true, false);
    }
}
class StepCollider extends GameEngine_1.ColliderBehaviour {
    constructor(distance) {
        super(true, false);
        this.distance = distance;
    }
}
class WallGameObject extends PointPointGameObject {
    constructor(a, b) {
        super(a, b);
        this.colliderBehaviour = new WallCollider();
        this.drawBehaviour = new GameEngine_1.DrawLineBehaviour('rgb(85, 112, 75)', 10, 2);
    }
}
class GroundGameObject extends GameEngine_1.GameObject {
    constructor(x, y, rotation, width, height) {
        super();
        this.drawBehaviour = new GameEngine_1.DrawRectBehaviour('rgb(165, 192, 155)', -300);
        this.transform(GraphicsMath_1.Transformation.forScale(width, height));
        this.transform(GraphicsMath_1.Transformation.forRotation(rotation));
        this.transform(GraphicsMath_1.Transformation.forTranslation(x, y));
    }
}
class Race {
    constructor(networks, input, graphics, gameParams, endCondition) {
        graphics.clear();
        let scene = new GameEngine_1.GameScene(graphics, input);
        let camera = new GameEngine_1.GameObject();
        let uiCamera = new GameEngine_1.GameObject();
        scene.add(camera);
        scene.add(uiCamera);
        let map = Race.generateMap(camera, gameParams);
        let startPoint = map.start;
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
        userCar.transform(GraphicsMath_1.Transformation.forTranslation(startPoint.x, startPoint.y));
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
            car.transform(GraphicsMath_1.Transformation.forTranslation(startPoint.x, startPoint.y));
            camera.add(car);
            return car;
        });
        let counter = new CounterGameObject();
        uiCamera.add(counter);
        this.end = new Promise((p, r) => {
            this.onEnd = p;
        });
        let raceScript = new RaceBehaviour(aiCars, userCar, lapLength, p => score(camera.transformBehaviour.transformation.inversed.transform(p)), counter, endCondition, this.onEnd);
        scene.scriptBehaviours.add(raceScript);
        camera.scriptBehaviours.add(new CameraBehaviour(aiCars, userCar, map.viewport));
        uiCamera.scriptBehaviours.add(new UICameraBehaviour());
        this.gameScene = scene;
    }
    static generateMap(holder, params) {
        var Direction;
        (function (Direction) {
            Direction[Direction["Up"] = 0] = "Up";
            Direction[Direction["Down"] = 1] = "Down";
            Direction[Direction["Left"] = 2] = "Left";
            Direction[Direction["Right"] = 3] = "Right";
        })(Direction || (Direction = {}));
        ;
        let pointsDistance = params.trackSegmentSize;
        let trackFill = params.trackSegmentFill;
        let cornerFill = params.trackCornerCut;
        let columns = params.maxTrackWidth;
        let rows = params.maxTrackHeight;
        let start = {
            x: Math.floor(columns / 2),
            y: Math.floor(rows / 2)
        };
        let grid = Array(rows).fill(0).map(e => Array(columns).fill(false));
        let flood = Array(rows).fill(0).map(e => Array(columns).fill(0));
        let scores = Array(rows).fill(0).map(e => Array(columns).fill(null));
        let directions = (x, y) => [{ x: 0, y: -1, d: Direction.Up }, { x: 1, y: 0, d: Direction.Right }, { x: -1, y: 0, d: Direction.Left }, { x: 0, y: 1, d: Direction.Down }]
            .map(e => ({ x: x + e.x, y: y + e.y, d: e.d }))
            .filter(e => e.x >= 0 && e.y >= 0 && e.x < columns && e.y < rows);
        let points = [];
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
                .map(e => e.v)[0];
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
            let go = new GameEngine_1.GameObject();
            go.transform(GraphicsMath_1.Transformation.forScale(pointsDistance, pointsDistance));
            let score;
            if (track.from == track.to) {
                go.add(new WallGameObject(new GraphicsMath_1.Point2D(-0.5 * trackFill, -0.5), new GraphicsMath_1.Point2D(-0.5 * trackFill, 0.5)));
                go.add(new WallGameObject(new GraphicsMath_1.Point2D(0.5 * trackFill, -0.5), new GraphicsMath_1.Point2D(0.5 * trackFill, 0.5)));
                go.add(new GroundGameObject(0, 0, 0, trackFill, 1.01));
                if (i == 0) {
                    let lineGO = new GameEngine_1.GameObject();
                    lineGO.transform(GraphicsMath_1.Transformation.forScale(trackFill, 0.3));
                    lineGO.drawBehaviour = new GameEngine_1.DrawRectBehaviour('hsl(104, 15%, 60%)', -290);
                    go.add(lineGO);
                }
                if (track.to == Direction.Right)
                    go.transform(GraphicsMath_1.Transformation.forRotation(Math.PI * 0.5));
                if (track.to == Direction.Down)
                    go.transform(GraphicsMath_1.Transformation.forRotation(Math.PI));
                if (track.to == Direction.Left)
                    go.transform(GraphicsMath_1.Transformation.forRotation(Math.PI * 1.5));
                go.transform(GraphicsMath_1.Transformation.forTranslation(track.realX, track.realY));
                let transform = go.transformBehaviour.transformation;
                score = p => i - transform.inversed.transform(p).y;
            }
            else {
                let d = trackFill, c = cornerFill, l = (1 - d) / 2, h = l * c, k = d * Math.SQRT2 - d + h;
                go.add(new WallGameObject(new GraphicsMath_1.Point2D(-0.5 + l, 0.5), new GraphicsMath_1.Point2D(-0.5 + l, 0.5 - h)));
                go.add(new WallGameObject(new GraphicsMath_1.Point2D(-0.5, 0.5 - l), new GraphicsMath_1.Point2D(-0.5 + h, 0.5 - l)));
                go.add(new WallGameObject(new GraphicsMath_1.Point2D(-0.5 + l, 0.5 - h), new GraphicsMath_1.Point2D(-0.5 + h, 0.5 - l)));
                go.add(new WallGameObject(new GraphicsMath_1.Point2D(0.5 - l, 0.5), new GraphicsMath_1.Point2D(0.5 - l, 0.5 - k)));
                go.add(new WallGameObject(new GraphicsMath_1.Point2D(-0.5, -0.5 + l), new GraphicsMath_1.Point2D(-0.5 + k, -0.5 + l)));
                go.add(new WallGameObject(new GraphicsMath_1.Point2D(0.5 - l, 0.5 - k), new GraphicsMath_1.Point2D(-0.5 + k, -0.5 + l)));
                go.add(new GroundGameObject(-0.5 + k / 2, 0, 0, k + 0.01, trackFill));
                go.add(new GroundGameObject((k + h - 1) / 4, (1 - k - h) / 4, Math.PI / 4, (1 - k - l) * Math.SQRT2, trackFill));
                go.add(new GroundGameObject(0, 0.5 - k / 2, 0, trackFill, k + 0.01));
                if (track.from == Direction.Up && track.to == Direction.Right)
                    go.transform(GraphicsMath_1.Transformation.forRotation(Math.PI * 1.5));
                if (track.from == Direction.Left && track.to == Direction.Up)
                    go.transform(GraphicsMath_1.Transformation.forRotation(Math.PI));
                if (track.from == Direction.Down && track.to == Direction.Left)
                    go.transform(GraphicsMath_1.Transformation.forRotation(Math.PI * 0.5));
                if (track.from == Direction.Right && track.to == Direction.Up)
                    go.transform(GraphicsMath_1.Transformation.forScale(1, -1));
                if (track.from == Direction.Up && track.to == Direction.Left)
                    go.transform(GraphicsMath_1.Transformation.forScale(1, -1).combine(GraphicsMath_1.Transformation.forRotation(Math.PI * 1.5)));
                if (track.from == Direction.Left && track.to == Direction.Down)
                    go.transform(GraphicsMath_1.Transformation.forScale(1, -1).combine(GraphicsMath_1.Transformation.forRotation(Math.PI * 1)));
                if (track.from == Direction.Down && track.to == Direction.Right)
                    go.transform(GraphicsMath_1.Transformation.forScale(1, -1).combine(GraphicsMath_1.Transformation.forRotation(Math.PI * 0.5)));
                go.transform(GraphicsMath_1.Transformation.forTranslation(track.realX, track.realY));
                let transform = go.transformBehaviour.transformation;
                score = p => {
                    p = transform.inversed.transform(p);
                    return i + 0.5 - Math.atan2(-p.y + 0.5, p.x + 0.5) / (Math.PI / 2);
                };
            }
            holder.add(go);
            scores[track.y][track.x] = score;
        }
        let background = new GameEngine_1.GameObject();
        background.drawBehaviour = new GameEngine_1.DrawRectBehaviour('hsl(104, 15%, 50%)', -1000);
        background.transform(GraphicsMath_1.Transformation.forScale(viewport.maxX - viewport.minX + 20, viewport.maxY - viewport.minY + 20));
        background.transform(GraphicsMath_1.Transformation.forTranslation((viewport.maxX + viewport.minX) / 2, (viewport.maxY + viewport.minY) / 2));
        holder.add(background);
        return {
            viewport: viewport,
            score: (p) => {
                let x = Math.floor(p.x / pointsDistance), y = Math.floor(p.y / pointsDistance);
                if (scores[y] && scores[y][x])
                    return scores[y][x](p);
                else
                    return -1;
            },
            start: { x: tracks[0].realX, y: tracks[0].realY },
            length: tracks.length
        };
    }
    run() {
        return __awaiter(this, void 0, Promise, function* () {
            this.gameScene.start();
            var result = yield this.end;
            this.gameScene.stop();
            return result;
        });
    }
    stop() {
        this.gameScene.stop();
        this.onEnd(null);
    }
}
exports.Race = Race;
class RaceGenerator {
    constructor(gameParams, endCondition) {
        this.gameParams = gameParams;
        this.endCondition = endCondition;
        this.generate = (networks, input, graphics) => {
            return new Race(networks, input, graphics, this.gameParams, this.endCondition);
        };
        this.nnOutputs = 2;
    }
}
exports.RaceGenerator = RaceGenerator;

},{"./GameEngine/GameEngine":2,"./GameEngine/GraphicsMath":4}],9:[function(require,module,exports){
"use strict";
class SoftLogic {
    static encodeGenotype(weights) {
        const flatten = (arr) => arr.reduce((p, c) => Array.isArray(c) ? p.concat(flatten(c)) : p.concat([c]), []);
        return flatten(weights);
    }
    static networkSize(inputs, hiddenLayers, outputs) {
        var inputSizes = [inputs].concat(hiddenLayers).map(v => v + 1);
        var layerSizes = hiddenLayers.concat([outputs]);
        var segmentSizes = inputSizes.map((v, i) => v * layerSizes[i]);
        return {
            inputSizes: inputSizes,
            layerSizes: layerSizes,
            segmentSizes: segmentSizes
        };
    }
    static decodeGenotype(inputs, hiddenLayers, outputs, genotype) {
        var size = SoftLogic.networkSize(inputs, hiddenLayers, outputs);
        function splitArray(arr, chunks) {
            return chunks.reduce((p, c, i) => p.concat({ begin: i ? p[i - 1].end : 0, end: (i ? p[i - 1].end : 0) + c }), []).map(v => arr.slice(v.begin, v.end));
        }
        return splitArray(genotype, size.segmentSizes).map((v, i) => splitArray(v, Array(size.layerSizes[i]).fill(size.inputSizes[i])));
    }
    static genotypeLength(inputs, hiddenLayers, outputs) {
        var size = SoftLogic.networkSize(inputs, hiddenLayers, outputs);
        return size.segmentSizes.reduce((p, c) => p + c, 0);
    }
}
exports.SoftLogic = SoftLogic;

},{}],10:[function(require,module,exports){
/// <reference path="Typed/jquery.d.ts" />
/// <reference path="Typed/jqueryui.d.ts" />
/// <reference path="Typed/ace.d.ts" />
/// <reference path="Typed/handlebars.d.ts" />
"use strict";
const GraphicalInterface_1 = require('./GameEngine/GraphicalInterface');
const InputInterface_1 = require('./GameEngine/InputInterface');
const GameHost_1 = require('./GameHost');
const RacingGame_1 = require('./RacingGame');
$(() => {
    // ============== Scrolling =================
    let holder = $('#game-canvas-holder');
    $('#game-canvas-holder').hover(e => holder.css('left', '10vw'));
    $('#settings').hover(e => holder.css('left', '90vw'));
    // ============== Settings =================
    let restartMessage = $('#restart-message');
    let settingTemplate = Handlebars.compile($("#setting-template").html());
    class Setting {
        constructor(title, description, firstLine, defaultValue, lastLine, mode, containter) {
            this.firstLine = firstLine;
            this.defaultValue = defaultValue;
            this.lastLine = lastLine;
            this.mode = mode;
            let html = settingTemplate({
                title: title,
                defaultValue: defaultValue,
                firstLine: firstLine,
                lastLine: lastLine
            });
            let element = $(html);
            let addEditor = (element, content, mode, disabled) => {
                if (!element[0])
                    return;
                let editor = ace.edit(element[0]);
                editor.setTheme('ace/theme/monokai');
                editor.getSession().setMode(`ace/mode/${mode}`);
                editor.setOptions({
                    maxLines: Infinity,
                    highlightActiveLine: false,
                });
                editor.$blockScrolling = Infinity;
                editor.setShowPrintMargin(false);
                editor.session.setUseWorker(false);
                if (disabled) {
                    editor.renderer.setShowGutter(false);
                    editor.setOptions({
                        readOnly: true,
                        highlightActiveLine: false,
                        highlightGutterLine: false
                    });
                    editor.renderer.$cursorLayer.element.style.opacity = 0;
                    editor.container.style.opacity = '0.5';
                    editor.container.style.pointerEvents = 'none';
                    editor.renderer.setStyle('disabled');
                }
                editor.setValue(content, 1);
                editor.getSession().on('change', e => {
                    restartMessage.show();
                });
                return editor;
            };
            this.firstLineEditor = addEditor(element.find('.setting-first-code-line'), firstLine, 'javascript', true);
            this.codeEditor = addEditor(element.find('.code-editor'), defaultValue, mode, false);
            this.lastLineEditor = addEditor(element.find('.setting-last-code-line'), lastLine, 'javascript', true);
            element.find('.reset-button').click(e => this.setDefault());
            $(`#${containter}`).append(element);
        }
        setDefault() {
            this.codeEditor.setValue(this.defaultValue, 1);
        }
        getValue() {
            let text = `${this.firstLine ? this.firstLine : ''}\n ${this.codeEditor ? this.codeEditor.getValue() : ''}\n ${this.lastLine ? this.lastLine : ''}`;
            if (this.mode == 'javascript') {
                return eval(`(${text})`);
            }
            else {
                return JSON.parse(text);
            }
        }
    }
    let settings = {
        // Race settings
        raceParams: new Setting('Game parameters', '', undefined, `{
	"sensorLength": 120,
	"maxTrackWidth": 7,
	"maxTrackHeight": 7,
	"trackSegmentSize": 120,
	"trackSegmentFill": 0.6,
	"trackCornerCut": 0.5
}`, undefined, 'json', 'race-settings'),
        stopCondition: new Setting('Stop condition of race', '', `// (car: {lap: number, ai: boolean, alive: boolean}[], gameTime: number, active: boolean) => boolean
function(cars, gameTime) {`, `return cars.filter(c => c.ai && c.active && c.lap < 2).length === 0 || gameTime > 60000;`, `}`, 'javascript', 'race-settings'),
        // NN settings
        networkSize: new Setting('Network size', '', undefined, `{
	"inputs": 8,
	"hiddenLayers": [100]
}`, undefined, 'json', 'nn-settings'),
        activationFunction: new Setting('Activation function', '', `// (layer: number, node: number, layers: number[]) => (value: number) => number
function(layer, node, layers) {`, `if (layer === 0) // input mapping
	return value => value;
else if (layer < layers.length - 1) // hidden layers
	return value => 1 / (1 + Math.pow(Math.E, -4 * value));
else // output layer
	return value => value;`, `}`, 'javascript', 'nn-settings'),
        // GA settings
        gaParams: new Setting('Genetics algorith paramas', '', undefined, `{
	"populationSize": 20,
	"mutationRate": 0.5,
	"crossingRate": 0.5
}`, undefined, 'json', 'ga-settings'),
        mutation: new Setting('Mutation', '', `// (specimen: number[]) => number[]
function(specimen) {`, `return specimen.map(gen => (Math.random() < 0.2) ? (gen + Math.random() * 0.2 - 0.1) : gen);`, `}`, 'javascript', 'ga-settings'),
        crossing: new Setting('Crossing', '', `// (first: number[], second: number[]) => number[]
function(first, second) {`, `return first.map((gen, index) => index % 2 === 0 ? gen : second[index]);`, `}`, 'javascript', 'ga-settings'),
        selection: new Setting('Selection', '', `// (fitnesses: number[]) => IterableIterator<number>
function*(fitnesses) {`, `while (true) {
	// Ring selection
	yield new Array(5).fill(0)
		.map(v => Math.floor(Math.random() * fitnesses.length))
		.map(v => ({ score: fitnesses[v], index: v }))
		.reduce((p, c) => (p.score > c.score) ? p : c)
		.index;
}`, `	throw "Selection generator drained";
}`, 'javascript', 'ga-settings'),
    };
    let gameParameter = {
        skipGeneration: false,
        skipFunction: (cars, gameTime) => {
            return cars.filter(c => c.ai && c.alive && c.lap < 2).length == 0 || gameTime > 10000;
        }
    };
    $('#skip-button').click(e => gameParameter.skipGeneration = true);
    let canvas = $("#game-canvas");
    // ============== Game =================
    let generationNumber = $('#generation-number');
    let graphicsInterface = new GraphicalInterface_1.CanvasGraphicalInterface($("#game-canvas")[0]);
    let inputInterface = new InputInterface_1.StandardInputInterface();
    graphicsInterface.defalutFont = 'Dosis';
    let game = null;
    let start = () => {
        if (game)
            game.kill();
        restartMessage.hide();
        let _stopCondition = settings.stopCondition.getValue();
        let stopCondition = (cars, time) => {
            if (gameParameter.skipGeneration) {
                gameParameter.skipGeneration = false;
                return true;
            }
            else
                return _stopCondition(cars, time);
        };
        let _raceParams = settings.raceParams.getValue();
        let _nnParams = settings.networkSize.getValue();
        let _activationFunction = settings.activationFunction.getValue();
        let _gaParams = settings.gaParams.getValue();
        let _gaMutation = settings.mutation.getValue();
        let _gaCrossing = settings.crossing.getValue();
        let _gaSelection = settings.selection.getValue();
        let generator = new RacingGame_1.RaceGenerator(_raceParams, stopCondition);
        game = new GameHost_1.GameHost(_nnParams, _gaParams, _gaMutation, _gaCrossing, _gaSelection, _activationFunction, graphicsInterface, inputInterface, generator, g => generationNumber.text(g));
        game.start();
    };
    $('#start-button').click(start);
    start();
});

},{"./GameEngine/GraphicalInterface":3,"./GameEngine/InputInterface":5,"./GameHost":6,"./RacingGame":8}]},{},[10])