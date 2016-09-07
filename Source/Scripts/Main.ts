/// <reference path="Typed/jquery.d.ts" />
/// <reference path="Typed/jqueryui.d.ts" />
/// <reference path="Typed/ace.d.ts" />
/// <reference path="Typed/handlebars.d.ts" />

import { CanvasGraphicalInterface } from './GameEngine/GraphicalInterface'
import { StandardInputInterface } from './GameEngine/InputInterface'
import { RaceGameDefinition } from './Games/Racing/RacingGameDefinition'
import { Game, GameDefinition } from './Games/Game'

$(() => {

	// ============== Scrolling =================

	let holder = $('#game-canvas-holder');
	$('#game-canvas-holder').hover(e => holder.css('left', '10vw'));
	$('#settings').hover(e => holder.css('left', '90vw'));

	// ============== Settings =================

	let restartMessage = $('#restart-message');

	let settingTemplate = Handlebars.compile($("#setting-template").html());
	let settingCategoryTemplate = Handlebars.compile($("#setting-category-template").html());

	class Setting {
		private firstLineEditor: AceAjax.Editor;
		private codeEditor: AceAjax.Editor;
		private lastLineEditor: AceAjax.Editor;

		public element: JQuery;

		public setDefault() {
			this.codeEditor.setValue(this.defaultValue, 1);
		}

		constructor(
			title: string,
			description: string,
			private firstLine: string,
			private defaultValue: string,
			private lastLine: string,
			private mode: string
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

			this.element = element;
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

	let game: Game = null;
	let gameDefinitions = [
		new RaceGameDefinition()
	];
	let gameDefinition: GameDefinition;
	let settings: {name: string, settings: {name: string, setting: Setting}[]}[] = [];

	let selectGame = (index: number) => {
		let settingsContainer = $('#settings-container');

		if (game)
			game.stop();

		gameDefinition = gameDefinitions[0];

		for (let categoryDefinition of gameDefinition.settings) {
			let categoryElement = $(settingCategoryTemplate({ name: categoryDefinition.name }));
			settingsContainer.append(categoryElement);

			let category = {
				name: categoryDefinition.shortName,
				settings: <{ name: string, setting: Setting }[]>[]
			};
			for (let settingDefinition of categoryDefinition.settings) {
				let setting = new Setting(
					settingDefinition.name,
					settingDefinition.description,
					settingDefinition.firstLine,
					settingDefinition.defaultValue,
					settingDefinition.lastLine,
					settingDefinition.mode
				);
				settingsContainer.append(setting.element);

				category.settings.push({
					name: settingDefinition.shortName,
					setting: setting
				});
			}
			settings.push(category);
		}
	};

	let gameEnvironmant = {
		skipGeneration: false,
		skipFunction: (cars: { lap: number, ai: boolean, alive: boolean }[], gameTime: number) => {
			return cars.filter(c => c.ai && c.alive && c.lap < 2).length == 0 || gameTime > 10000;
		}
	};
	$('#skip-button').click(e => gameEnvironmant.skipGeneration = true);

	// ============== Game =================

	let progress = $('#progress');

	let graphicsInterface = new CanvasGraphicalInterface(<HTMLCanvasElement>$("#game-canvas")[0]);
    let inputInterface = new StandardInputInterface();
    graphicsInterface.defalutFont = 'Dosis';

	let start = () => {
		if (game)
			game.stop();

		restartMessage.hide();

		let params = {};
		for (let category of settings) {
			let categorySettings = {};

			for (let setting of category.settings)
				categorySettings[setting.name] = setting.setting.getValue();

			params[category.name] = categorySettings;
		}

		params['environment'] = {
			skipCondition: () => {
				if (gameEnvironmant.skipGeneration) {
					gameEnvironmant.skipGeneration = false;
					return true;
				}
			}
		};

		game = gameDefinition.instantiate(inputInterface, graphicsInterface, params);
		game.on('progress', (g, a) => {
			progress.html(a);
		});
		game.start();
	}

	$('#start-button').click(start);

	selectGame(0);
	start();
})