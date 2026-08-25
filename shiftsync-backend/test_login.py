import urllib.request
import json
url = 'http://localhost:8080/api/auth/login'
data = {'email': 'manager1@example.com', 'password': 'password'}
req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req)
print(resp.read().decode('utf-8'))
