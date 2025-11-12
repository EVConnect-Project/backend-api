# EVConnect CI/CD Workflows

GitHub Actions workflows for automated testing and deployment of the EVConnect platform.

## 📋 Available Workflows

### 1. Flutter CI (`flutter-ci.yml`)
Automated testing and building for the Flutter mobile app.

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Changes in `mobile-app/evconnect_app/**`

**Steps:**
- ✅ Checkout repository
- ✅ Setup Flutter (v3.24.5)
- ✅ Install dependencies (`flutter pub get`)
- ✅ Run static analysis (`flutter analyze`)
- ✅ Run unit tests (`flutter test --coverage`)
- ✅ Check code formatting (`dart format`)
- ✅ Build APK (Android)
- ✅ Build Web
- ✅ Upload coverage to Codecov
- ✅ Archive build artifacts

**Artifacts:**
- APK build outputs
- Web build outputs
- Test coverage reports

---

### 2. Node.js CI (`node-ci.yml`)
Automated testing for the NestJS backend API.

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Changes in `backend-api/evconnect_backend/**`

**Matrix Strategy:**
- Node.js versions: 18.x, 20.x

**Services:**
- PostgreSQL 15 (test database)

**Steps:**
- ✅ Checkout repository
- ✅ Setup Node.js with caching
- ✅ Install dependencies (`npm ci`)
- ✅ Run ESLint (`npm run lint`)
- ✅ Run TypeScript check
- ✅ Run unit tests (`npm run test`)
- ✅ Run e2e tests (`npm run test:e2e`)
- ✅ Generate coverage report (`npm run test:cov`)
- ✅ Build application (`npm run build`)
- ✅ Upload coverage to Codecov
- ✅ Archive build artifacts

**Environment Variables:**
```
DATABASE_HOST: localhost
DATABASE_PORT: 5432
DATABASE_USER: testuser
DATABASE_PASSWORD: testpass
DATABASE_NAME: evconnect_test
JWT_SECRET: test-secret-key
JWT_REFRESH_SECRET: test-refresh-secret-key
```

---

### 3. Python AI Services CI (`python-ci.yml`)
Automated testing for the FastAPI ML service.

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Changes in `ai-services/**`

**Matrix Strategy:**
- Python versions: 3.10, 3.11, 3.12

**Steps:**
- ✅ Checkout repository
- ✅ Setup Python with pip caching
- ✅ Install dependencies
- ✅ Run Black formatter check
- ✅ Run Flake8 linter
- ✅ Run mypy type checking
- ✅ Train ML model
- ✅ Run pytest with coverage
- ✅ Test server startup
- ✅ Upload coverage to Codecov
- ✅ Archive trained models

**Quality Tools:**
- Black (code formatting)
- Flake8 (linting)
- mypy (type checking)
- pytest (testing)

---

### 4. Full CI/CD Pipeline (`full-ci.yml`)
Comprehensive pipeline that runs all CI checks in parallel.

**Triggers:**
- Push to `main` branch
- Pull requests to `main`

**Jobs:**
1. **flutter-ci**: Quick Flutter checks
2. **node-ci**: Quick Node.js checks (with PostgreSQL)
3. **python-ci**: Quick Python checks
4. **ci-success**: Final status check (requires all jobs to pass)

**Advantages:**
- Parallel execution for faster feedback
- Single status badge for all checks
- Required status check for PR merges

---

## 🚀 Setup Instructions

### 1. Enable GitHub Actions
GitHub Actions are enabled by default for all repositories. These workflows will run automatically on push/PR.

### 2. Add Secrets (Optional)
For deployment and external services:

Go to: `Repository Settings → Secrets and variables → Actions`

Add these secrets:
```
CODECOV_TOKEN          # For coverage uploads
DOCKER_USERNAME        # For Docker Hub
DOCKER_PASSWORD        # For Docker Hub
AWS_ACCESS_KEY_ID      # For AWS deployment
AWS_SECRET_ACCESS_KEY  # For AWS deployment
```

### 3. Branch Protection Rules
Recommended settings for `main` branch:

```
Settings → Branches → Add rule
- Branch name pattern: main
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Select: "All CI Checks Passed" (from full-ci.yml)
- ✅ Require branches to be up to date before merging
- ✅ Require linear history
```

---

## 📊 Status Badges

Add these to your main README.md:

```markdown
![Flutter CI](https://github.com/EVConnect-Project/backend-api/workflows/Flutter%20CI/badge.svg)
![Node.js CI](https://github.com/EVConnect-Project/backend-api/workflows/Node.js%20CI/badge.svg)
![Python AI CI](https://github.com/EVConnect-Project/backend-api/workflows/Python%20AI%20Services%20CI/badge.svg)
![Full CI/CD](https://github.com/EVConnect-Project/backend-api/workflows/EVConnect%20Full%20CI%2FCD/badge.svg)
```

---

## 🔧 Local Testing

Test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act

# Run Flutter CI
act -W .github/workflows/flutter-ci.yml

# Run Node.js CI
act -W .github/workflows/node-ci.yml

# Run Python CI
act -W .github/workflows/python-ci.yml

# Run full pipeline
act -W .github/workflows/full-ci.yml
```

---

## 📈 Coverage Reports

Coverage reports are uploaded to Codecov automatically.

**Setup Codecov:**
1. Go to https://codecov.io
2. Connect your GitHub repository
3. Copy the `CODECOV_TOKEN`
4. Add it to GitHub Secrets

**Coverage Flags:**
- `flutter`: Flutter app coverage
- `nestjs`: Backend API coverage
- `python`: AI services coverage

---

## 🐛 Troubleshooting

### Workflow fails on dependencies
```bash
# Update package-lock.json / pubspec.lock
cd backend-api/evconnect_backend && npm install
cd mobile-app/evconnect_app && flutter pub get
```

### PostgreSQL connection issues
Check that the service is properly configured in the workflow:
```yaml
services:
  postgres:
    image: postgres:15
    options: --health-cmd pg_isready
```

### Python package conflicts
```bash
# Update requirements.txt with exact versions
pip freeze > requirements.txt
```

### Flutter version mismatch
Update the Flutter version in workflow:
```yaml
uses: subosito/flutter-action@v2
with:
  flutter-version: '3.24.5'  # Update this
```

---

## 📝 Workflow Customization

### Add new test stage
```yaml
- name: Custom Test
  run: npm run custom-test
  working-directory: backend-api/evconnect_backend
```

### Add deployment
```yaml
- name: Deploy to Production
  if: github.ref == 'refs/heads/main'
  run: ./deploy.sh
  env:
    API_KEY: ${{ secrets.API_KEY }}
```

### Add Slack notifications
```yaml
- name: Slack Notification
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'CI Build completed'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
  if: always()
```

---

## 🎯 Best Practices

1. **Keep workflows fast** - Use caching for dependencies
2. **Fail fast** - Run quick checks first (lint before tests)
3. **Parallel jobs** - Run independent checks in parallel
4. **Matrix testing** - Test multiple versions (Node 18/20, Python 3.10/3.11/3.12)
5. **Artifact retention** - Keep artifacts for 7 days (configurable)
6. **Coverage tracking** - Upload coverage on every run
7. **Status checks** - Require CI to pass before merge

---

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Flutter CI/CD](https://docs.flutter.dev/deployment/cd)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Codecov](https://docs.codecov.io/docs)

---

## 🔄 Continuous Deployment (Coming Soon)

Future enhancements:
- Deploy backend to AWS ECS
- Deploy Flutter web to Firebase Hosting
- Deploy AI service to AWS Lambda
- Automated database migrations
- Staging environment deployment
- Production deployment with approval
