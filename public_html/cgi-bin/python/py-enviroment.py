#!/usr/bin/env python3
import os, html

print("Content-Type: text/html; charset=utf-8")
print()  

print("""<!doctype html>
<html><head><meta charset="utf-8"><title>Environment</title>
</head>""")

print("<h1>Environment Variables</h1>")
print("<pre>")
for k in sorted(os.environ):
    v = os.environ[k]
    print(f"{html.escape(k)}={html.escape(v)}")
print("</pre>")

print("</body></html>")

