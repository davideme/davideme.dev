---
title: "Why PHP and Java are going to disappear?"
author: "David Mendolia"
description: ""
publishDate: 2025-09-07
tags: []
featured: true
draft: false
---

# Why PHP and Java are going to disappear?

While it's easy to prefer one language over another and argue about how easy it is to rewrite somethingthis in another language or in another framework, but it’s harder to provideconcrete evidences. I have been there, and said stuff like ·Iif we rewrite this in [insert here your preferred language], it will be easier/faster/more productive".

I've always wanted to be able to compare real implementations, not just "hello world" examples, so I chose to compare 7 languages 🤯: TypeScript, Python, C#, Java, PHP, Go and Kotlin.

But how to compare them ?

My idea was to create a simple CRUD on OpenAPI and see how to implement it using each language.

For each one, I selected whichever framework supported REST/JSON implementation, and from all the available I chose the most popular one. I’m sure there is some lib/framework out there that is more optimized than the one I picked, but I wanted the most broadly adopted framework to understand the current tech panorama.

I started in April, so the stack might be a bit outdated ⏳.

| Language   | Version | Runtime    | Framework    |
| ---------- | ------- | ---------- | ------------ |
| TypeScript | 5.8     | Node 22    | Fastify      |
| Python     | 3.12    |            | FastAPI      |
| C#         | 12      | .NET 8     | ASP.NET Core |
| Java       | 21      | Temurin 21 | Spring Boot  |
| PHP        | 8.3     |            | Slim         |
| Go         | 1.24    |            | Chi          |
| Kotlin     | 2.1     | Temurin 21 | Ktor         |

I started by writing the OpenAPI definition (API-First Approach) and then searched for what's the most idiomatic way to generate and implement it in each language. I chose to implement the backend in memory without a database. While it does not leverage SQL functionality, I wanted a simple example, that had a minimum of abstraction in the codebase between the “controller” and the “storage”.

My first goal was to understand which language needed less code to do that. The larger the codebase the harder it is to maintain it. The language that needs more code to get to the same output will require bigger PRs, more code to read, more code to refactor, more code to scan for vulnerability. And now, in a world where every IDE has AI agents integrated, the fewer tokens to send to the LLM, the better.

We all know that some languages perform better in certain situations, but all of them are used to write Rest/JSON APIs. I used an example object "Lamp", with status that can be ON or OFF, and I limited scope to 5 endpoints: Create, Update, Delete, Get and List.

![Screenshot 2025-08-23 at 11.31.17.png](openapi-lamps.png)

Let’s guesstimate and say it will take any of these languages around 200 lines of code to implement this. I’m sure I’m underestimating this by a 2x factor (so 400) and thinking mostly of the happy path. I don’t want to compare the developer experience, build time, CI time or execution time just yet, I could go more in detail about that in future blog post.

After setting up the project for each language and generating server code based on the same OpenAPI definition, I wanted to ensure they implemented the same thing. I added unit tests and E2E tests. I wanted to be sure that all implementations complied with the specs, so I added Schemathesis testing.

Before even looking at the results, we need to acknowledge that there are some languages are more expressive than others, let’s have a quick look at Typescript and Java:

Typescript

```tsx
export interface Lamp {
  id: string;
  status: boolean;
}

export type LampCreate = Omit<Lamp, "id">;

export type LampUpdate = Partial<Lamp>;
```

Java

```java
public class Lamp {

  private UUID id;

  private Boolean status;

  public Lamp() {
    super();
  }
// Followed by 67 more lines to just define Lamp
// Plus 71 lines for LampCreate and 71 for LampUpdate
```

Obviously the example is extreme, and I’m sure we could use Java record, but the OpenAPI generator is not there yet.

Now let's look at the numbers:

![Lines of codes.mov](Lines%20of%20codes.gif)

**S Tier** - (400ish lines for the App and 400ish lines for tests):

- **TypeScript** and **Python**: popular and concise.
- **C#**: the champion of the .NET world, especially in enterprise.

**A Tier**

- **Kotlin** (600 lines): Kotlin is the winner of JVM, offering the same functionality for almost half of the code.

**B Tier**

- **Go** (800 lines): uses a lot of generated code with mocks and input validation. If it was only based on the amount of code to implement it by hand, it would be on **S Tier** like Typescript. It really depends on your taste on what you consider code to maintain.

**C Tier**

- **Java** (1000 lines): could be optimized with Record pattern or Lombok, but it’s not the experience out of the box.
- **PHP** (1000 lines): similar to Java, the Constructor Property Promotion might reduce the boiler plate, but not yet in the flow of generator.

While I don’t think PHP is going to be replaced tomorrow, for sure it won't be picked up for new projects and we are already seeing trends of big projects and companies using TS/JS or Go for new backends.

For Kotlin, while it’s showing a slower adoption than I thought it would have when I discovered it 10 years ago, it’s still a winner on the JVM, it forced Java's hand by actively reducing boilerplate in recent versions. F future backends would leave Java or the JVM entirely? Only enterprise adoption will tell.

If you want to dig deeper on each implementation go and look at the repository:

[https://github.com/davideme/lamp-control-api-reference](https://github.com/davideme/lamp-control-api-reference)

In the future I will explore other aspects like going beyond the MVP or the readiness to put it in production. Would this conclusion still hold true when :

- Integrating a database?
- Adding observability?
- Implementing more complex systems (Pub/Sub, Webhooks, ...)?

And also we could explore other aspects like:

- Language expressiveness and safety (error management or null handling)
- Performance
- Ecosystem maturity and library availability
- Developer experience, team expertise and hiring pool
- Long-term maintenance costs
- Enterprise requirements and existing codebases
- Deployment complexity

Additional Considerations:

**Why Typescript and not Javascript?** For backend purposes, since July 2025 they are mostly equivalent for what we evaluated, only a small subset of features still require transformation (like enum or parameter properties), but in terms of the amount of code produced, they are similar, so either of them would have produced the same result.

For **PHP** I initially tried with Laravel, but the initial codebase to initialize the project is even bigger than Slim.
