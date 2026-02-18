---
title: "TypeScript and Kotlin Are the Safest Way to Talk to PostgreSQL. Where Does Your Language Land?"
author: "Davide Mendolia"
description: "Comparison of 6 database libraries across TypeScript, Python, Java, C#, Go, and Kotlin for PostgreSQL-backed REST APIs. Only one stack passes all three safety checks."
publishDate: 2026-02-18
tags:
  [
    "programming-languages",
    "backend-development",
    "typescript",
    "java",
    "python",
    "golang",
    "kotlin",
    "csharp",
    "postgresql",
    "orm",
    "database",
    "developer-productivity",
  ]
featured: true
draft: false
---

I have touched a lot of languages and I would say I have seen 2 major criticisms regarding access to SQL databases: I don't want magic, meaning I want to understand by reading the code what query will be run. And the other one: why am I writing so much code? Simple operations like CRUD should require almost no code.

So I implemented the same PostgreSQL-backed REST API in six languages: TypeScript, Python, Java, C#, Go, and Kotlin, to figure out how each was handling that.

## The Setup

The project is a lamp control API with CRUD operations on smart lamps, soft deletes, timestamps, and a deliberate mismatch between the database column `is_on` and the domain field `status`. Every implementation shares the same PostgreSQL schema, the same OpenAPI spec, and the same behavioral expectations. The only difference is the language and its idiomatic database tooling:

| Language   | ORM/Driver | Query Style     | Schema Definition            |
| ---------- | ---------- | --------------- | ---------------------------- |
| TypeScript | Prisma     | Implicit client | Dedicated DSL (.prisma file) |
| Python     | SQLAlchemy | Explicit ORM    | Mapped columns in code       |
| Java       | Hibernate  | Method names    | Annotations on entity class  |
| C#         | EF Core    | LINQ            | Fluent API in DbContext      |
| Go         | pgx + sqlc | Raw SQL         | SQL migration files only     |
| Kotlin     | Exposed    | Type-safe DSL   | Table object DSL             |

## Implicit vs. Explicit: Do You Know What Query Will Run?

Here's a simple question: given a line of database code, can you tell me what SQL it produces?

In **Go**, the answer is trivially yes. Because you wrote the SQL:

```sql
SELECT id, name, is_on, color, brightness FROM lamps WHERE id = $1 AND deleted_at IS NULL
```

In **Java**, the answer is... maybe? You write this:

```java
Optional<Lamp> findById(UUID id);
```

Spring Data JPA generates the query at boot time. You never see it unless you turn on logging. The SQL it generates is roughly equivalent to the Go example above (with `@Where(clause = "deleted_at IS NULL")` annotation).

For simple methods that's fine, but the further you push Spring Data's method-name conventions, the more you're trusting a naming contract you can't inspect:

```java
List<Lamp> findByStatusAndBrightnessGreaterThanOrderByCreatedAtDesc(
    LampStatus status,
    Integer brightness
);
```

What does this method produce? A `SELECT` with a `WHERE status = ? AND brightness > ?` and an `ORDER BY created_at DESC`? Probably. But does it join any related tables? Does it apply the `@Where(clause = "deleted_at IS NULL")` filter from your entity annotation? Does it fetch lazily-loaded associations? The method name tells you _some_ of what happens, but not all of it.

These two represent the endpoints of a spectrum. Here's where everyone falls:

**Implicit** means you write code in the language's idioms and the framework translates it to SQL:

- **Java**: Method names like `findByStatus()` are parsed into SQL at boot time. You're trusting naming conventions.
- **C#**: LINQ expressions (`context.Lamps.Where(l => l.Id == id)`) look like filtering a collection, but get compiled to SQL behind the scenes.
- **TypeScript**: Prisma's `prisma.lamp.findUnique({ where: { id } })` abstracts SQL entirely into a JSON-like API.

**Explicit** means you write SQL structure directly, either as raw strings or as code that mirrors SQL clauses:

- **Go**: You write raw SQL strings. sqlc generates type-safe wrappers around them.
- **Python**: `select(LampModel).where(LampModel.id == id)`. Here `select()` is SELECT and `where()` is WHERE. The code structure mirrors SQL.
- **Kotlin**: `LampsTable.selectAll().where { (LampsTable.id eq id) }`. A type-safe DSL where each method corresponds to a SQL clause.

### What to choose?

The goal of choosing a database library isn't to make simple CRUD operations; in that case using a tool like [Strapi](https://strapi.io/) or [Directus](https://directus.io/) is more appropriate. The real value of these libraries comes from handling complex queries and giving you control over performance.

From the implicit side, JPA looks simple at first but becomes difficult to work with in real-world usage, where complex or custom queries quickly push you beyond what method-name conventions can express. C# and TypeScript handle that complexity more gracefully.

From the explicit side, the question is: what's the added value of a modern language if you're writing raw SQL strings anyway? Go answers that with type safety, but you lose the expressiveness of the language itself. Python and Kotlin give you SQL-shaped code without giving up the language entirely.

## Safety: Three Things That Need to Agree

Writing queries easily matters, but you also need to know: when something goes wrong, how fast do you find out? Between your queries and the actual database, there are three things that need to agree with each other:

```
Queries  ←→  Table / Entity Definition  ←→  Migration Files
```

The question for each pair is: does your toolchain verify that agreement automatically, and when? The first two are essential. The third is a nice-to-have.

### Check 1: Do Queries Match the Table Definition?

Of our 6 contenders, which ones check that the query is valid when writing the code? Only C#, TypeScript and Kotlin check at build or compile time.

| Language       | When checked?   | How?                                                                                                                |
| -------------- | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Go**         | ✅ Build-time   | sqlc checks queries against the schema file at generation time. Wrong column → build fails.                         |
| **Kotlin**     | ✅ Compile-time | Queries reference `LampsTable` properties directly. Non-existent column → compiler error.                           |
| **C#**         | ✅ Compile-time | LINQ references model properties directly (`l.Id`). Wrong property name → compiler error.                           |
| **TypeScript** | ✅ Build-time   | Prisma generates a typed client from the schema. Wrong field name → TypeScript error in your IDE.                   |
| **Java**       | ⚠️ Boot-time    | Spring Data parses method names at startup. A method referencing a non-existent field fails at boot.                |
| **Python**     | ❌ Runtime      | `LampModel.column` looks safe, but a wrong column name only surfaces when the query executes (see pyright or mypy). |

### Check 2: Do Table and Entity Definitions Match Each Other?

Some languages define the table structure and the entity separately, so you need to change it in 2 places when you detect a mistake. Only 2 remain that match all my criteria: TypeScript and Kotlin.

| Language       | Separate Table + Entity? | When checked? | How?                                                                                                    |
| -------------- | ------------------------ | ------------- | ------------------------------------------------------------------------------------------------------- |
| **Go**         | ✅ No (generated)        | N/A           | Both come from the same tool run, no drift between them.                                                |
| **TypeScript** | ✅ No (generated)        | N/A           | Prisma generates the client from the schema. Single source of truth.                                    |
| **Java**       | ⚠️ Yes                   | Boot-time     | The `@Entity` class and the `@Repository` are separate.                                                 |
| **C#**         | ⚠️ Yes                   | Boot-time     | The model class and `DbContext` are separate.                                                           |
| **Kotlin**     | N/A                      | N/A           | Exposed's type-safe DSL has no separate entity class. Query results map directly to plain data classes. |
| **Python**     | ✅ No (merged)           | N/A           | SQLAlchemy merges the table definition and the entity into a single `LampModel` class.                  |

### Check 3 (nice-to-have): Does the Table Definition Match the Migration?

Can we ensure that the real database and the code we write always agree? It's not a strict requirement. You can test your way to confidence. But it's reassuring when the toolchain guarantees it for you.

| Language       | How are they linked?                                                          | Risk of drift                       |
| -------------- | ----------------------------------------------------------------------------- | ----------------------------------- |
| **TypeScript** | ✅ Auto-generated. Prisma generates migrations from the `.prisma` schema.     | None. Same source produces both.    |
| **C#**         | ✅ Auto-generated. EF Core generates migrations from model changes.           | Minimal. One produces the other.    |
| **Python**     | ⚠️ Semi-auto. Alembic can diff models vs DB, but you review and edit.         | Moderate.                           |
| **Java**       | ❌ Manual. Annotations and Flyway migrations are independent.                 | High. Nothing forces them to match. |
| **Go**         | ❌ Manual. Migrations, sqlc schema, and queries are three separate artifacts. | High.                               |
| **Kotlin**     | ❌ Manual. Table DSL and Flyway migrations are independent.                   | High.                               |

### Reading the Full Picture

**TypeScript (Prisma)** is the only stack where all three checks are covered. The `.prisma` file generates both the migration (Check 3 ✅) and the typed client (Check 1 ✅), and there is no separate entity to drift (Check 2 ✅). Single source of truth.

**Go** and **Kotlin** have solid compile-time query safety (Check 1 ✅) but no automatic schema-migration sync (Check 3 ❌). The compile-time guarantees are real but narrower than they appear: they validate against the schema the tool knows about, not necessarily the schema in the database.

**C#** auto-generates migrations (Check 3 ✅) but has a separate entity that requires manual sync (Check 2 ⚠️). **Java** has manual migrations (Check 3 ❌) and the same entity drift risk (Check 2 ⚠️).

**Python** passes none of the checks before runtime.

One final nuance: compile-time safety catches structural errors, not logic errors. Go validates your column names and types at compile time, but it can't catch a missing `WHERE deleted_at IS NULL`. Java catches that logic error automatically through its global soft-delete filter, but you'll never see it in the code. Different tools protect you from different classes of bugs. Your test suite covers the rest.

## Basic Features: Soft Deletes and Timestamps

Soft deletes and timestamps are two features you'll need in any production API. How each stack handles them reinforces the explicit-vs-implicit divide and shows that the implicit approach isn't always less work.

### Soft Delete Filtering

| Language       | Approach  | Mechanism                                                                                     |
| -------------- | --------- | --------------------------------------------------------------------------------------------- |
| **Java**       | Automatic | `@Where(clause = "deleted_at IS NULL")` on the entity. All queries filter implicitly.         |
| **C#**         | Automatic | `HasQueryFilter(e => e.DeletedAt == null)` in DbContext. Opt-out with `IgnoreQueryFilters()`. |
| **Kotlin**     | Manual    | `.where { deletedAt.isNull() }` on each query.                                                |
| **Python**     | Manual    | `.where(LampModel.deleted_at.is_(None))` on each query.                                       |
| **TypeScript** | Manual    | `where: { deletedAt: null }` on each Prisma query.                                            |
| **Go**         | Manual    | `WHERE deleted_at IS NULL` in each SQL query.                                                 |

Java and C# do it once, globally. Everyone else does it per query. The automatic approach prevents omission bugs: you can't forget what the framework remembers. But when you need to _include_ deleted records for things like admin restore or audit logs, you have to actively undo the magic. In Java, that means native SQL. In Go, you just write a different query.

### Timestamp Management

| Language       | created_at                 | updated_at               |
| -------------- | -------------------------- | ------------------------ |
| **Java**       | `@CreationTimestamp` (ORM) | `@UpdateTimestamp` (ORM) |
| **TypeScript** | `@default(now())` (Prisma) | `@updatedAt` (Prisma)    |
| **Kotlin**     | Application code           | Database trigger         |
| **Python**     | Application code           | Database trigger         |
| **Go**         | Application code           | Database trigger         |
| **C#**         | Database default           | Database trigger         |

Java and TypeScript manage timestamps in the application layer, which makes them portable across databases. Kotlin, Python, Go, and C# delegate `updated_at` to a PostgreSQL trigger. That's more reliable since you can't forget it, but less portable and invisible to someone reading only the application code.

The tradeoff isn't about correctness, it's about where the behavior lives and how easy it is to find when something goes wrong.

The full project is available on [GitHub](https://github.com/davideme/lamp-control-api-reference).

## What's Next?

This comparison covers the basics well, but CRUD is the easy part. The real stress test comes when the problem gets harder.

A few questions I want to explore next:

**N+1 queries:** how easy is it to spot and fix them? With implicit ORMs like Hibernate or EF Core, the N+1 problem often hides behind clean-looking code. With Go and sqlc, it's more visible by design, but you're writing the joins yourself.

**Cross-repository transactions:** when complex business logic spans multiple aggregates, who manages the transaction boundary? Frameworks that abstract the session make this harder to control; explicit tools make it more verbose but clearer.

**Request-scoped caching:** avoiding duplicate queries for the same row within a single request is trivial in some stacks and completely manual in others. This is where the implicit vs. explicit divide gets expensive.

**Audit tables:** adding a full audit trail is a common production requirement. How much of that can the ORM handle, and how much falls back to you?

The code is all on [GitHub](https://github.com/davideme/lamp-control-api-reference) if you want to dig into the current implementations while I work on the next iteration.
