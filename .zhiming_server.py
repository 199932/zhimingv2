#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
知命V2 守护型静态 HTTP 服务
  - 用 ThreadingHTTPServer（多线程） 避免默认单线程卡死
  - 支持 Range（206 断点续传，手机端部分资源请求更快）
  - 自动 URL quote/unquote 中文文件名（避免中文404）
  - 写 PID 到 .zhiming_server.pid； stdout/stderr → .zhiming_server.log
  - 访问日志带 UA/状态码/大小/耗时
用法：
  setsid nohup python3 /workspace/.zhiming_server.py \
       > /workspace/.zhiming_server.log 2>&1 < /dev/null &
"""
import os, sys, time, socket, threading, urllib.parse, html, shutil, io
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from socketserver import ThreadingMixIn

ROOT = os.path.dirname(os.path.abspath(__file__))
PID_FILE = os.path.join(ROOT, ".zhiming_server.pid")
PORT = 8766
BIND = "0.0.0.0"

# MIME 常用映射（够用）
MIME = {
    ".html": "text/html; charset=utf-8",
    ".htm":  "text/html; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg":  "image/svg+xml",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico":  "image/x-icon",
    ".map":  "application/json; charset=utf-8",
    ".txt":  "text/plain; charset=utf-8",
    ".woff": "font/woff",
    ".woff2":"font/woff2",
    ".ttf":  "font/ttf",
}

def guess_mime(p):
    ext = os.path.splitext(p)[1].lower()
    return MIME.get(ext, "application/octet-stream")

def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    sys.stdout.write(f"[{ts}] {msg}\n")
    sys.stdout.flush()

class Handler(BaseHTTPRequestHandler):
    server_version = "ZhimingV2/1.0 Threading"
    sys_version = ""

    def log_message(self, fmt, *a):
        # 静默默认日志，用我们自己的日志
        return

    def _not_found(self, path):
        body = (f"<h1>404 Not Found</h1><p>{html.escape(path)}</p>").encode("utf-8")
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, fpath, fs, mimetype, range_header=None):
        start, end = 0, fs - 1
        status = 200
        if range_header:
            try:
                # 仅支持 bytes=start-end / bytes=start- / bytes=-suffix 简单模式
                if range_header.startswith("bytes="):
                    r = range_header[len("bytes="):].split(",",1)[0]
                    if r.startswith("-"):
                        suffix = int(r[1:])
                        start = max(0, fs - suffix); end = fs - 1
                    else:
                        s2, e2 = r.split("-", 1)
                        start = int(s2) if s2 else 0
                        end = int(e2) if e2 else (fs - 1)
                        if end >= fs: end = fs - 1
                    if start <= end < fs:
                        status = 206
            except Exception:
                start, end, status = 0, fs-1, 200
        length = end - start + 1
        self.send_response(status)
        self.send_header("Content-Type", mimetype)
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{fs}")
        # 静态文件：弱缓存 5 分钟，避免频繁 304 也 OK，但手机直接 no-cache 更直观
        self.send_header("Cache-Control", "no-cache, max-age=60")
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        with open(fpath, "rb") as f:
            if start: f.seek(start, 0)
            remain = length
            chunk = 64*1024
            try:
                while remain > 0:
                    data = f.read(min(chunk, remain))
                    if not data: break
                    self.wfile.write(data)
                    remain -= len(data)
            except (BrokenPipeError, ConnectionResetError):
                return

    def do_GET(self):
        t0 = time.time()
        raw = self.path.split("?",1)[0]
        path = urllib.parse.unquote(raw)
        # [根治UX] 根路径 / → 直接跳到知命V2.html，不用 /index.html（避免404找不到首页）
        # 注意: HTTP响应头只能是 latin-1，中文路径必须 urlencode（quote safe='/' 保留斜杠）
        if path in ("/", ""):
            target = "/" + urllib.parse.quote("知命V2.html", safe="")
            qs = ""
            if "?" in self.path:
                qp = self.path.split("?", 1)[1]
                qs = ("?" + qp) if qp else ""
            loc = target + qs
            self.send_response(302)
            self.send_header("Location", loc)
            self.send_header("Content-Length", "0")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            log(f"302 / → {loc}  UA={self.headers.get('User-Agent','-')[:60]}")
            return
        if path == "/": path = "/index.html"
        # 防止路径穿越
        abs_path = os.path.normpath(os.path.join(ROOT, path.lstrip("/")))
        if not (abs_path.startswith(ROOT + os.sep) or abs_path == ROOT):
            self._not_found(path); return
        if os.path.isdir(abs_path):
            # 目录尝试 index.html，否则返回目录列表（简单）
            idx = os.path.join(abs_path, "index.html")
            if os.path.isfile(idx): abs_path = idx
            else:
                self._send_dir_list(abs_path, path); return
        if not os.path.isfile(abs_path):
            # 对根做兜底：知命V2.html 作为默认首页也能通过 /知命V2.html 访问（如果存在）
            self._not_found(path); return
        try:
            fs = os.path.getsize(abs_path)
            rng = self.headers.get("Range")
            mime = guess_mime(abs_path)
            self._send_file(abs_path, fs, mime, rng)
            stc = 206 if (rng and 0) else 200
            # 状态码从响应码拿，可能被 _send_file 改成 206
        except FileNotFoundError:
            self._not_found(path); return

    def do_HEAD(self):
        # [关键修复] agent-tool-host 做健康检查会发 HEAD，之前返回 501 → 判定服务死 → 显示"服务未运行"
        raw = self.path.split("?",1)[0]
        path = urllib.parse.unquote(raw)
        if path in ("/", ""):
            target = "/" + urllib.parse.quote("知命V2.html", safe="")
            self.send_response(302)
            self.send_header("Location", target)
            self.send_header("Content-Length", "0")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return
        abs_path = os.path.normpath(os.path.join(ROOT, path.lstrip("/")))
        if not (abs_path.startswith(ROOT + os.sep) or abs_path == ROOT):
            self.send_response(403); self.send_header("Content-Length","0"); self.end_headers(); return
        if os.path.isdir(abs_path):
            idx = os.path.join(abs_path, "index.html")
            abs_path = idx if os.path.isfile(idx) else abs_path
        if not os.path.isfile(abs_path):
            self.send_response(404); self.send_header("Content-Length","0"); self.end_headers(); return
        fs = os.path.getsize(abs_path)
        mime = guess_mime(abs_path)
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(fs))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-cache, max-age=60")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

    def _send_dir_list(self, abs_path, display):
        items = []
        try:
            for name in sorted(os.listdir(abs_path), key=lambda s: s.lower()):
                full = os.path.join(abs_path, name)
                isdir = os.path.isdir(full)
                sz = "" if isdir else f"{os.path.getsize(full)}B"
                href = urllib.parse.quote(name) + ("/" if isdir else "")
                items.append((isdir, name, href, sz))
        except PermissionError:
            pass
        body = ("<html><head><meta charset='utf-8'><title>Index of "
                + html.escape(display) + "</title></head><body>"
                + "<h1>Index of " + html.escape(display) + "</h1><hr><pre>")
        for isdir, name, href, sz in items:
            body += f'<a href="{href}">{html.escape(name)}{"/" if isdir else ""}</a>{" "*(max(2,60-len(name)))} {sz}\n'
        body += "</pre><hr></body></html>"
        b = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type","text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control","no-store")
        self.end_headers()
        self.wfile.write(b)

def write_pid():
    try:
        with open(PID_FILE, "w", encoding="utf-8") as f:
            f.write(str(os.getpid()))
        os.chmod(PID_FILE, 0o644)
    except Exception as e:
        log(f"WARN 写PID失败: {e}")

def main():
    # 避免地址复用 TIME_WAIT
    ThreadingHTTPServer.daemon_threads = True
    class Srv(ThreadingHTTPServer):
        allow_reuse_address = True
    try:
        httpd = Srv((BIND, PORT), Handler)
    except OSError as e:
        log(f"FATAL 端口{PORT}绑定失败: {e}")
        sys.exit(3)
    write_pid()
    log(f"START 知命V2服务 PID={os.getpid()} 监听 {BIND}:{PORT} 根目录={ROOT}")
    try:
        httpd.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        pass
    finally:
        try:
            httpd.server_close()
            if os.path.exists(PID_FILE):
                os.remove(PID_FILE)
        except Exception:
            pass
        log("STOP 服务已退出")

if __name__ == "__main__":
    main()
