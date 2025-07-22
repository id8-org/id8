from app.db import SessionLocal
from app.models import Repo

session = SessionLocal()

repos = session.query(Repo).all()

print(f"Found {len(repos)} repos in the database:\n")
for repo in repos:
    print(f"- {repo.name} [{repo.language}] - {repo.url}")

session.close() 