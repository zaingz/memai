import { randomUUID } from "crypto";
import { UserRepository } from "../../users/repositories/user.repository";
import { User } from "../../users/types";
import { db } from "../../users/db";

export class UserBuilder {
  private id: string = randomUUID();
  private email: string = `test-${randomUUID().slice(0, 8)}@example.com`;
  private name: string | null = "Test User";
  private createdViaWebhook: boolean = false;

  private userRepo = new UserRepository(db);

  withId(id: string): UserBuilder {
    this.id = id;
    return this;
  }

  withEmail(email: string): UserBuilder {
    this.email = email;
    return this;
  }

  withName(name: string): UserBuilder {
    this.name = name;
    return this;
  }

  withoutName(): UserBuilder {
    this.name = null;
    return this;
  }

  viaWebhook(): UserBuilder {
    this.createdViaWebhook = true;
    return this;
  }

  async build(): Promise<User> {
    if (this.createdViaWebhook) {
      const { userCreated } = await import("../../users/webhooks");
      const { createCustomAccessTokenHookPayload } = await import("../../test/utils/test-data.factory");

      await userCreated(
        createCustomAccessTokenHookPayload({
          id: this.id,
          email: this.email,
          user_metadata: { name: this.name || undefined },
        })
      );
    } else {
      await this.userRepo.create({
        id: this.id,
        email: this.email,
        name: this.name,
      });
    }

    const user = await this.userRepo.findById(this.id, this.id);
    return user!;
  }
}
