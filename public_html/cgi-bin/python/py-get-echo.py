#!/usr/bin/env python3
import os
import urllib.parse, html
print("Content-Type: text/html; charset=utf-8")
print()

qs = os.environ.get("QUERY_STRING", "")
params = urllib.parse.parse_qs(qs)

def first(d, key, default=""):
    return d.get(key, [default])[0]
name=first(params, "name","Stranger!")
print(f"""<!doctype html>
    <html>
      <head>
        <title>Echo-Get</title>
        </head>
      <body>
            <h1 align="center">Get-Echo</h1
            <hr>
            <h3>Hello, {html.escape(name)}, I hope you have a fun day!</h3>
            <p>try: ?name=somethingfun</p>
      </body>

    </html>""")
