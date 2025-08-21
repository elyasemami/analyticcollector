#!/usr/bin/env python3
import os, sys, json, urllib.parse, html, pathlib

SESS_DIR = "/tmp/pycgi_sessions"
pathlib.Path(SESS_DIR).mkdir(parents=True, exist_ok=True)

def read_body():
    length = int(os.environ.get("CONTENT_LENGTH") or 0)
    return sys.stdin.buffer.read(length) if length > 0 else b""

def parse_urlencoded(s):
    return {k: v for k, v in urllib.parse.parse_qs(s, keep_blank_values=True).items()}

def get_sid():
    cookie = os.environ.get("HTTP_COOKIE", "")
    sid = None
    for part in cookie.split(";"):
        k, _, v = part.strip().partition("=")
        if k == "SID":
            sid = v.strip()
            break
    if not sid:
        qs = os.environ.get("QUERY_STRING","")
        sid = urllib.parse.parse_qs(qs).get("sid", [None])[0]
    if not sid and os.environ.get("REQUEST_METHOD") == "POST":
        body = read_body().decode("utf-8", errors="replace")
        sid = parse_urlencoded(body).get("sid", [None])[0]
    return sid

def load_session(sid):
    if not sid: return None
    if not sid.replace("-", "").replace("_", "").isalnum():
        return None
    p = os.path.join(SESS_DIR, f"{sid}.json")
    if not os.path.exists(p): return None
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None

sid = get_sid()
sess = load_session(sid)
name = (sess or {}).get("data", {}).get("name", "")

print("Content-Type: text/html; charset=utf-8")
print()
print(f"""<!doctype html>
<html><body style="font-family:system-ui">
  <h1>State Demo — Page 2</h1>
  {"<p><b>Name from session:</b> " + html.escape(name) + "</p>" if name else "<p>No session found.</p>"}
  <p><a href="/cgi-bin/python/state-demo-1.py">Back to Page 1</a></p>
</body></html>""")

