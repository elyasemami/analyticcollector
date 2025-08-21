#!/usr/bin/env python3

import os, sys, urllib.parse, html

print("Content-Type: text/html; charset=utf-8")
print()

length = int(os.environ.get("CONTENT_LENGTH") or 0)
body = sys.stdin.read(length)
data = urllib.parse.parse_qs(body)
note = data.get("note", [""])[0]

print(f"""<!doctype html>
<html><body>
  <h1>Posted</h1>
  <p>{html.escape(note)}</p>
</body></html>""")


