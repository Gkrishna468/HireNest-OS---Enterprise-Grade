import { startInterviewWorker } from './interviewWorker';
import { startSubmissionWorker } from './submissionWorker';
import { startSLAWorker } from './slaWorker';

export const bootstrapWorkers = async () => {
  console.log('[WorkerBootstrap] Initializing Temporal Worker Fleet...');
  
  try {
    await Promise.all([
      startInterviewWorker(),
      startSubmissionWorker(),
      startSLAWorker()
    ]);
    console.log('[WorkerBootstrap] Worker Fleet successfully started. Listening to task queues.');
  } catch (error) {
    console.error('[WorkerBootstrap] Critical error during worker fleet initialization.', error);
    process.exit(1);
  }
};
