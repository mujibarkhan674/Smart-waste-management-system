CREATE TYPE "public"."bin_status" AS ENUM('active', 'monitoring', 'almost_full', 'needs_collection', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."distance_method" AS ENUM('straight_line', 'road');--> statement-breakpoint
CREATE TYPE "public"."route_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."waste_type" AS ENUM('organic', 'recyclable', 'hazardous', 'general', 'electronic');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bins" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "waste_type" NOT NULL,
	"address" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"fill_level" integer DEFAULT 0 NOT NULL,
	"capacity_liters" integer DEFAULT 240 NOT NULL,
	"status" "bin_status" DEFAULT 'active' NOT NULL,
	"last_collected" timestamp with time zone,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bins_fill_level_check" CHECK ("bins"."fill_level" between 0 and 100),
	CONSTRAINT "bins_latitude_check" CHECK ("bins"."latitude" between -90 and 90),
	CONSTRAINT "bins_longitude_check" CHECK ("bins"."longitude" between -180 and 180),
	CONSTRAINT "bins_capacity_check" CHECK ("bins"."capacity_liters" > 0)
);
--> statement-breakpoint
CREATE TABLE "classifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"waste_type" "waste_type" NOT NULL,
	"confidence" double precision NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"scores" jsonb,
	"matched_label" text,
	"image_name" text,
	"image_mime_type" text,
	"image_size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classifications_confidence_check" CHECK ("classifications"."confidence" between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE "collection_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"bin_id" integer,
	"bin_name" text NOT NULL,
	"bin_type" "waste_type" NOT NULL,
	"route_id" integer,
	"collected_by" text,
	"fill_level_before" integer NOT NULL,
	"estimated_volume_liters" double precision NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "history_fill_check" CHECK ("collection_history"."fill_level_before" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "collection_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" "route_status" DEFAULT 'pending' NOT NULL,
	"straight_line_distance_km" double precision NOT NULL,
	"road_distance_km" double precision,
	"distance_method" "distance_method" DEFAULT 'straight_line' NOT NULL,
	"estimated_time_minutes" integer NOT NULL,
	"fill_threshold" integer,
	"start_latitude" double precision,
	"start_longitude" double precision,
	"assigned_to" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "routes_distance_check" CHECK ("collection_routes"."straight_line_distance_km" >= 0),
	CONSTRAINT "routes_time_check" CHECK ("collection_routes"."estimated_time_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "route_stops" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"bin_id" integer,
	"bin_name" text NOT NULL,
	"sequence" integer NOT NULL,
	"leg_distance_km" double precision DEFAULT 0 NOT NULL,
	"fill_level_at_planning" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_role_check" CHECK ("user"."role" in ('admin', 'staff', 'user'))
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classifications" ADD CONSTRAINT "classifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_history" ADD CONSTRAINT "collection_history_bin_id_bins_id_fk" FOREIGN KEY ("bin_id") REFERENCES "public"."bins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_history" ADD CONSTRAINT "collection_history_route_id_collection_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."collection_routes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_history" ADD CONSTRAINT "collection_history_collected_by_user_id_fk" FOREIGN KEY ("collected_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_routes" ADD CONSTRAINT "collection_routes_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_routes" ADD CONSTRAINT "collection_routes_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_collection_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."collection_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_bin_id_bins_id_fk" FOREIGN KEY ("bin_id") REFERENCES "public"."bins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "bins_type_idx" ON "bins" USING btree ("type");--> statement-breakpoint
CREATE INDEX "bins_status_idx" ON "bins" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bins_fill_level_idx" ON "bins" USING btree ("fill_level");--> statement-breakpoint
CREATE INDEX "classifications_created_at_idx" ON "classifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "classifications_user_id_idx" ON "classifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "classifications_waste_type_idx" ON "classifications" USING btree ("waste_type");--> statement-breakpoint
CREATE INDEX "history_collected_at_idx" ON "collection_history" USING btree ("collected_at");--> statement-breakpoint
CREATE INDEX "history_bin_id_idx" ON "collection_history" USING btree ("bin_id");--> statement-breakpoint
CREATE INDEX "history_route_id_idx" ON "collection_history" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "routes_status_idx" ON "collection_routes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "routes_assigned_to_idx" ON "collection_routes" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "routes_created_at_idx" ON "collection_routes" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "route_stops_route_sequence_idx" ON "route_stops" USING btree ("route_id","sequence");--> statement-breakpoint
CREATE INDEX "route_stops_bin_id_idx" ON "route_stops" USING btree ("bin_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");