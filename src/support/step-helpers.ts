// Helpers shared by step files of more than one portal (no step definitions here).
import { randomBytes } from 'node:crypto';
import { expect } from './bdd-expect';
import type { RegressionWorld } from './world';
import { account } from '../testdata';
import { LoginPage } from '../pages';

const HTTP_OK = 200;

/** Signs the role in through the portal's sign-in form; fails the scenario unless the sign-in answers 200. */
export async function signInWith(world: RegressionWorld, portal: 'admin' | 'member' | 'vendor', role: string, rememberMe: boolean) {
  const status = await new LoginPage(world.f, portal).signInAs(account(role), { rememberMe });
  expect(status, `sign-in precondition for ${role}`).toBe(HTTP_OK);
}

/** A throwaway value for a refused activation form; it never becomes anyone's password (every submit answers 422). */
export const throwawayPassword = () => `Qa-${randomBytes(6).toString('hex')}`;
