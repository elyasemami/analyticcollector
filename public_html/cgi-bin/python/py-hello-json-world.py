#!/usr/bin/env python3
import json, datetime, os
print("Content-Type: application/json; charset=utf-8")
print()  # blank line

payload = {
    "message": "Hello, This is Elyas Emami testing Python, JSON output to the web!",
    "date": datetime.datetime.now().isoformat(),
    "currentIP": os.environ.get("REMOTE_ADDR", "unknown"),
}
print(json.dumps(payload))
