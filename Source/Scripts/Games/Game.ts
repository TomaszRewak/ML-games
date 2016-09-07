import { GeneticAlgorithm } from '../GA/GA'
import { NeuralNetwork, FullyConnectedNeuralNetwork } from '../NN/NN'
import { SoftLogic } from './SoftLogic'
import { GraphicalInterface } from '../GameEngine/GraphicalInterface'
import { InputInterface } from '../GameEngine/InputInterface'

export interface Game {
	start();
	stop();
	on(event: string, action: (game: Game, args: any) => any);
}

export abstract class GameDefinition {

	public abstract instantiate(input: InputInterface, graphics: GraphicalInterface, params: any): Game;

	public settings: {
		name: string,
		shortName: string,
		settings: {
			name: string,
			shortName: string,
			description?: string,
			firstLine?: string,
			defaultValue: string,
			lastLine?: string,
			mode: string,
		}[];
	}[] = [];
}

export interface GA_NN_HostedGame {
	run(): Promise<number[]>;
	stop();
}

export class GA_NN_Game implements Game {
	private ga: GeneticAlgorithm;
	private game: GA_NN_HostedGame;

	private wasStopped: boolean = false;

	private activationFunction: (layer: number, node: number) => (value: number) => number;

	private async race(specimens: number[][]): Promise<number[]> {
		if (this.wasStopped)
			return null;

		var networks = specimens
			.map(v => SoftLogic.decodeGenotype(this.inputs, this.hiddenLayers, this.outputs, v))
			.map(v => new FullyConnectedNeuralNetwork(
				this.inputs,
				this.hiddenLayers,
				this.outputs,
				(l, n, i) => v[l - 1][n][i],
				this.activationFunction));

		this.game = this.gameGenerator(this.input, this.graphics, networks);
		let result = await this.game.run();
		this.game = null;

		return result;
	}

	public async start() {
		await this.ga.run();
	}

	public stop() {
		this.wasStopped = true;
		if (this.game)
			this.game.stop();
	}

	public constructor(
		private input: InputInterface,
		private graphics: GraphicalInterface,
		private gameGenerator: (input: InputInterface, graphics: GraphicalInterface, networks: NeuralNetwork[]) => GA_NN_HostedGame,
		private inputs: number,
		private hiddenLayers: number[],
		private outputs: number,
		populationSize: number,
		mutationRate: number,
		crossingRate: number,
		selectFunction: (fitnesses: number[]) => IterableIterator<number>,
		mutateFunction: (specimen: number[]) => number[],
		crossFunction: (first: number[], second: number[]) => number[],
		activationFunction: (layer: number, node: number, layers: number[]) => (value: number) => number
	) {
		let layersDefinition = [this.inputs].concat(this.hiddenLayers.concat([this.outputs]));
		this.activationFunction = (l, n) => activationFunction(l, n, layersDefinition);

		var initialPopulation = new Array(populationSize)
			.fill([])
			.map(v => new Array(SoftLogic.genotypeLength(this.inputs, this.hiddenLayers, this.outputs))
				.fill(0)
				.map(v => Math.random() * 1 - 0.5));

		this.ga = new GeneticAlgorithm(
			initialPopulation,
			specimens => this.race(specimens),
			() => false,
			selectFunction,
			mutateFunction,
			crossFunction,
			() => Math.random() < mutationRate,
			() => Math.random() < crossingRate);
	}

	private events: Map<string, ((game: Game, args: any) => any)[]> = new Map();
	on(name: string, action: (game: Game, args: any) => any) {
		if (name == 'progress')
			this.ga.on('new generation', (ga, generation) => action(this, `Generation: ${generation}`));
	}
}

export abstract class GA_NN_GameDefinition extends GameDefinition {
	protected abstract hostedGameGenerator(params: any): (input: InputInterface, graphics: GraphicalInterface, networks: NeuralNetwork[]) => GA_NN_HostedGame;

	public instantiate(input: InputInterface, graphics: GraphicalInterface, params: { [k: string]: { [k: string]: any } }): Game {

		return new GA_NN_Game(
			input,
			graphics,
			this.hostedGameGenerator(params),
			params['nn']['size']['inputs'],
			params['nn']['size']['hiddenLayers'],
			params['nn']['size']['outputs'],
			params['ga']['params']['populationSize'],
			params['ga']['params']['mutationRate'],
			params['ga']['params']['crossingRate'],
			params['ga']['selectFunction'],
			params['ga']['mutateFunction'],
			params['ga']['crossFunction'],
			params['nn']['activationFunction']
		);
	}

	constructor() {
		super();

		this.settings.push({
			name: 'Neural network settings',
			shortName: 'nn',
			settings: [
				{
					name: 'Network size',
					shortName: 'size',
					defaultValue: `{
	"inputs": 8,
	"hiddenLayers": [100]
}`,
					mode: 'json'
				},
				{
					name: 'Activation function',
					shortName: 'activationFunction',
					firstLine: `// (layer: number, node: number, layers: number[]) => (value: number) => number
function(layer, node, layers) {`,
					defaultValue: `if (layer === 0) // input mapping
	return value => value;
else if (layer < layers.length - 1) // hidden layers
	return value => 1 / (1 + Math.pow(Math.E, -4 * value));
else // output layer
	return value => value;`,
					lastLine: `}`,
					mode: 'javascript'
				}
			]
		});

		this.settings.push({
			name: 'Genetic algorithm settings',
			shortName: 'ga',
			settings: [
				{
					name: 'Genetics algorith paramas',
					shortName: 'params',
					defaultValue: `{
	"populationSize": 20,
	"mutationRate": 0.5,
	"crossingRate": 0.5
}`,
					mode: 'json'
				},
				{
					name: 'Mutation',
					shortName: 'mutateFunction',
					firstLine: `// (specimen: number[]) => number[]
function(specimen) {`,
					defaultValue: `return specimen.map(gen => (Math.random() < 0.2) ? (gen + Math.random() * 0.2 - 0.1) : gen);`,
					lastLine: `}`,
					mode: 'javascript'
				},
				{
					name: 'Crossing',
					shortName: 'crossFunction',
					firstLine: `// (first: number[], second: number[]) => number[]
function(first, second) {`,
					defaultValue: `return first.map((gen, index) => index % 2 === 0 ? gen : second[index]);`,
					lastLine: `}`,
					mode: 'javascript'
				},
				{
					name: 'Selection',
					shortName: 'selectFunction',
					firstLine: `// (fitnesses: number[]) => IterableIterator<number>
function*(fitnesses) {`,
					defaultValue: `while (true) {
	// Ring selection
	yield new Array(5).fill(0)
		.map(v => Math.floor(Math.random() * fitnesses.length))
		.map(v => ({ score: fitnesses[v], index: v }))
		.reduce((p, c) => (p.score > c.score) ? p : c)
		.index;
}`,
					lastLine: `	throw "Selection generator drained";
}`,
					mode: 'javascript'
				}
			]
		});
	}
}