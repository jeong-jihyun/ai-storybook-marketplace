// Vercel 서버리스 함수: /api/* 요청을 NestJS 앱으로 넘긴다. (빌드 결과 apps/api/dist 사용)
module.exports = require('../apps/api/dist/serverless.js').default;
