import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

// A bounded pool loads R packages once. The protocol accepts file paths, never source code.
export function createRPool({ executable, script, cwd, env, size = 2 }) {
  const workers = new Set(),
    waiting = [];
  let sequence = 0,
    closed = false;
  const hold = (w, yes) => {
    for (const handle of [
      w.child,
      w.child.stdin,
      w.child.stdout,
      w.child.stderr,
    ])
      handle?.[yes ? "ref" : "unref"]?.();
  };
  function finish(w, error, value) {
    const task = w.task;
    if (!task) return;
    clearTimeout(task.timer);
    w.task = null;
    error ? task.reject(error) : task.resolve(value);
    hold(w, false);
    pump();
  }
  function start() {
    const child = spawn(executable, ["--vanilla", script, "--worker"], {
      cwd,
      env,
      windowsHide: true,
    });
    const w = { child, task: null, stderr: "", dead: false };
    workers.add(w);
    const lines = createInterface({ input: child.stdout });
    lines.on("line", (line) => {
      if (!line.startsWith("@@FIGURE@@")) return;
      try {
        const answer = JSON.parse(line.slice(10));
        if (answer.id !== w.task?.id) return;
        finish(w, answer.ok ? null : new Error(answer.error), {
          stdout: "",
          stderr: w.stderr,
          warm: answer.warm,
          renderMs: answer.ms,
        });
      } catch (e) {
        finish(w, e);
      }
    });
    child.stderr.on("data", (d) => {
      w.stderr = (w.stderr + d.toString()).slice(-4000);
    });
    function died(error) {
      if (w.dead) return;
      w.dead = true;
      workers.delete(w);
      finish(w, error);
      lines.close();
      pump();
    }
    child.on("error", (e) => died(new Error("R 环境不可用：" + e.message)));
    child.on("exit", () =>
      died(new Error(w.stderr || "R 绘图进程已退出，请重试")),
    );
    return w;
  }
  function pump() {
    while (!closed && waiting.length) {
      const w =
        [...workers].find((w) => !w.task && !w.dead) ||
        (workers.size < size ? start() : null);
      if (!w) break;
      const task = waiting.shift();
      w.task = task;
      w.stderr = "";
      hold(w, true);
      task.timer = setTimeout(() => {
        workers.delete(w);
        w.dead = true;
        w.child.kill();
        finish(w, new Error("绘图超过90秒，请减少数据量后重试"));
      }, task.timeout);
      w.child.stdin.write(
        JSON.stringify({ id: task.id, args: task.args }) + "\n",
        (e) => {
          if (e) finish(w, e);
        },
      );
    }
  }
  function close() {
    closed = true;
    for (const w of workers) {
      if (w.task) finish(w, new Error("绘图服务已关闭"));
      w.child.kill();
    }
    workers.clear();
    while (waiting.length) waiting.shift().reject(new Error("绘图服务已关闭"));
  }
  process.once("exit", close);
  return {
    run(args, timeout = 90000) {
      return new Promise((resolve, reject) => {
        if (closed) return reject(new Error("绘图服务已关闭"));
        waiting.push({ id: ++sequence, args, timeout, resolve, reject });
        pump();
      });
    },
    close,
  };
}
