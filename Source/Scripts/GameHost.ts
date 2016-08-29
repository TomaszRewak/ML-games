import { GeneticAlgorithm } from './GA/GA'
import { NeuralNetwork, FullyConnectedNeuralNetwork } from './NN/NN'
import { SoftLogic } from './SoftLogic'
import { GraphicalInterface } from './GameEngine/GraphicalInterface'
import { InputInterface } from './GameEngine/InputInterface'

export interface HostedGame {
	run(): Promise<number[]>;
	stop();
}

export interface HostedGameGenerator {
	generate(networks: NeuralNetwork[], input: InputInterface, graphics: GraphicalInterface): HostedGame;
	nnOutputs: number;
}

interface NNParams {
	inputs: number,
	hiddenLayers: number[]
}

interface GAParams {
	populationSize: number,
	mutationRate: number,
	crossingRate: number,
}

export class GameHost {
	private input: InputInterface;
	private graphics: GraphicalInterface;

	private ga: GeneticAlgorithm;

	private inputs: number;
	private hiddenLayers: number[];
	private outputs: number;

	private ringSize: number;

	private gameGenerator: HostedGameGenerator;

	private game: HostedGame;
	private stop: boolean = false;

	private activarionFunction: (layer: number, node: number) => (value: number) => number;

	private async race(specimens: number[][]): Promise<number[]> {
		if (this.stop)
			return null;

		var networks = specimens
			.map(v => SoftLogic.decodeGenotype(this.inputs, this.hiddenLayers, this.outputs, v))
			.map(v => new FullyConnectedNeuralNetwork(
				this.inputs,
				this.hiddenLayers,
				this.outputs,
				(l, n, i) => v[l - 1][n][i],
				this.activarionFunction));

		this.game = this.gameGenerator.generate(networks, this.input, this.graphics);
		let result = await this.game.run();
		this.game = null;

		return result;
	}

	public async start() {
		await this.ga.run();
	}

	public async kill() {
		this.stop = true;
		if (this.game)
			this.game.stop();
	}

	public constructor(
		nnParams: NNParams,
		gaParams: GAParams,
		private mutate: (specimen: number[]) => number[],
		private cross: (first: number[], second: number[]) => number[],
		private select: (fitnesses: number[]) => IterableIterator<number>,
		activarionFunction: (layer: number, node: number, layers: number[]) => (value: number) => number,
		graphics: GraphicalInterface,
		input: InputInterface,
		gameGenerator: HostedGameGenerator,
		onNewGeneration: (generation: number) => void
	) {
		this.inputs = nnParams.inputs;
		this.hiddenLayers = nnParams.hiddenLayers;
		this.outputs = gameGenerator.nnOutputs;

		let layersDefinition = [this.inputs].concat(this.hiddenLayers.concat([this.outputs]));
		this.activarionFunction = (l, n) => activarionFunction(l, n, layersDefinition);

		this.gameGenerator = gameGenerator;

		var initialPopulation = new Array(gaParams.populationSize)
			.fill([])
			.map(v => new Array(SoftLogic.genotypeLength(this.inputs, this.hiddenLayers, this.outputs))
				.fill(0)
				.map(v => Math.random() * 1 - 0.5));

		this.ga = new GeneticAlgorithm(
			initialPopulation,
			specimens => this.race(specimens),
			() => false,
			this.select,
			this.mutate,
			this.cross,
			() => Math.random() < gaParams.mutationRate,
			() => Math.random() < gaParams.crossingRate,
			onNewGeneration);

		this.input = input;
		this.graphics = graphics;
	}
}