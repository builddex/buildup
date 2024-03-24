import { TaskManager } from "../../TaskManager";

export async function devPipeline() {
  console.time('📦 devPipeline');

  const taskManager = new TaskManager({ action: 'dev' });

  await taskManager.load();
  await taskManager.doTask();

  console.timeEnd('📦 devPipeline');
}

