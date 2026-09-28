import { beforeEach, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

beforeEach(resetDatabase);

it("talks to the throwaway test database", async () => {
  await makeMember();
  expect(await prisma.user.count()).toBe(1);
});
