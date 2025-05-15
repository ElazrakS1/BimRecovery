export function createWorkerURL(workerContent) {
  const blob = new Blob([workerContent], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}
