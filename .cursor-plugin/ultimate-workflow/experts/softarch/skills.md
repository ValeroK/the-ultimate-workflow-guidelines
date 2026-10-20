# Skills: softarch

Read by `experts.js` only; no model reads this file. One section per stage. The order is the priority when the cap is reached. A line is `- <skill> (<selector>)`; at plan a line has no selector, because a model chooses by each skill's `description`.

## plan

- protobuf-compat
- schema-evolution
- module-boundaries

## review

- protobuf-compat (files: *.proto, buf.yaml, buf.gen.yaml, buf.lock)
- schema-evolution (files: openapi.yaml, openapi.yml, openapi.json, swagger.yaml, swagger.yml, swagger.json, asyncapi.yaml, asyncapi.yml, *.graphql, *.graphqls, *.gql, *.schema.json; added: \bopenapi: ["']?3|"openapi": "3|\btype Query \{|\btype Mutation \{|\bextend type \w+ \{|"\$schema": "https?://json-schema\.org)
- module-boundaries (files: .dependency-cruiser.js, .dependency-cruiser.cjs, .dependency-cruiser.json, .importlinter, module-info.java, project.json, nx.json, tsconfig.json, tsconfig.*.json, pnpm-workspace.yaml, go.work; added: /internal/|"exports":|depConstraints|onlyDependOnLibsWithTags|notDependOnLibsWithTags|\[tool\.importlinter|\[importlinter|ArchRule|@ArchTest|FreezingArchRule|requires transitive)
