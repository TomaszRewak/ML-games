export class GeneticAlgorithm {
	private population: number[][];

	public fitnessFunction: (specimens: number[][]) => Promise<number[]>;
	public stopCondition: () => boolean;
	public selectFunction: (fitnesses: number[]) => IterableIterator<number>;
	public mutateFunction: (specimen: number[]) => number[];
	public crossFunction: (first: number[], second: number[]) => number[];
	public mutationRate: () => boolean;
	public crossRate: () => boolean;

	private _bestSpecimen: { specimen: number[], score: number } = { specimen: null, score: Number.MAX_VALUE };
	get bestSpecimen() { return this._bestSpecimen }

	private _generation: number = 0;
	get generation() { return this._generation; }

	constructor(
		initialPopulation: number[][],
		fitnessFunction: (specimens: number[][]) => Promise<number[]>,
		stopCondition: () => boolean,
		selectFunction: (fitnesses: number[]) => IterableIterator<number>,
		mutateFunction: (specimen: number[]) => number[],
		crossFunction: (first: number[], second: number[]) => number[],
		mutationRate: () => boolean,
		crossRate: () => boolean
	) {
		this.population = initialPopulation.map(v => v.slice());
		this.fitnessFunction = fitnessFunction;
		this.stopCondition = stopCondition;
		this.selectFunction = selectFunction;
		this.mutateFunction = mutateFunction;
		this.crossFunction = crossFunction;
		this.mutationRate = mutationRate;
		this.crossRate = crossRate;
	}

	public async run(): Promise<void> {
		while (!this.stopCondition()) {

			this.emit('new generation', this._generation);

			var oldPopulation = this.population;
			var newPopulation: number[][] = [];

			var popSize = oldPopulation.length;
			var fitness = await this.fitnessFunction(oldPopulation);

			if (!fitness)
				return;

			var bestSpecimen = fitness.map((v, i) => ({ specimen: oldPopulation[i], score: v })).reduce((p, c) => p.score < c.score ? p : c);
			if (bestSpecimen.score < this._bestSpecimen.score)
				this._bestSpecimen = bestSpecimen;

			let selector = this.selectFunction(fitness);

			while (newPopulation.length < popSize) {
				let specimen = oldPopulation[selector.next().value];

				if (this.crossRate())
					specimen = this.crossFunction(specimen, oldPopulation[selector.next().value])

				if (this.mutationRate())
					specimen = this.mutateFunction(specimen);

				newPopulation.push(specimen);
			}

			this.population = newPopulation;

			this._generation++;
		}
	}

	private events: Map<string, ((game: GeneticAlgorithm, args: any) => any)[]> = new Map();
	on(name: string, action: (game: GeneticAlgorithm, args: any) => any) {
		if (this.events.has(name))
			this.events.get(name).push(action);
		else
			this.events.set(name, [action]);
	}
	emit(name: string, args: any) {
		if (this.events.has(name))
			for (let event of this.events.get(name))
				event(this, args);
	}
};