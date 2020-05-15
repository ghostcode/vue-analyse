import config from './config'
import {
  warn,
  nextTick,
  devtools
} from './util/index'

// we have two separate queues: one for directive updates
// and one for user watcher registered via $watch().
// we want to guarantee directive updates to be called
// before user watchers so that when user watchers are
// triggered, the DOM would have already been in updated
// state.

var queueIndex
var queue = []
var userQueue = []
var has = {}
var circular = {}
var waiting = false
var internalQueueDepleted = false

/**
 * Reset the batcher's state.
 */

function resetBatcherState () {
  queue = []
  userQueue = []
  has = {}
  circular = {}
  waiting = internalQueueDepleted = false
}

/**
 * Flush both queues and run the watchers.
 * 优先执行模板对应的 Watcher，之后再执行 $watch 的，确保 DOM 节点优先更新
 */

function flushBatcherQueue () {
  // queue 是模板解析的指令对应的 Watcher 
  runBatcherQueue(queue)
  internalQueueDepleted = true
  // userQueue 是指用户通过 $watch 方法注册的 Watcher
  runBatcherQueue(userQueue)
  // dev tool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
  resetBatcherState()
}

/**
 * Run the watchers in a single queue.
 * 
 * @param {Array} queue
 */

function runBatcherQueue (queue) {
  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (queueIndex = 0; queueIndex < queue.length; queueIndex++) {
    var watcher = queue[queueIndex]
    var id = watcher.id
    has[id] = null
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > config._maxUpdateCount) {
        warn(
          'You may have an infinite update loop for watcher ' +
          'with expression "' + watcher.expression + '"',
          watcher.vm
        )
        break
      }
    }
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 * 
 * pushWatcher 方法把 Watcher 推入队列中，通过 nextTick 方法在下一个事件循环周期处理 Watcher 队列，这是 Vue.js的一种性能优化手段。
 * 
 * @param {Watcher} watcher
 *   properties:
 *   - {Number} id
 *   - {Function} run
 */

export function pushWatcher (watcher) {
  var id = watcher.id
  if (has[id] == null) {
    if (internalQueueDepleted && !watcher.user) {
      // an internal watcher triggered by a user watcher...
      // let's run it immediately after current user watcher is done.
      userQueue.splice(queueIndex + 1, 0, watcher)
    } else {
      // push watcher into appropriate queue
      var q = watcher.user
        ? userQueue
        : queue
      has[id] = q.length
      q.push(watcher)
      // queue the flush
      if (!waiting) {
        waiting = true
        nextTick(flushBatcherQueue)
      }
    }
  }
}
