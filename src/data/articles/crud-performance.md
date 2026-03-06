---
title: Performance Myths That Keep Shaping Bad Decisions
author: Davide Mendolia
description: Low-level is fast. Interpreted is slow. Async is faster. The database is the bottleneck. These assumptions feel like engineering wisdom. Most of them are wrong, or at least far more complicated than they sound.
publishDate: 2026-02-27
tags:
  - programming-languages
  - backend-development
  - typescript
  - java
  - python
  - golang
  - kotlin
  - csharp
  - performance
  - database
  - developer-productivity
featured: false
draft: true
---

Some assumptions get repeated so often they stop feeling like opinions and start feeling like facts. I wanted to put some to the test regarding Performance(Latency + Throughput).

## 🏎️ Latency

Assumption: "Native code is _faster_ than Interpreted code", But is it faster in any things that matter?
My test case for latency is to benchmark the 6 language you might have read in article about [REST API and in memory implementation](crud-openapi).

| Language                  | Compiled To  | When Compilation Happens | Execution Model   |
| ------------------------- | ------------ | ------------------------ | ----------------- |
| **Javascript/TypeScript** | Bytecode     | At runtime               | Interpreter + JIT |
| **Python**                | Bytecode     | At runtime               | Interpreter       |
| **Java**                  | Bytecode     | Build time               | Interpreter + JIT |
| **C#**                    | Bytecode     | Build time               | Interpreter + JIT |
| **Go**                    | Machine code | Build time               | Direct execution  |
| **Kotlin (JVM)**          | Bytecode     | Build time               | Interpreter + JIT |

I would say the general assumption of the podium would be:

1. Machine code: Go
2. Bytecode at Build time: Java, Kotlin, C#
3. Bytecode at Runtime: Javascript, Python

What about **JIT compilation.** Java, Kotlin, C#, and JavaScript/TypeScript all use just-in-time compilers that compile bytecode to machine code at runtime, will this influence the results?

### Benchmark

Let's benchmark it with following implementations:

| Language   | Framework    |
| ---------- | ------------ |
| TypeScript | Fastify      |
| Python     | FastAPI      |
| Java       | Spring Boot  |
| C#         | ASP.NET Core |
| Go         | Chi          |
| Kotlin     | Ktor         |

So I decide to run a benchmark on a environment that I know well and love. Serverless container in Google Cloud Run. I can deploy docker containers, you pay per request usage, it's scale up and down automatically, it has a CPU boost at startup to avoid cold start.

So a simple load that do a series of CRUD operations in memory, that tell me the baseline how fast is each language?

Runner K6, 50 Request per second, during 300 seconds, on 1 CPU, 512MB of RAM.

![[crud-performance-k6-1.gif]]

For something that simple, It's does not matter everything is able to respond under 10ms 95% of the time. Yes, there are some fluke(probably JIT compiling), in some language that I'm sure we can optimize or get around it. But my general first taught it's no matter if you are using Go or Python, the bottleneck is not in the pure language.

**DEBUNKED** : Well at least so far, no matter if native code or byte code, if using [^1]JIT or [^2]AOT, everything run under 10ms.

### Digging deeper

I decided to graph also the CPU used, and I can see clearly 3 groups.

![[crud-performance-k6-2.gif]]
Note: the down curve is when the benchmark stop 4:29PM.

A) Go and Typescript: < 9% of CPU usage and steady.
B) Java, Kotlin and C#: They start 20% or even 40% but quickly stabilize to < 14%
C) Python: Steady at 21%.

Is this any indicator where the bottleneck will be? Maybe yes, maybe it's just how the different implementation of the in memory storage each language. Let's continue our investigation, this alone it's not enough.

## 🚚 Throughput

Another assumption is "real applications spend most of their time doing I/O": handling requests, reading from databases, making network requests, so does the speed even matter? For those workloads, which one is able to handle a lot of request in parallel?

The practical picture for the languages I've been comparing([more details](crud-postgres)):

| Language       | Framework    | Async Paradigm                    | DB Async                            |
| -------------- | ------------ | --------------------------------- | ----------------------------------- |
| **TypeScript** | Fastify      | Event loop + `async/await`        | Prisma (native async)               |
| **Python**     | FastAPI      | AsyncIO + `async def`             | SQLAlchemy 2.0 async                |
| **Go**         | Chi          | Goroutines + `context.Context`    | pgx (async driver)                  |
| **Java**       | Spring Boot  | Thread pool + `CompletableFuture` | JPA (blocking, sync)                |
| **Kotlin**     | Ktor         | Coroutines + `suspend fun`        | Exposed (`newSuspendedTransaction`) |
| **C#**         | ASP.NET Core | TAP + `async Task<T>`             | EF Core async LINQ                  |
My general assumption is that this should be roughly the podium: 
1. True Parallelism + Non-blocking I/O: Go and C#
2. True Parallelism + Blocking I/O: Java and Kotlin
3. Single execution context + Non-blocking I/O: TypeScript and Python

### Benchmark

Same machine in Cloud Run for this run, with a Postgres Cloud SQL instance(2 CPU, 8 GB Ram), that should plenty to not be the bottleneck.
How many request of CRUD operations the API can handle keeping response time under 300ms.

[Insert here graph]

Results:

1. Go handle 500 Request per second
2. TypeScript and Kotlin handle 400 Request per second
3. Java handle 300 Request per second

I could not get relevant results for Python and C#. Using Python 3.12 and .NET 8.0, is it an issue with the runtime, an issue with how each language as SQL Queries, are they not meant to run on small container, or it's really a problem of the language? We need to dig deeper in the future.

Dive into the podium results.
1) Go is first without a sweat as expected fast and good at parallelism.
2) Kotlin and Javascript/Typescript are a bit the surprise here:
	- Kotlin is using JDBC for database connection meaning blocking the thread that the coroutine is running. 
	- Typescript/Node.js is using a single threaded event loop, but the I/O operation is giving back time to the scheduler.
3) Java as third place, is expected between JDBC blocking the thread-pool and being and ORM, meaning it require read before write, so need more queries to do the same operations.

**DEBUNKED**: At least for non-go results. Single Threaded it's has fast and multi threaded, at least on containers with 1 CPU. And blocking I/O can be as fast as blocking I/O. 🤯

## Conclusion

Even if it's possible now with Claude Code or Codex to rewrite your codebase from one language to the other, is it worth it, maybe just optimising your current stack is enough.

And which one to choose, if starting from a blank slate, think more about what is your use case, than, thinking everything is universally good.

## What's next ?
Why is C# slow? Maybe because of the ORM natures they are doing more queries(read before writes)
Why is Python slow? Maybe the [^3]GIL, maybe not JIT ? These are coming to Python 3.14 but not enabled by default.

Next steps would be invest in proper OpenTelemetry and figure out where the time is spent.
But even there, is worth, all the advantages that bring some language are they worth the money spent in CPU and containers, I'll be digging further in these advance usage case of SQL Lib in the future, and see if I can make a more educated choice.

[^1]: Just In Time

[^2]: Ahead Of Time

[^3]: Global Interpreter Lock
