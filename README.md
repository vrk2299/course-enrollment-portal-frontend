# Course Enrollment Portal — Frontend

Frontend for the Course Enrollment Portal capstone project.

## Components

- Student enrollment website
- Admin login and admissions dashboard
- HTML, CSS and JavaScript assets
- Nginx configuration and API reverse proxy
- Automated frontend server setup

## Architecture

Browser -> Nginx -> Flask API -> MySQL on Amazon RDS

Nginx serves the website and proxies `/api/` requests to the backend
EC2 private address on port 8000.

## Deploy on Ubuntu

Clone this repository onto the frontend server, enter the project
directory, and run:

```bash
sudo bash scripts/setup.sh
```

The script asks for the backend EC2 private IP. The default is
`172.31.5.147`.

The backend security group must allow TCP port 8000 from the frontend
EC2 security group. The RDS database should not be publicly accessible.

## Important

- Never commit passwords, session keys, database credentials or private keys.
- Admin credentials belong in the backend's protected environment file.
- Use HTTPS and strong credentials before production use.
- Review the Nginx configuration before deploying to a different server.
