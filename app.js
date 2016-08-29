(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
class GeneticAlgorithm {
    constructor(initialPopulation, fitnessFunction) {
        this.population = initialPopulation.map(v => v.slice());
    }
    run() {
    }
}
exports.GeneticAlgorithm = GeneticAlgorithm;

},{}],2:[function(require,module,exports){
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
        var layersSizes = hiddenLayers.slice();
        layersSizes.push(outputs);
        this.layers = layersSizes.map((layerSize, layerNumber) => new NeuralNetworkLayer(layersSizes[layerNumber], (layerNumber == 0 ? inputs : layersSizes[layerNumber - 1]) + 1, (node, input) => weightsDistribution(layerNumber, node, input), (node) => activationFunctionsDistribution(layerNumber, node), (node, input) => connectionsDistribution(layerNumber, node, input)));
    }
    passValues(values) {
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
class FullConnectedNeuralNetwork extends NeuralNetwork {
    constructor(inputs, hiddenLayers, outputs, weightsDistribution, activationFunctionsDistribution) {
        super(inputs, hiddenLayers, outputs, weightsDistribution, activationFunctionsDistribution, () => true);
    }
}
exports.FullConnectedNeuralNetwork = FullConnectedNeuralNetwork;

},{}],3:[function(require,module,exports){
"use strict";
const NN_1 = require('./NN/NN');
const GA_1 = require('./GA/GA');
var constants = {
    nnInputs: 4,
    nnHiddenLayers: [8],
    nnOutputs: 2
};
function encodeGenotype(weights) {
    const flatten = (arr) => arr.reduce((p, c) => Array.isArray(c) ? p.concat(flatten(c)) : p.concat([c]), []);
    return flatten(weights);
}
function decodeGenotype(genotype) {
    var inputSizes = [constants.nnInputs].concat(constants.nnHiddenLayers).map(v => v + 1);
    var layerSizes = constants.nnHiddenLayers.concat([constants.nnOutputs]);
    var segmentSizes = inputSizes.map((v, i) => v * layerSizes[i]);
    function splitArray(arr, chunks) {
        return chunks.reduce((p, c, i) => p.concat({ begin: i ? p[i - 1].end : 0, end: (i ? p[i - 1].end : 0) + c }), []).map(v => arr.slice(v.begin, v.end));
    }
    return splitArray(genotype, segmentSizes).map((v, i) => splitArray(v, Array(layerSizes[i]).fill(inputSizes[i])));
}
var nn = new NN_1.FullConnectedNeuralNetwork(constants.nnInputs, constants.nnHiddenLayers, constants.nnOutputs, (l, n, i) => Math.random() - 0.5, (l, n) => v => 1 / (1 + Math.pow(Math.E, -v)));
var ga = new GA_1.GeneticAlgorithm([], (speciments) => {
    //var networks = speciments.map(specimen => new NeuralNetwork(
    //	constants.nnInputs,
    //	constants.nnHiddenLayers,
    //	constants.nnOutputs,
    //));
    return [];
});
console.dir('aaa');

},{"./GA/GA":1,"./NN/NN":2}]},{},[3])