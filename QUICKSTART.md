# Quick Start - External Authorization Testing

## ⚡ Three Simple Steps

### 1️⃣ Start the Authorization Server

Open Terminal 1:
```bash
cd server
npm install
npm start
```

Wait for:
```
🚀 Server listening on 9000
```

### 2️⃣ Start the Agent Gateway

Open Terminal 2:
```bash
./agentgateway.exe
```

### 3️⃣ Run the Tests

Open Terminal 3:
```bash
cd mcp
npm install
npm test
```

## ✅ Success Indicators

- All 5 tests should pass
- Authorization server shows request logs
- Responses include `x-authz-result: approved` header

## 📖 Full Documentation

See `TESTING_GUIDE.md` for complete details and troubleshooting.
