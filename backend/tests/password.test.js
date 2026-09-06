const { hashPassword, verifyPassword } = require('../src/utils/password');

describe('Password Utility Functions', () => {
  test('hashPassword should hash a plain-text password', async () => {
    const plainPassword = 'SecurePass123!';
    const hash = await hashPassword(plainPassword);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe(plainPassword); // Ensure the hash is not the same as the plain password
  });

  test('verifyPassword should return true for matching password and hash', async () => {
    const plainPassword = 'SecurePass123!';
    const hash = await hashPassword(plainPassword);

    const isMatch = await verifyPassword(plainPassword, hash);
    expect(isMatch).toBe(true);
  });

  test('verifyPassword should return false for non-matching password and hash', async () => {
    const plainPassword = 'SecurePass123!';
    const wrongPassword = 'WrongPass123!';
    const hash = await hashPassword(plainPassword);

    const isMatch = await verifyPassword(wrongPassword, hash);
    expect(isMatch).toBe(false);
  });
   });