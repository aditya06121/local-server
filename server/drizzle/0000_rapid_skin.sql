CREATE TABLE "Session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"tokenId" text NOT NULL,
	"refreshToken" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"phone" text,
	"bio" text,
	"location" text
);
--> statement-breakpoint
CREATE TABLE "FriendRequest" (
	"id" text PRIMARY KEY NOT NULL,
	"fromUserId" text NOT NULL,
	"toUserId" text NOT NULL,
	"status" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Friend" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"friendId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_fromUserId_User_id_fk" FOREIGN KEY ("fromUserId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_toUserId_User_id_fk" FOREIGN KEY ("toUserId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_friendId_User_id_fk" FOREIGN KEY ("friendId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "Session_tokenId_key" ON "Session" USING btree ("tokenId");--> statement-breakpoint
CREATE INDEX "Session_userId_idx" ON "Session" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "FriendRequest_unique_unordered_pair" ON "FriendRequest" USING btree (least("fromUserId", "toUserId"),greatest("fromUserId", "toUserId"));--> statement-breakpoint
CREATE INDEX "FriendRequest_toUserId_status_idx" ON "FriendRequest" USING btree ("toUserId","status");--> statement-breakpoint
CREATE INDEX "FriendRequest_fromUserId_status_idx" ON "FriendRequest" USING btree ("fromUserId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "Friend_unique_pair" ON "Friend" USING btree ("userId","friendId");