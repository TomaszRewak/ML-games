class NeuralNetworkNode {
	private weights: number[];
	private activationFunction: (value: number) => number;
	private connections: number[];

	public constructor(
		inputNodes: number,
		weightsDistribution: (input: number) => number,
		activationFunction: (value: number) => number,
		connectionsDistribution: (input: number) => boolean
	) {
		this.activationFunction = activationFunction;
		this.connections = Array(inputNodes).fill(0).map((v, i) => i).filter(v => connectionsDistribution(v));
		this.weights = Array(inputNodes).fill(0).map((v, i) => connectionsDistribution(i) ? weightsDistribution(i) : 0);
	}

	public passValues(values: number[]): number {
		var totalInput = 0;

		this.connections.forEach(connection => {
			totalInput += values[connection] * this.weights[connection];
		});

		return this.activationFunction(totalInput);
	}

	public getWeights(): number[] {
		return this.weights.slice();
	}
};

class NeuralNetworkLayer {
	private nodes: NeuralNetworkNode[];
	public get size() { return this.nodes.length; }

	public constructor(
		layerSize: number,
		inputNodes: number,
		weightsDistribution: (node: number, input: number) => number,
		activationFunctionsDistribution: (node: number) => (value: number) => number,
		connectionsDistribution: (node: number, input: number) => boolean
	) {
		this.nodes = Array(layerSize).fill(0).map((v, i) => new NeuralNetworkNode(
			inputNodes,
			(input) => weightsDistribution(i, input),
			activationFunctionsDistribution(i),
			(input) => connectionsDistribution(i, input)
		));
	}

	public passValues(values: number[]): number[] {
		return this.nodes.map(node => node.passValues(values));
	}

	public getWeights(): number[][] {
		return this.nodes.map(n => n.getWeights());
	}
};

export class NeuralNetwork {
	private layers: NeuralNetworkLayer[];

	private _inputs: number;
	public get inputs() { return this._inputs; }
	private inputMapping: ((number) => number)[];

	public constructor(
		inputs: number,
		hiddenLayers: number[],
		outputs: number,
		weightsDistribution: (layer: number, node: number, input: number) => number,
		activationFunctionsDistribution: (layer: number, node: number) => (value: number) => number,
		connectionsDistribution: (layer: number, node: number, input: number) => boolean
	) {
		this._inputs = inputs;

		this.inputMapping = Array(inputs).fill(0).map((v, i) => activationFunctionsDistribution(0, i));

		var layersSizes = hiddenLayers.concat([outputs]);

		this.layers = layersSizes.map((layerSize, layerNumber) => new NeuralNetworkLayer(
			layersSizes[layerNumber],
			(layerNumber == 0 ? inputs : layersSizes[layerNumber - 1]) + 1,
			(node, input) => weightsDistribution(layerNumber + 1, node, input),
			(node) => activationFunctionsDistribution(layerNumber + 1, node),
			(node, input) => connectionsDistribution(layerNumber + 1, node, input)
		));
	}

	public passValues(values: number[]): number[] {
		values = values.map((v, i) => this.inputMapping[i](v));
		for (var i = 0; i < this.layers.length; i++) {
			values.push(1);
			values = this.layers[i].passValues(values);
		}

		return values;
	}

	public getWeights(): number[][][] {
		return this.layers.map(l => l.getWeights());
	}
};

export class FullyConnectedNeuralNetwork extends NeuralNetwork {
	public constructor(
		inputs: number,
		hiddenLayers: number[],
		outputs: number,
		weightsDistribution: (layer: number, node: number, input: number) => number,
		activationFunctionsDistribution: (layer: number, node: number) => (value: number) => number
	) {
		super(inputs, hiddenLayers, outputs, weightsDistribution, activationFunctionsDistribution, () => true);
	}
}