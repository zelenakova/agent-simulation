import "./style.css";
import { PixiVisualizer } from "./visualizer/PixiVisualizer";
// import { Pane } from "tweakpane";
import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
} from "./shared/SimulationMessages";
import type { SimulationSnapshot } from "./shared/SimulationSnapshot";

const width = 900;
const height = 600;
const agentCount = 5000;

const container = document.querySelector<HTMLDivElement>(
  "#simulationContainer"
)!;

const visualizer = new PixiVisualizer();
await visualizer.initialize(container, width, height);
// const pane = new Pane({
//   title: "Riadiace centrum",
// });

let latestSnapshot: SimulationSnapshot | null = null;

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
    const positions = new Float32Array(message.positionBuffer);
    const patchValues = new Float32Array(message.patchBuffer);

    latestSnapshot = {
      agentCount: message.agentCount,
      x: positions.subarray(0, message.agentCount),
      y: positions.subarray(message.agentCount, message.agentCount * 2),

      patchWidth: message.patchWidth,
      patchHeight: message.patchHeight,
      patchCellSize: message.patchCellSize,
      patchValues,
    };
  }

  if (message.type === "frame") {
  }
};

function renderLoop(): void {
  if (latestSnapshot) {
    visualizer.render(latestSnapshot);
  }

  requestAnimationFrame(renderLoop);
}

document.querySelector<HTMLButtonElement>("#startButton")!.onclick = () => {
  sendToWorker({ type: "start" });
};

document.querySelector<HTMLButtonElement>("#stopButton")!.onclick = () => {
  sendToWorker({ type: "stop" });
};

document.querySelector<HTMLButtonElement>("#resetButton")!.onclick = () => {
  sendToWorker({ type: "reset" });
};

sendToWorker({
  type: "init",
  count: agentCount,
  width,
  height,
});

renderLoop();