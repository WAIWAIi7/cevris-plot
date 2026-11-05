let token = "";
async function localFetch(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(120000),
    });
    window.dispatchEvent(
      new CustomEvent("figure-connection", { detail: true }),
    );
    return response;
  } catch (error) {
    if ((error as Error).name === "TimeoutError")
      throw new Error("处理时间较长，请稍后重试。当前草稿仍保存在本机。");
    window.dispatchEvent(
      new CustomEvent("figure-connection", { detail: false }),
    );
    throw new Error("无法连接本地绘图服务。请双击「启动科研绘图.cmd」后重试。");
  }
}
export async function initSession() {
  const r = await localFetch("/api/session");
  if (!r.ok) throw new Error("本地服务暂时不可用，请重新启动科研绘图。");
  token = (await r.json()).token;
}
export async function api(url: string, data?: unknown, retrySession = true) {
  const r = await localFetch(url, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      Authorization: "Bearer " + token,
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  if (r.status === 401 && retrySession) {
    await initSession();
    return api(url, data, false);
  }
  if (!r.ok) {
    const e = await r.json();
    throw new Error(e.error || "操作失败");
  }
  return r.headers.get("content-type")?.includes("application/json")
    ? r.json()
    : r.blob();
}
export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
export async function render(
  project: any,
  format: string,
  stillCurrent = () => true,
) {
  let job = await api("/api/render", { project, format });
  for (let i = 0; i < 240; i++) {
    if (!stillCurrent()) return null;
    if (job.status === "done") return job;
    if (job.status === "error") throw new Error(job.error);
    await delay(500);
    job = await api("/api/jobs/" + job.id);
  }
  throw new Error("绘图等待超时，请重试");
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export const readBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
async function db() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    // Keep the original storage identifier so renaming cannot hide saved drafts.
    const request = indexedDB.open("figure-studio", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("draft");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveDraft(project: any, key = "current") {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const t = d.transaction("draft", "readwrite");
    t.objectStore("draft").put(project, key);
    t.oncomplete = () => {
      d.close();
      resolve();
    };
    t.onerror = () => {
      d.close();
      reject(t.error);
    };
  });
}
export async function loadDraft(key = "current") {
  const d = await db();
  return new Promise<any>((resolve, reject) => {
    const t = d.transaction("draft").objectStore("draft").get(key);
    t.onsuccess = () => {
      d.close();
      resolve(t.result);
    };
    t.onerror = () => {
      d.close();
      reject(t.error);
    };
  });
}
