import { NeuralNetwork, FullyConnectedNeuralNetwork } from '../../NN/NN'
import { GraphicalInterface } from '../../GameEngine/GraphicalInterface'
import { InputInterface } from '../../GameEngine/InputInterface'
import { Game, GA_NN_HostedGame, GA_NN_GameDefinition } from '../Game'
import { Race } from './RacingGame'

export class RaceGameDefinition extends GA_NN_GameDefinition {
	protected hostedGameGenerator(params: any): (input: InputInterface, graphics: GraphicalInterface, networks: NeuralNetwork[]) => GA_NN_HostedGame {
		let gameParams = params['racing']['params'];
		let endCondition = params['racing']['stopCondition'];
		let skipCondition = params['environment']['skipCondition'];

		return (i, g, n) => new Race(n, i, g, gameParams, (c, t) => {
			return skipCondition() || endCondition(c, t);
		});
	}

	public instantiate(input: InputInterface, graphics: GraphicalInterface, params: { [k: string]: { [k: string]: any } }): Game {

		params['nn']['size']['outputs'] = 2;

		return super.instantiate(input, graphics, params);
	}

	constructor() {
		super();

		this.settings.push({
			name: 'Game settings',
			shortName: 'racing',
			settings: [
				{
					name: 'Game parameters',
					shortName: 'params',
					defaultValue: `{
	"sensorLength": 120,
	"maxTrackWidth": 7,
	"maxTrackHeight": 7,
	"trackSegmentSize": 120,
	"trackSegmentFill": 0.6,
	"trackCornerCut": 0.5
}`,
					mode: 'json'
				},
				{
					name: 'Stop condition of race',
					shortName: 'stopCondition',
					firstLine: `// (car: {lap: number, ai: boolean, alive: boolean}[], gameTime: number, active: boolean) => boolean
function(cars, gameTime) {`,
					defaultValue: `return cars.filter(c => c.ai && c.active && c.lap < 2).length === 0 || gameTime > 60000;`,
					lastLine: `}`,
					mode: 'javascript'
				}
			]
		});
	}
}