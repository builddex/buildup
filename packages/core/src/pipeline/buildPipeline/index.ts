import { TaskManager } from "../../TaskManager";

export async function buildPipeline() {
  console.time('📦 buildPipeline');

  const taskManager = new TaskManager({ action: 'build' });

  await taskManager.load();
  await taskManager.doTask();

  console.timeEnd('📦 buildPipeline');
}

