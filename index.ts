import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { CosmosClient } from '@azure/cosmos';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET as string;

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve static files from the 'public' directory (if needed)
app.use(express.static(__dirname));

// Cosmos DB setup
const endpoint = process.env.COSMOS_ENDPOINT as string;
const key = process.env.COSMOS_KEY as string;

if (!endpoint || !key) {
  console.error("Cosmos DB endpoint or key not provided.");
  process.exit(1); // Exit the process if environment variables are missing
}

const client = new CosmosClient({ endpoint, key });

console.log(`Connecting to Cosmos DB at ${endpoint}`);

const databaseId = 'UserDatabase';
const containerId = 'Users';

// Initialize Cosmos DB
async function initCosmosDb() {
  const { database } = await client.databases.createIfNotExists({ id: databaseId });
  const { container } = await database.containers.createIfNotExists({ id: containerId });
  return container;
}

const containerPromise = initCosmosDb();

// Signup endpoint
app.post('/signup', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  try {
    const container = await containerPromise;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: username,
      username,
      password: hashedPassword
    };

    await container.items.create(user);
    res.status(201).send('User created');
  } catch (error: any) {
    console.error('Error creating user:', error.message);
    res.status(500).send('Internal server error');
  }
});

app.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
      return res.status(400).send('Username and password are required');
  }

  try {
      const container = await containerPromise;
      const querySpec = {
          query: 'SELECT * FROM c WHERE c.id = @username',
          parameters: [
              { name: '@username', value: username }
          ]
      };

      const { resources: users } = await container.items.query(querySpec).fetchAll();

      if (!users || users.length === 0) {
          return res.status(404).json({ message: 'User not found' });
      }

      const user = users[0];
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
          const token = jwt.sign({ username: user.username }, jwtSecret, { expiresIn: '1h' });
          return res.status(200).json({ 
              message: 'Login successful', 
              token, 
              redirectUrl: 'https://bespingpt-container.yellowmoss-954737c0.australiaeast.azurecontainerapps.io/' 
          });
      } else {
          return res.status(401).send('Invalid username or password');
      }
  } catch (error: any) {
      console.error('Error logging in user:', error.message);
      return res.status(500).send('Internal server error');
  }
});


// app.post('/login', async (req: Request, res: Response) => {
//     const { username, password } = req.body;
  
//     console.log('Login request received for username:', username);
  
//     if (!username || !password) {
//       return res.status(400).send('Username and password are required');
//     }
  
//     try {
//       const container = await containerPromise;
      
//       // Construct the query with SQL API to retrieve user by id
//       const querySpec = {
//         query: 'SELECT * FROM c WHERE c.id = @username',
//         parameters: [
//           { name: '@username', value: username }
//         ]
//       };
  
//       const { resources: users } = await container.items
//         .query(querySpec)
//         .fetchAll();
  
//       if (!users || users.length === 0) {
//         console.log('User not found:', username);
//         return res.status(404).json({ message: 'User not found' });
//       }
  
//       // Assuming username is unique, we expect only one user in the array
//       const user = users[0];
      
//       const passwordMatch = await bcrypt.compare(password, user.password);
  
//       if (passwordMatch) {
//         const token = jwt.sign({ username: user.username }, jwtSecret, { expiresIn: '1h' });
//         console.log('Login successful for username:', username);
//         return res.status(200).json({ message: 'Login successful', token });
//       } else {
//         console.log('Invalid password for username:', username);
//         return res.status(401).send('Invalid username or password');
//       }
//     } catch (error: any) {
//       console.error('Error logging in user:', error.message);
//       return res.status(500).send('Internal server error');
//     }
//   });
  
  

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
