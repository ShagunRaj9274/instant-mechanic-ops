import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { users } from '../../db/schema';
import { ApiError } from '../../lib/api-error';
import { verifyPassword } from '../../lib/password';
import { signToken, type AuthUser } from '../../middleware/auth';

export const loginBody = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export async function login(input: z.infer<typeof loginBody>) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email.toLowerCase()))
    .limit(1);

  // Same message either way: never reveal which half of the pair was wrong.
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw ApiError.unauthorized('That email and password do not match');
  }

  const profile: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return { token: signToken(profile), user: profile };
}
