import "./style.css";
import { PixiVisualizer } from "./visualizer/PixiVisualizer";
// import { Pane } from "tweakpane";
import type {
	MainToWorkerMessage,
	WorkerToMainMessage,
} from "./shared/SimulationMessages";
import type { SimulationSnapshot } from "./shared/SimulationSnapshot";
import { Parser } from "./language/Parser.ts";
import { Interpreter } from "./language/Interpreter.ts";
import {
	modelPrograms,
	type ModelName,
} from "./models/ModelPrograms.ts";


const width = 900;
const height = 600;

const container = document.querySelector<HTMLDivElement>(
	"#simulationContainer"
)!;

const codeEditor =
	document.querySelector<HTMLTextAreaElement>(
		"#codeEditor"
	)!;

codeEditor.addEventListener(
	"keydown",
	(event: KeyboardEvent) => {
		if (event.key !== "Tab") {
			return;
		}

		event.preventDefault();

		const selectionStart =
			codeEditor.selectionStart;

		const selectionEnd =
			codeEditor.selectionEnd;

		codeEditor.setRangeText(
			"    ",
			selectionStart,
			selectionEnd,
			"end"
		);
	}
);

const loadProgramButton =
	document.querySelector<HTMLButtonElement>(
		"#loadProgramButton"
	)!;

const languageMessage =
	document.querySelector<HTMLSpanElement>(
		"#languageMessage"
	)!;

const modelButtons =
	document.querySelectorAll<HTMLButtonElement>(
		".model-button"
	);

const visualizer = new PixiVisualizer();
await visualizer.initialize(container, width, height);
const defaultSource = modelPrograms.ants;

codeEditor.value = defaultSource;

console.log("Parsovaný program:");
console.log(codeEditor.value);

let parser = new Parser(codeEditor.value);
let program = parser.parse();

console.log(
	"Vytvorené AST:",
	JSON.stringify(program, null, 2)
);

let interpreter = new Interpreter();
interpreter.run(program);

let languagePositions =
	interpreter.getAllAgentPositions();

function loadProgram(): void {
	try {
		const newParser = new Parser(
			codeEditor.value
		);

		const newProgram =
			newParser.parse();

		const newInterpreter =
			new Interpreter();

		newInterpreter.run(newProgram);

		if (
			worldPatchWidth === 0 ||
			worldPatchHeight === 0
		) {
			throw new Error(
				"Simulačný svet ešte nie je pripravený."
			);
		}

		newInterpreter.initializePatches(
			worldPatchWidth,
			worldPatchHeight,
			worldPatchCellSize
		);

		const newPositions =
			newInterpreter.getAllAgentPositions();

		const newPatchValues =
			newInterpreter.getPatchValues();
		
		const newPatchColors =
			newInterpreter.getPatchColors();

		isRunning = false;

		parser = newParser;
		program = newProgram;
		interpreter = newInterpreter;

		languagePositions =
			newPositions;

		languagePatchValues =
			newPatchValues;
		
		languagePatchColors =
			newPatchColors;

		if (latestSnapshot !== null) {
			latestSnapshot.agentCount =
				languagePositions.x.length;

			latestSnapshot.x =
				languagePositions.x;

			latestSnapshot.y =
				languagePositions.y;

			latestSnapshot.patchValues =
				languagePatchValues;
			
			latestSnapshot.patchColors =
				languagePatchColors;
		}

		languageMessage.textContent = "";
		languageMessage.className = "";
	} catch (error) {
		isRunning = false;

		if (error instanceof Error) {
			languageMessage.textContent =
				error.message;
		} else {
			languageMessage.textContent =
				"Pri načítaní programu vznikla chyba.";
		}

		languageMessage.className =
			"message-error";
	}
}

function selectModel(
	modelName: ModelName
): void {
	codeEditor.value =
		modelPrograms[modelName];

	loadProgram();

	for (const button of modelButtons) {
		const isSelected =
			button.dataset.model === modelName;

		button.classList.toggle(
			"active",
			isSelected
		);
	}
}

for (const button of modelButtons) {
	button.onclick = () => {
		const modelName =
			button.dataset.model;

		if (
			modelName !== "ants" &&
			modelName !== "fire" &&
			modelName !== "slime" &&
			modelName !== "life"
		) {
			return;
		}

		selectModel(modelName);
	};
}

for (const button of modelButtons) {
	if (button.dataset.model === "ants") {
		button.classList.add("active");
	}
}

loadProgramButton.onclick = () => {
	loadProgram();
};

// const pane = new Pane({
// 	title: "Riadiace centrum",
// });

let latestSnapshot: SimulationSnapshot | null = null;

let worldPatchWidth = 0;
let worldPatchHeight = 0;
let worldPatchCellSize = 0;

let languagePatchValues =
	new Float32Array(0);

let languagePatchColors =
	new Uint32Array(0);

const worker = new Worker(
	new URL("./simulation/simulation.worker.ts", import.meta.url),
	{ type: "module" }
);

function sendToWorker(message: MainToWorkerMessage): void {
	worker.postMessage(message);
}

worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
	const message = event.data;

	if (message.type === "sharedBuffers") {
		worldPatchWidth = message.patchWidth;
		worldPatchHeight = message.patchHeight;
		worldPatchCellSize = message.patchCellSize;

		interpreter.initializePatches(
			worldPatchWidth,
			worldPatchHeight,
			worldPatchCellSize
		);

		languagePositions =
			interpreter.getAllAgentPositions();

		languagePatchValues =
			interpreter.getPatchValues();
		
		languagePatchColors =
			interpreter.getPatchColors();

		latestSnapshot = {
			agentCount: languagePositions.x.length,
			x: languagePositions.x,
			y: languagePositions.y,

			patchWidth: worldPatchWidth,
			patchHeight: worldPatchHeight,
			patchCellSize: worldPatchCellSize,
			patchValues: languagePatchValues,
			patchColors: languagePatchColors,
		};
	}

	if (message.type === "frame") {
	}
};

let isRunning = false;
let lastStepTime = 0;

const stepInterval = 50;

function refreshLanguageData(): void {
	languagePositions =
		interpreter.getAllAgentPositions();

	languagePatchValues =
		interpreter.getPatchValues();
	
	languagePatchColors =
		interpreter.getPatchColors();

	if (latestSnapshot === null) {
		return;
	}

	latestSnapshot.agentCount =
		languagePositions.x.length;

	latestSnapshot.x =
		languagePositions.x;

	latestSnapshot.y =
		languagePositions.y;

	latestSnapshot.patchValues =
		languagePatchValues;
	
	latestSnapshot.patchColors =
		languagePatchColors;
}

function renderLoop(currentTime: number): void {
	if (
		isRunning &&
		currentTime - lastStepTime >= stepInterval
	) {
		try {
			interpreter.runFunction("go");
			refreshLanguageData();

			lastStepTime = currentTime;
		} catch (error) {
			isRunning = false;

			if (error instanceof Error) {
				languageMessage.textContent =
					error.message;
			} else {
				languageMessage.textContent =
					"Počas simulácie vznikla chyba.";
			}

			languageMessage.className =
				"message-error";
		}
	}

	if (latestSnapshot !== null) {
		visualizer.render(latestSnapshot);
	}

	requestAnimationFrame(renderLoop);
}

document.querySelector<HTMLButtonElement>(
	"#startButton"
)!.onclick = () => {
	isRunning = true;
	lastStepTime = performance.now();
};

document.querySelector<HTMLButtonElement>(
	"#stopButton"
)!.onclick = () => {
	isRunning = false;
};

document.querySelector<HTMLButtonElement>(
	"#resetButton"
)!.onclick = () => {
	loadProgram();
};

sendToWorker({
	type: "init",
	count: languagePositions.x.length,
	width,
	height,
});

requestAnimationFrame(renderLoop);