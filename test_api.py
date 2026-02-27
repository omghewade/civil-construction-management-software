import requests
import json

session = requests.Session()
login_res = session.post("http://localhost:8080/api/auth/login", json={"username":"admin", "password":"password"})
print(f"Login Status: {login_res.status_code}")

# The user's password must be 'admin' from earlier, wait, the dummy seeder uses Hashed passwords but didn't actually create users?
# Ah! The dummy data script in /seed DID NOT insert users, it just used existing users. We reset users earlier with /reset. So password is 'admin'.
login_res = session.post("http://localhost:8080/api/auth/login", json={"username":"admin", "password":"admin"})
print(f"Login Status: {login_res.status_code}")

proj_res = session.get("http://localhost:8080/api/projects")
print(f"Projects Status: {proj_res.status_code}")
if proj_res.status_code == 200:
    print(json.dumps(proj_res.json(), indent=2)[:500])
else:
    print(proj_res.text[:500])
