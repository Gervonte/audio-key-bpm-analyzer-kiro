// Worker Manager for optimized Web Worker handling and memory management

export interface WorkerTask<T = any, R = any> {
  id: string
  type: string
  data: T
  resolve: (result: R) => void
  reject: (error: Error) => void
  timeout?: number
}

export interface WorkerPool {
  workers: Worker[]
  availableWorkers: Worker[]
  busyWorkers: Set<Worker>
  pendingTasks: WorkerTask[]
  maxWorkers: number
}

export class WorkerManager {
  private pools: Map<string, WorkerPool> = new Map()
  private taskCounter = 0
  private activeTasks: Map<string, WorkerTask> = new Map()

  /**
   * Create or get a worker pool for a specific worker type
   */
  createPool(workerType: string, workerUrl: string, maxWorkers: number = 2): WorkerPool {
    if (this.pools.has(workerType)) {
      return this.pools.get(workerType)!
    }

    const pool: WorkerPool = {
      workers: [],
      availableWorkers: [],
      busyWorkers: new Set(),
      pendingTasks: [],
      maxWorkers: Math.min(maxWorkers, navigator.hardwareConcurrency || 2)
    }

    // Create initial workers
    for (let i = 0; i < pool.maxWorkers; i++) {
      const worker = this.createWorker(workerUrl, workerType)
      pool.workers.push(worker)
      pool.availableWorkers.push(worker)
    }

    this.pools.set(workerType, pool)
    return pool
  }

  /**
   * Execute a task using the worker pool
   */
  async executeTask<T, R>(
    workerType: string,
    taskType: string,
    data: T,
    timeout: number = 30000
  ): Promise<R> {
    const pool = this.pools.get(workerType)
    if (!pool) {
      throw new Error(`Worker pool '${workerType}' not found`)
    }

    return new Promise<R>((resolve, reject) => {
      const taskId = `${workerType}_${++this.taskCounter}`
      const task: WorkerTask<T, R> = {
        id: taskId,
        type: taskType,
        data,
        resolve,
        reject,
        timeout
      }

      this.activeTasks.set(taskId, task)
      this.processTask(pool, task)
    })
  }

  /**
   * Process a task with an available worker or queue it
   */
  private processTask<T, R>(pool: WorkerPool, task: WorkerTask<T, R>): void {
    const worker = pool.availableWorkers.pop()
    
    if (worker) {
      this.assignTaskToWorker(pool, worker, task)
    } else {
      // Queue the task if no workers are available
      pool.pendingTasks.push(task)
    }
  }

  /**
   * Assign a task to a specific worker
   */
  private assignTaskToWorker<T, R>(pool: WorkerPool, worker: Worker, task: WorkerTask<T, R>): void {
    pool.busyWorkers.add(worker)

    // Set up timeout
    let timeoutId: number | undefined
    if (task.timeout) {
      timeoutId = setTimeout(() => {
        this.completeTask(pool, worker, task.id)
        task.reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`))
      }, task.timeout)
    }

    // Set up message handler
    const messageHandler = (event: MessageEvent) => {
      const { taskId, result, error } = event.data
      
      if (taskId === task.id) {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        worker.removeEventListener('message', messageHandler)
        worker.removeEventListener('error', errorHandler)

        this.completeTask(pool, worker, task.id)

        if (error) {
          task.reject(new Error(error))
        } else {
          task.resolve(result)
        }
      }
    }

    // Set up error handler
    const errorHandler = (error: ErrorEvent) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      worker.removeEventListener('message', messageHandler)
      worker.removeEventListener('error', errorHandler)

      this.completeTask(pool, worker, task.id)
      const errorMessage = error && error.message ? error.message : 'Unknown worker error'
      task.reject(new Error(`Worker error: ${errorMessage}`))
    }

    worker.addEventListener('message', messageHandler)
    worker.addEventListener('error', errorHandler)

    // Send task to worker
    worker.postMessage({
      taskId: task.id,
      type: task.type,
      ...task.data
    })
  }

  /**
   * Complete a task and make worker available for next task
   */
  private completeTask(pool: WorkerPool, worker: Worker, taskId: string): void {
    pool.busyWorkers.delete(worker)
    pool.availableWorkers.push(worker)
    this.activeTasks.delete(taskId)

    // Process next pending task if any
    const nextTask = pool.pendingTasks.shift()
    if (nextTask) {
      this.processTask(pool, nextTask)
    }
  }

  /**
   * Create a worker with proper error handling
   */
  private createWorker(workerUrl: string, workerType: string): Worker {
    try {
      // Check if Worker is available (not available in some test environments)
      if (typeof Worker === 'undefined') {
        throw new Error('Worker not available in this environment')
      }

      const worker = new Worker(workerUrl, { type: 'module' })
      
      // Add global error handler
      worker.addEventListener('error', (error) => {
        console.error(`Worker ${workerType} error:`, error)
      })

      return worker
    } catch (error) {
      throw new Error(`Failed to create worker ${workerType}: ${error}`)
    }
  }

  /**
   * Terminate all workers in a pool
   */
  terminatePool(workerType: string): void {
    const pool = this.pools.get(workerType)
    if (!pool) return

    // Terminate all workers
    pool.workers.forEach(worker => worker.terminate())
    
    // Reject all pending tasks
    pool.pendingTasks.forEach(task => {
      task.reject(new Error('Worker pool terminated'))
    })

    // Clear pool
    this.pools.delete(workerType)
  }

  /**
   * Terminate all worker pools
   */
  terminateAll(): void {
    for (const workerType of this.pools.keys()) {
      this.terminatePool(workerType)
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(workerType: string) {
    const pool = this.pools.get(workerType)
    if (!pool) return null

    return {
      totalWorkers: pool.workers.length,
      availableWorkers: pool.availableWorkers.length,
      busyWorkers: pool.busyWorkers.size,
      pendingTasks: pool.pendingTasks.length,
      activeTasks: this.activeTasks.size
    }
  }
}

// Global worker manager instance
export const workerManager = new WorkerManager()