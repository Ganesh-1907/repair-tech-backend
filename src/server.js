import 'dotenv/config';
import { app } from './app.js';
import { connectDb } from './config/db.js';
import { seedDatabase } from './data/seed.js';

const port = process.env.PORT || 5000;

try {
  await connectDb();
  await seedDatabase();

  app.listen(port, () => {
    console.log(`Server is running on localhost port ${port}`);
  });
} catch (error) {
  console.error('Backend startup failed');
  console.error(error.message);
  console.error('Please confirm MongoDB is running and MONGODB_URI is correct in .env');
  process.exit(1);
}
