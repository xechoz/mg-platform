import { execFileSync } from 'node:child_process'

/**
 * Frees a game's dev port before Vite starts. A stale Vite process is stopped;
 * any other listener aborts startup so `strictPort` never silently moves the
 * dev server to a different port.
 */
const port = Number(process.argv[2])
if (!Number.isInteger(port) || port <= 0) {
  console.error('usage: node tooling/free-dev-port.ts <port>')
  process.exit(1)
}

const VITE_COMMAND = /(?:^|[\s/])(?:vite|vite\.js)(?:\s|$)/

interface Listener {
  pid: number
  command: string
}

const listeners = readListeners(port)
const foreign = listeners.filter((listener) => !VITE_COMMAND.test(listener.command))
if (foreign.length > 0) {
  console.error(`[dev-port] port ${port} is used by a non-vite process:`)
  for (const listener of foreign) {
    console.error(`  pid ${listener.pid}: ${listener.command || '<unknown>'}`)
  }
  console.error('[dev-port] refusing to kill it; stop it manually or choose another port')
  process.exit(1)
}

if (listeners.length > 0) {
  const pids = listeners.map((listener) => listener.pid)
  console.log(`[dev-port] stopping stale vite on port ${port} (pid ${pids.join(', ')})`)
  for (const pid of pids) stop(pid, 'SIGTERM')

  if (!(await waitUntilFree(port, 3000))) {
    for (const pid of pids) stop(pid, 'SIGKILL')
    if (!(await waitUntilFree(port, 1000))) {
      console.error(`[dev-port] port ${port} is still in use`)
      process.exit(1)
    }
  }
}

function readListeners(port: number): Listener[] {
  const pids = new Set<number>()
  try {
    const output = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
    })
    for (const line of output.split('\n')) {
      const pid = Number(line.trim())
      if (Number.isInteger(pid) && pid > 0) pids.add(pid)
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn('[dev-port] lsof not found; skipping stale vite cleanup')
    }
  }

  return [...pids].map((pid) => ({ pid, command: readCommand(pid) }))
}

function readCommand(pid: number): string {
  try {
    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function stop(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(pid, signal)
  } catch {
    // The process exited between lsof and kill.
  }
}

async function waitUntilFree(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (readListeners(port).length === 0) return true
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return readListeners(port).length === 0
}
