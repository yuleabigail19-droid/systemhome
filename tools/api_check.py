import json
import urllib.request


def req(method, path, data=None, token=None):
    url = 'http://127.0.0.1:3000' + path
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data_bytes = None
    if data is not None:
        data_bytes = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body = r.read().decode('utf-8')
            print(path, r.status)
            print(body)
            return body
    except Exception as e:
        print(path, 'ERROR', e)
        return None


if __name__ == '__main__':
    print('=== HEALTH ===')
    req('GET', '/api/health')
    print('\n=== LOGIN admin ===')
    login_body = req('POST', '/api/auth/login', {'username': 'admin', 'password': 'admin123'})
    token = None
    try:
        token = json.loads(login_body).get('token') if login_body else None
    except Exception:
        token = None
    print('token present:', bool(token))
    if token:
        print('\n=== INVENTORY (with token) ===')
        req('GET', '/api/inventory', None, token)
