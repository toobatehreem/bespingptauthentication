import { getOrCreateDatabase, getOrCreateContainer } from "./cosmosClient";
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const DATABASE_ID = "UserDatabase";
const CONTAINER_ID = "Users";

async function signup(username: string, password: string) {
  const database = await getOrCreateDatabase(DATABASE_ID);
  const container = await getOrCreateContainer(database, CONTAINER_ID);

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), username, password: hashedPassword };

  await container.items.create(user);
  return user;
}

async function login(username: string, password: string) {
  const database = await getOrCreateDatabase(DATABASE_ID);
  const container = await getOrCreateContainer(database, CONTAINER_ID);

  const { resources: users } = await container.items
    .query({ query: "SELECT * FROM c WHERE c.username = @username", parameters: [{ name: "@username", value: username }] })
    .fetchAll();

  if (users.length > 0) {
    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (validPassword) {
      return user;
    }
  }

  throw new Error("Invalid username or password");
}

export { signup, login };
