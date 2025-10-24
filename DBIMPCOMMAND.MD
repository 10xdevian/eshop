dotenv -e .env -- npx prisma generate
npm run db:push
npm install -g dotenv-cli