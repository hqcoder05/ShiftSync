import urllib.request
import urllib.error
import json

def api_call(method, url, token, data=None):
    headers = {"Authorization": f"Bearer {token}"}
    req = urllib.request.Request(url, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return resp.getcode(), resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')

token = json.loads(urllib.request.urlopen(urllib.request.Request('http://localhost:8080/api/auth/login', json.dumps({'email': 'manager1@example.com', 'password': 'password'}).encode(), {'Content-Type': 'application/json'})).read().decode())["accessToken"]
c, r = api_call("GET", "http://localhost:8080/api/stores", token)
print(c, r)
