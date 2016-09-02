/// <reference path="Typed/jquery.d.ts" />
/// <reference path="Typed/jqueryui.d.ts" />
/// <reference path="Typed/ace.d.ts" />
/// <reference path="Typed/handlebars.d.ts" />

import { CanvasGraphicalInterface } from './GameEngine/GraphicalInterface'
import { StandardInputInterface } from './GameEngine/InputInterface'
import { GameHost } from './GameHost'
import { RaceGenerator } from './RacingGame'

$(() => {

	// ============== Scrolling =================

	let holder = $('#game-canvas-holder');
	$('#game-canvas-holder').hover(e => holder.css('left', '10vw'));
	$('#settings').hover(e => holder.css('left', '90vw'));

	// ============== Settings =================

	let restartMessage = $('#restart-message');

	let settingTemplate = Handlebars.compile($("#setting-template").html());

	class Setting {
		private firstLineEditor: AceAjax.Editor;
		private codeEditor: AceAjax.Editor;
		private lastLineEditor: AceAjax.Editor;

		public setDefault() {
			this.codeEditor.setValue(this.defaultValue, 1);
		}

		constructor(
			title: string,
			description: string,
			private firstLine: string,
			private defaultValue: string,
			private lastLine: string,
			private mode: string,
			containter: string
		) {
			let html = settingTemplate({
				title: title,
				defaultValue: defaultValue,
				firstLine: firstLine,
				lastLine: lastLine
			});
			let element = $(html);

			let addEditor = (element: JQuery, content: string, mode: string, disabled: boolean) => {
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
				editor.session.setUseWorker(false)

				if (disabled) {
					editor.renderer.setShowGutter(false);
					editor.setOptions({
						readOnly: true,
						highlightActiveLine: false,
						highlightGutterLine: false
					});
					(<any>editor).renderer.$cursorLayer.element.style.opacity = 0
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

		raceParams: new Setting('Game parameters', '',
			undefined,
			`{
	"sensorLength": 120,
	"maxTrackWidth": 7,
	"maxTrackHeight": 7,
	"trackSegmentSize": 120,
	"trackSegmentFill": 0.6,
	"trackCornerCut": 0.5
}`,
			undefined,
			'json', 'race-settings'
		),

		stopCondition: new Setting('Stop condition of race', '',
			`// (car: {lap: number, ai: boolean, alive: boolean}[], gameTime: number, active: boolean) => boolean
function(cars, gameTime) {`,
			`return cars.filter(c => c.ai && c.active && c.lap < 2).length === 0 || gameTime > 60000;`,
			`}`,
			'javascript', 'race-settings'
		),

		// NN settings

		networkSize: new Setting('Network size', '',
			undefined,
			`{
	"inputs": 8,
	"hiddenLayers": [100]
}`,
			undefined,
			'json', 'nn-settings'
		),

		activationFunction: new Setting('Activation function', '',
			`// (layer: number, node: number, layers: number[]) => (value: number) => number
function(layer, node, layers) {`,
			`if (layer === 0) // input mapping
	return value => value;
else if (layer < layers.length - 1) // hidden layers
	return value => 1 / (1 + Math.pow(Math.E, -4 * value));
else // output layer
	return value => value;`,
			`}`,
			'javascript', 'nn-settings'
		),

		// GA settings

		gaParams: new Setting('Genetics algorith paramas', '',
			undefined,
			`{
	"populationSize": 20,
	"mutationRate": 0.5,
	"crossingRate": 0.5
}`,
			undefined,
			'json', 'ga-settings'
		),

		mutation: new Setting('Mutation', '',
			`// (specimen: number[]) => number[]
function(specimen) {`,
			`return specimen.map(gen => (Math.random() < 0.2) ? (gen + Math.random() * 0.2 - 0.1) : gen);`,
			`}`,
			'javascript', 'ga-settings'
		),

		crossing: new Setting('Crossing', '',
			`// (first: number[], second: number[]) => number[]
function(first, second) {`,
			`return first.map((gen, index) => index % 2 === 0 ? gen : second[index]);`,
			`}`,
			'javascript', 'ga-settings'
		),

		selection: new Setting('Selection', '',
			`// (fitnesses: number[]) => IterableIterator<number>
function*(fitnesses) {`,
			`while (true) {
	// Ring selection
	yield new Array(5).fill(0)
		.map(v => Math.floor(Math.random() * fitnesses.length))
		.map(v => ({ score: fitnesses[v], index: v }))
		.reduce((p, c) => (p.score > c.score) ? p : c)
		.index;
}`,
			`	throw "Selection generator drained";
}`,
			'javascript', 'ga-settings'
		),

	};

	let gameParameter = {
		skipGeneration: false,
		skipFunction: (cars: { lap: number, ai: boolean, alive: boolean }[], gameTime: number) => {
			return cars.filter(c => c.ai && c.alive && c.lap < 2).length == 0 || gameTime > 10000;
		}
	};
	$('#skip-button').click(e => gameParameter.skipGeneration = true);

	let canvas = $("#game-canvas");

	// ============== Game =================

	let generationNumber = $('#generation-number');

	let graphicsInterface = new CanvasGraphicalInterface(<HTMLCanvasElement>$("#game-canvas")[0]);
    let inputInterface = new StandardInputInterface();
    graphicsInterface.defalutFont = 'Dosis';

	let game: GameHost = null;

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
		}

		let _raceParams = settings.raceParams.getValue();

		let _nnParams = settings.networkSize.getValue();
		let _activationFunction = settings.activationFunction.getValue();

		let _gaParams = settings.gaParams.getValue();
		let _gaMutation = settings.mutation.getValue();
		let _gaCrossing = settings.crossing.getValue();
		let _gaSelection = settings.selection.getValue();

		let generator = new RaceGenerator(_raceParams, stopCondition);

		game = new GameHost(
			_nnParams,
			_gaParams, _gaMutation, _gaCrossing, _gaSelection,
			_activationFunction,
			graphicsInterface,
			inputInterface,
			generator,
			g => generationNumber.text(g));
		game.start();
	}

	$('#start-button').click(start);
	start();
})