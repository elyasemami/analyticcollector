#!/usr/bin/env python3
import os, sys, json, secrets, time, pathlib, urllib.parse, html

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

def save_session(data, sid=None):
    sid = sid or secrets.token_urlsafe(24)
    p = os.path.join(SESS_DIR, f"{sid}.json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump({"created": int(time.time()), "data": data}, f)
    return sid

method = os.environ.get("REQUEST_METHOD","GET").upper()
name = ""

if method == "POST" and os.environ.get("CONTENT_TYPE","").startswith("application/x-www-form-urlencoded"):
    body = read_body().decode("utf-8", errors="replace")
    form = parse_urlencoded(body)
    name = (form.get("name") or [""])[0]
    sid = save_session({"name": name}, sid=get_sid())
    print("Set-Cookie: SID={}; Path=/; HttpOnly; Secure; SameSite=Lax".format(sid))
    print("Content-Type: text/html; charset=utf-8")
    print()
    print(f"""<!doctype html>
<html><body style="font-family:system-ui">
  <h1>State Demo — Page 1</h1>
  <p>Saved name in server session as: <b>{html.escape(name)}</b></p>
  <ul>
    <li><a href="/cgi-bin/python/state-demo-2.py">Go to Page 2 (cookie)</a></li>
    <li><a href="/cgi-bin/python/state-demo-2.py?sid={sid}">Go to Page 2 (dirty URL)</a></li>
  </ul>
  <form action="/cgi-bin/python/state-demo-2.py" method="post">
    <input type="hidden" name="sid" value="{sid}">
    <button type="submit">Go to Page 2 (hidden field)</button>
  </form>
</body></html>""")
else:
    current = load_session(get_sid())
    current_name = current["data"].get("name") if current else ""
    print("Content-Type: text/html; charset=utf-8")
    print()
    print(f"""<!doctype html>
<html><body style="font-family:system-ui">
  <h1>State Demo — Page 1</h1>
  <form method="post" action="/cgi-bin/python/state-demo-1.py">
    <label>Name: <input name="name" value="{html.escape(current_name or '')}" required></label>
    <button type="submit">Save</button>
  </form>
</body></html>""")

