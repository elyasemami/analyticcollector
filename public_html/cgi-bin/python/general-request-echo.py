#!/usr/bin/env python3
import os, sys, json, urllib.parse

def get_headers_from_env(env):
    out = {}
    for k, v in env.items():
        if k.startswith("HTTP_"):
            name = k[5:].replace("_", "-").title()
            out[name] = v
    for k in ("CONTENT_TYPE", "CONTENT_LENGTH"):
        if env.get(k):
            out[k.replace("_", "-").title()] = env[k]
    return out

def safe_int(s, default=0):
    try:
        return int(s)
    except Exception:
        return default

method = os.environ.get("REQUEST_METHOD", "GET").upper()
content_type = os.environ.get("CONTENT_TYPE", "")
content_length = safe_int(os.environ.get("CONTENT_LENGTH", "0"))
query_string = os.environ.get("QUERY_STRING", "")
path = os.environ.get("REQUEST_URI") or (os.environ.get("SCRIPT_NAME","") + (("?" + query_string) if query_string else ""))

raw_body = b""
if content_length > 0:
    raw_body = sys.stdin.buffer.read(content_length)

query = urllib.parse.parse_qs(query_string, keep_blank_values=True)

parsed_body = None
body_text = None
if raw_body:
    try:
        body_text = raw_body.decode("utf-8", errors="replace")
    except Exception:
        body_text = raw_body.decode("latin1", errors="replace")

    if content_type.startswith("application/x-www-form-urlencoded"):
        parsed_body = {k: v for k, v in urllib.parse.parse_qs(body_text, keep_blank_values=True).items()}
    elif content_type.startswith("application/json"):
        try:
            parsed_body = json.loads(body_text)
        except Exception:
            parsed_body = {"_error": "invalid JSON", "_raw": body_text[:8192]}
    else:
        parsed_body = None

result = {
    "method": method,
    "path": path,
    "client": {
        "ip": os.environ.get("REMOTE_ADDR"),
        "port": os.environ.get("REMOTE_PORT"),
        "user_agent": os.environ.get("HTTP_USER_AGENT"),
    },
    "server": {
        "software": os.environ.get("SERVER_SOFTWARE"),
        "name": os.environ.get("SERVER_NAME"),
        "addr": os.environ.get("SERVER_ADDR"),
        "port": os.environ.get("SERVER_PORT"),
    },
    "headers": get_headers_from_env(os.environ),
    "query": query,
    "content_type": content_type,
    "content_length": content_length,
    "body_parsed": parsed_body,
}

if raw_body and parsed_body is None:
    result["body_raw_preview"] = body_text[:8192]

if method == "HEAD":
    print("Content-Type: application/json; charset=utf-8")
    print()
    raise SystemExit(0)

print("Content-Type: application/json; charset=utf-8")
print()
print(json.dumps(result, ensure_ascii=False, indent=2))

