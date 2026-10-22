# Skills: softarch

Read by `experts.js` only; no model reads this file. One section per stage. The order is the priority when the cap is reached. A line is `- <skill> (<selector>)`; at plan a line has no selector, because a model chooses by each skill's `description`.

## plan

- protobuf-compat
- schema-evolution
- event-schema-evolution
- module-boundaries

## review

- protobuf-compat (files: *.proto, buf.yaml, buf.gen.yaml, buf.lock)
- schema-evolution (files: openapi.yaml, openapi.yml, openapi.json, swagger.yaml, swagger.yml, swagger.json, *.graphql, *.graphqls, *.gql, *.schema.json; added: \bopenapi: ["']?3|"openapi": "3|\btype Query \{|\btype Mutation \{|\bextend type \w+ \{|"\$schema": "https?://json-schema\.org)
- event-schema-evolution (files: *.avsc, *.avdl, asyncapi.yaml, asyncapi.yml, asyncapi.json; added: compatibilityLevel|"compatibility":\s*"(BACKWARD|FORWARD|FULL|NONE)|BACKWARD_TRANSITIVE|FORWARD_TRANSITIVE|FULL_TRANSITIVE|AWS::Glue::Schema|aws_glue_schema|"type":\s*"record"|specversion|dataschema)
- module-boundaries (files: .dependency-cruiser.js, .dependency-cruiser.cjs, .dependency-cruiser.json, .importlinter, module-info.java, project.json, nx.json, tsconfig.json, tsconfig.*.json, pnpm-workspace.yaml, go.work; added: /internal/|"exports":|depConstraints|onlyDependOnLibsWithTags|notDependOnLibsWithTags|\[tool\.importlinter|\[importlinter|ArchRule|@ArchTest|FreezingArchRule|requires transitive|go:linkname|checklinkname|noEmitOnError|unmatched_ignore_imports_alerting|include_external_packages|freeze\.refreeze|allowStoreCreation|"severity":\s*"(warn|info)"|severity: '(warn|info)')
