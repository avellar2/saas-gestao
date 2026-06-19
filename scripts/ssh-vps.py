#!/usr/bin/env python3
# Helper SSH para o VPS do avgestao.
# Le as credenciais do .env (senha nunca eh impressa no chat).
# Uso: py scripts/ssh-vps.py "<comando remoto>"
import os, sys, re, paramiko
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ENV = r"C:\projetos\saas-gestão\.env"

def load_env(path):
    d = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            d[k.strip()] = v.strip().strip('"').strip("'")
    return d

def main():
    if len(sys.argv) < 2:
        print("ERR: passe o comando como argumento", file=sys.stderr)
        sys.exit(2)
    cmd = sys.argv[1]
    e = load_env(ENV)
    host = e["VPS_SERVER"]; user = e["VPS_USER"]; port = int(e["VPS_PORT"]); pwd = e["VPS_PASSWORD"]

    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        cli.connect(host, port=port, username=user, password=pwd, timeout=15, allow_agent=False, look_for_keys=False)
    except Exception as ex:
        print(f"ERR conectando: {ex}", file=sys.stderr)
        sys.exit(3)

    stdin, stdout, stderr = cli.exec_command(cmd, timeout=180)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    rc = stdout.channel.recv_exit_status()
    if out:
        sys.stdout.write(out)
    if err:
        sys.stderr.write(err)
    cli.close()
    sys.exit(rc)

if __name__ == "__main__":
    main()