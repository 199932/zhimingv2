#!/usr/bin/env bash
# 知命V2 一键拉起脚本（30秒内保证端口8766可用，反复死也不怕）
# 用法:  bash /workspace/.zhiming_ensure_up.sh
# 退出码: 0=OK  1=失败
set -u
ROOT=/workspace
PIDF=$ROOT/.zhiming_server.pid
LOGF=$ROOT/.zhiming_server.log
PORT=8766
APP_FILE=$ROOT/知命V2.html

die(){ echo "❌ $*"; exit 1; }
info(){ echo "🔧 $*"; }
ok(){ echo "✅ $*"; }

# 1. 先检查是否已经活着 (双保险: PID文件 + 端口 + HTTP)
NEED_START=1
if [ -f "$PIDF" ]; then
  P=$(cat "$PIDF" 2>/dev/null || echo "")
  if [ -n "$P" ] && kill -0 "$P" 2>/dev/null; then
    # PID 活着 -> 再看端口
    LISTENING=$( (ss -tln 2>/dev/null; netstat -tln 2>/dev/null) | grep -cE ":${PORT}[[:space:]]" || echo 0)
    if [ "$LISTENING" -ge 1 ]; then
      HTTP_OK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${PORT}/知命V2.html" 2>/dev/null || echo 000)
      if [ "$HTTP_OK" = "200" ]; then
        ok "服务已在运行 PID=$P，无需重启"
        NEED_START=0
      fi
    fi
  fi
fi

if [ "$NEED_START" = "1" ]; then
  info "需要启动服务，先清理残留..."
  # 杀 PID 文件记录的进程
  if [ -f "$PIDF" ]; then
    P=$(cat "$PIDF" 2>/dev/null || echo "")
    [ -n "$P" ] && { kill "$P" 2>/dev/null; sleep 1; kill -9 "$P" 2>/dev/null || true; }
    rm -f "$PIDF"
  fi
  # 清端口上所有进程
  for P in $(ss -tlnp 2>/dev/null | awk '/:'${PORT}'/{print $0}' | grep -oE 'pid=[0-9]+' | cut -d= -f2); do
    info "强制清理端口残留 PID=$P"
    kill -9 "$P" 2>/dev/null || true
  done
  sleep 1

  [ -x "$ROOT/.zhiming_server.py" ] || chmod +x "$ROOT/.zhiming_server.py" 2>/dev/null
  info "setsid+nohup 启动守护服务..."
  cd "$ROOT"
  setsid nohup python3 "$ROOT/.zhiming_server.py" > "$LOGF" 2>&1 < /dev/null &
  sleep 3

  # 验证
  for i in 1 2 3 4 5; do
    [ -f "$PIDF" ] && break
    sleep 1
  done
  P=$(cat "$PIDF" 2>/dev/null || echo "")
  [ -n "$P" ] || die "启动后PID文件不存在，检查 $LOGF"
  kill -0 "$P" 2>/dev/null || die "PID=$P 未存活，检查 $LOGF"
  ok "服务已启动 PID=$P"
fi

# 2. 最终验收: 端口 + 体积匹配
EXP_SIZE=$(stat -c%s "$APP_FILE" 2>/dev/null || echo 0)
[ "$EXP_SIZE" -gt 0 ] || die "应用文件 $APP_FILE 不存在/空"
sleep 1
HTTP_OK=$(curl -s -o /tmp/zhiming_app_ensure.html -w "%{http_code}" --max-time 10 -H "Accept-Encoding: identity" "http://127.0.0.1:${PORT}/知命V2.html" 2>/dev/null || echo 000)
REAL_SIZE=$(stat -c%s /tmp/zhiming_app_ensure.html 2>/dev/null || echo 0)
[ "$HTTP_OK" = "200" ] || die "HTTP 验收失败 code=$HTTP_OK"
[ "$REAL_SIZE" = "$EXP_SIZE" ] || die "体积不符 实=$REAL_SIZE 期=$EXP_SIZE"
ok "HTTP=200 文件体积完全匹配 ($REAL_SIZE bytes == 期望 $EXP_SIZE)"
echo "🎉 知命V2 服务 OK → http://127.0.0.1:${PORT}/知命V2.html"
exit 0
