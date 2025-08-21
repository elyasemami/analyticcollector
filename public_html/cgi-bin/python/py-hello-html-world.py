#!/usr/bin/env python3
# /var/www/your-site/public_html/cgi-bin/python/python-hello-html-world.py

import os
import datetime
import html
import sys
import traceback

print("Content-Type: text/html; charset=utf-8")
print()  

try:
    ip = os.environ.get("REMOTE_ADDR", "unknown")

    now = datetime.datetime.now()

    title = "Hello, Python!"
    print(f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>{html.escape(title)}</title>
  <style>
    body {{ font-family: verdana, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.5; margin: 2rem; }}
    h1 {{ text-align: center; font-size: 2.25rem; margin-bottom: 1rem; }}
    hr {{ margin: 1rem 0 2rem; }}
  </style>
</head>
<body>
  <h1>{html.escape(title)}!</h1>
  <hr>
  <p><strong>Hello, this is Elyas and I used Python and apache to make this available!!</strong></p>
  <p>Today's date is {now}</p>
  <p>Your IP Address: {html.escape(ip)}</p>
</body>
</html>""")

except Exception:
    print("<h1>CGI Error</h1><p>See server error log for details.</p>")
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)


